"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { awardPoints, awardPointsOnce, spendPoints, POINT_ACTIONS, POINTS_BY_ACTION } from "@/lib/points"
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar"
import { sendAppointmentConfirmation } from "@/lib/appointment-emails"

interface HealthProfileData {
  // 1. Datos básicos
  age: number
  gender: string
  consultation_reason: string | null
  occupation: string | null
  // 2. Antecedentes médicos
  diseases: string | null
  medications: string | null
  supplements: string | null
  surgeries: string | null
  allergies: string | null
  intolerances: string | null
  family_history: string | null
  // 3. Evaluación antropométrica
  weight: number
  height: number
  waist_circumference: number | null
  body_fat_percent: number | null
  // 5. Estilo de vida
  exercise_type: string | null
  exercise_frequency: string | null
  sleep_hours: number | null
  stress_level: number | null
  work_type: string | null
  // 6. Evaluación funcional
  energy_level: number | null
  digestion: string | null
  mood: string | null
  concentration: string | null
  // Legacy / adicional
  objectives: string | null
  activity_level: string | null
  current_exercise_routine: string | null
  previous_injuries: string | null
  dietary_restrictions: string | null
  additional_notes: string | null
}

interface CreateAppointmentData {
  coachId: string
  appointmentDate: string
  appointmentTime: string
  durationMinutes?: number
  consultation_reason: string
  notes: string | null
  consultation_snapshot?: Record<string, unknown> | null
}

// Helpers para campos @db.Time y @db.Date (Prisma los representa como Date)
function parseTime(time: string): Date {
  // time puede ser "HH:MM" o "HH:MM:SS"
  const parts = time.split(":")
  const h = Number(parts[0] ?? 0)
  const m = Number(parts[1] ?? 0)
  const s = Number(parts[2] ?? 0)
  return new Date(Date.UTC(1970, 0, 1, h, m, s))
}

function formatTime(d: Date): string {
  const h = String(d.getUTCHours()).padStart(2, "0")
  const m = String(d.getUTCMinutes()).padStart(2, "0")
  const s = String(d.getUTCSeconds()).padStart(2, "0")
  return `${h}:${m}:${s}`
}

function parseDate(date: string): Date {
  // date en formato "YYYY-MM-DD"
  return new Date(`${date}T00:00:00.000Z`)
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function createAppointment(data: CreateAppointmentData) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { error: "No autorizado" }
    }

    // Verificar que la suscripción no esté pausada
    const userStatus = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionStatus: true },
    })

    if (userStatus?.subscriptionStatus === "paused") {
      return { error: "Tu suscripción está pausada. Reactívala para agendar citas con coaches." }
    }

    // Verificar que el usuario tenga perfil de salud completo
    const hasProfile = await hasHealthProfile()
    if (!hasProfile) {
      return { error: "COMPLETE_PROFILE" }
    }

    // Verificar que el coach existe y está activo (usuario con role='coach')
    const coach = await prisma.user.findFirst({
      where: {
        id: data.coachId,
        role: "coach",
        isCoachActive: true,
      },
      select: { id: true },
    })

    if (!coach) {
      return { error: "Coach no encontrado o no disponible" }
    }

    // El enlace de videollamada es obligatorio: el coach debe tener su Google
    // Calendar conectado para que podamos generarlo automáticamente al agendar.
    const calendarToken = await prisma.coachCalendarToken.findUnique({
      where: { coachId_provider: { coachId: data.coachId, provider: "google" } },
      select: { id: true },
    })
    if (!calendarToken) {
      return {
        error:
          "Este coach aún no tiene configurada la videollamada. Por favor intenta con otro coach o pídele que conecte su calendario.",
      }
    }

    // Verificar que la fecha no sea en el pasado
    const appointmentDateTime = new Date(`${data.appointmentDate}T${data.appointmentTime}`)
    if (appointmentDateTime < new Date()) {
      return { error: "No puedes agendar citas en el pasado" }
    }

    const apptDate = parseDate(data.appointmentDate)
    const apptTime = parseTime(data.appointmentTime)

    // Verificar que no haya una cita duplicada
    const existing = await prisma.appointment.findFirst({
      where: {
        coachId: data.coachId,
        appointmentDate: apptDate,
        appointmentTime: apptTime,
        status: "scheduled",
      },
      select: { id: true },
    })

    if (existing) {
      return { error: "Este horario ya está ocupado" }
    }

    // Verificar disponibilidad del coach
    const appointmentDay = appointmentDateTime.getDay()
    const availability = await prisma.coachAvailability.findMany({
      where: {
        coachId: data.coachId,
        dayOfWeek: appointmentDay,
        isAvailable: true,
      },
    })

    if (!availability || availability.length === 0) {
      return { error: "El coach no está disponible en este día" }
    }

    // Verificar que el horario esté dentro del rango de disponibilidad
    const [hour, minute] = data.appointmentTime.split(":").map(Number)
    const appointmentMinutes = hour * 60 + minute
    const duration = data.durationMinutes ?? 60
    const isAvailable = availability.some((av) => {
      const startMinutes = av.startTime.getUTCHours() * 60 + av.startTime.getUTCMinutes()
      const endMinutes = av.endTime.getUTCHours() * 60 + av.endTime.getUTCMinutes()
      return appointmentMinutes >= startMinutes && appointmentMinutes + duration <= endMinutes
    })

    if (!isAvailable) {
      return { error: "El horario seleccionado no está disponible" }
    }

    // Crear la cita (consultation_reason obligatorio en cada agendamiento)
    let newAppt: { id: string } | null = null
    try {
      newAppt = await prisma.appointment.create({
        data: {
          userId: session.user.id,
          coachId: data.coachId,
          appointmentDate: apptDate,
          appointmentTime: apptTime,
          durationMinutes: data.durationMinutes ?? 60,
          status: "scheduled",
          consultationReason: data.consultation_reason,
          notes: data.notes,
          consultationSnapshot: (data.consultation_snapshot ?? {}) as object,
        },
        select: { id: true },
      })
    } catch (err) {
      console.error("Error creating appointment:", err)
      return { error: "Error al crear la cita. Por favor intenta de nuevo." }
    }

    revalidatePath("/dashboard/coaches")
    revalidatePath("/dashboard/coaches/appointments")

    // Crear evento en Google Calendar del coach (silencioso si no tiene conectado)
    let meetLink: string | undefined

    if (newAppt) {
      const coachUser = await prisma.user.findUnique({
        where: { id: data.coachId },
        select: { name: true },
      })

      const clientUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true },
      })

      void coachUser

      const { eventId: googleEventId, meetLink: createdMeetLink } = await createCalendarEvent({
        coachId: data.coachId,
        appointmentId: newAppt.id,
        title: `Cita con ${clientUser?.name ?? "cliente"}`,
        date: data.appointmentDate,
        startTime: data.appointmentTime.slice(0, 5),
        durationMinutes: data.durationMinutes ?? 60,
        description: [
          `Cliente: ${clientUser?.name ?? ""} (${clientUser?.email ?? ""})`,
          `Motivo: ${data.consultation_reason}`,
        ].filter(Boolean).join("\n"),
      })

      meetLink = createdMeetLink ?? undefined

      if (!createdMeetLink) {
        // Rollback: la cita no puede existir sin enlace de videollamada.
        // Intentamos limpiar también el evento de Google si se creó sin Meet
        // (caso raro pero posible si el calendario rechaza el conferenceData).
        await prisma.appointment.delete({ where: { id: newAppt.id } }).catch((err) => {
          console.error("Error rolling back appointment without meet link:", err)
        })
        if (googleEventId) {
          await deleteCalendarEvent(data.coachId, googleEventId).catch(() => {})
        }
        revalidatePath("/dashboard/coaches")
        revalidatePath("/dashboard/coaches/appointments")
        return {
          error:
            "No pudimos generar el enlace de videollamada para esta cita. Intenta de nuevo en unos minutos o contacta al coach.",
        }
      }

      await prisma.appointment.update({
        where: { id: newAppt.id },
        data: {
          ...(googleEventId ? { googleEventId } : {}),
          meetingLink: createdMeetLink,
        },
      })

      // Notificación por email a usuario y coach.
      // Esperamos a que termine para garantizar que ambos correos se despachen
      // antes de que la Server Action retorne (si no, el runtime puede cortar
      // los fetch a Zeptomail y solo se envía uno). sendAppointmentConfirmation
      // ya traga sus propios errores, así que no rompe el booking.
      await sendAppointmentConfirmation(newAppt.id)
    }

    // Puntos por reservar cita (cada vez)
    let pointsEarned: number | undefined
    const pts = await awardPoints({
      userId: session.user.id,
      actionType: POINT_ACTIONS.BOOK_APPOINTMENT,
      description: "Cita reservada con coach",
    })
    if (pts.success) {
      pointsEarned = POINTS_BY_ACTION[POINT_ACTIONS.BOOK_APPOINTMENT]
    }

    return { success: true, pointsEarned, meetLink }
  } catch (error) {
    console.error("Error in createAppointment:", error)
    return { error: "Error interno del servidor" }
  }
}

export async function cancelAppointment(appointmentId: string) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { error: "No autorizado" }
    }

    // Verificar que la cita pertenece al usuario
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, userId: session.user.id },
      select: {
        id: true,
        status: true,
        appointmentDate: true,
        appointmentTime: true,
      },
    })

    if (!appointment) {
      return { error: "Cita no encontrada" }
    }

    if (appointment.status !== "scheduled") {
      return { error: "Solo puedes cancelar citas programadas" }
    }

    const dateStr = formatDate(appointment.appointmentDate)
    const timeStr = formatTime(appointment.appointmentTime)
    const appointmentDateTime = new Date(`${dateStr}T${timeStr}`)
    const hoursUntilAppointment = (appointmentDateTime.getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursUntilAppointment < 24) {
      return { error: "Las citas solo pueden cancelarse con al menos 24 horas de anticipación" }
    }

    // Cancelar la cita
    const apptFull = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { googleEventId: true, coachId: true },
    })

    try {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: "cancelled" },
      })
    } catch (err) {
      console.error("Error cancelling appointment:", err)
      return { error: "Error al cancelar la cita. Por favor intenta de nuevo." }
    }

    // Eliminar evento de Google Calendar del coach (silencioso)
    if (apptFull?.googleEventId && apptFull.coachId) {
      await deleteCalendarEvent(apptFull.coachId, apptFull.googleEventId).catch(() => {})
    }

    revalidatePath("/dashboard/coaches")
    revalidatePath("/dashboard/coaches/appointments")

    // Descuento de puntos por cancelar (silencioso si no tiene saldo suficiente)
    let pointsLost: number | undefined
    const cancelPenalty = Math.abs(POINTS_BY_ACTION[POINT_ACTIONS.CANCEL_APPOINTMENT])
    if (cancelPenalty > 0) {
      const spent = await spendPoints({
        userId: session.user.id,
        amount: cancelPenalty,
        actionType: POINT_ACTIONS.CANCEL_APPOINTMENT,
        description: "Penalización por cancelar cita",
        referenceType: "appointment",
        referenceId: appointmentId,
      }).catch(() => ({ success: false }))
      if (spent.success) pointsLost = cancelPenalty
    }

    return { success: true, pointsLost }
  } catch (error) {
    console.error("Error in cancelAppointment:", error)
    return { error: "Error interno del servidor" }
  }
}

export async function hasHealthProfile(): Promise<boolean> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return false
    }

    const data = await prisma.userHealthProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, weight: true, height: true, age: true, gender: true },
    })

    if (!data) {
      return false
    }

    // Perfil completo = datos estables (motivo de consulta se pide en cada agendamiento)
    return !!(data.weight && data.height && data.age && data.gender)
  } catch (error) {
    console.error("Error checking health profile:", error)
    return false
  }
}

export async function getHealthProfile() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { error: "No autorizado", profile: null }
    }

    const row = await prisma.userHealthProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!row) {
      return { profile: null }
    }

    const profile = {
      id: row.id,
      user_id: row.userId,
      weight: row.weight ? Number(row.weight) : null,
      height: row.height ? Number(row.height) : null,
      age: row.age,
      gender: row.gender,
      diseases: row.diseases,
      medications: row.medications,
      allergies: row.allergies,
      objectives: row.objectives,
      activity_level: row.activityLevel,
      current_exercise_routine: row.currentExerciseRoutine,
      previous_injuries: row.previousInjuries,
      dietary_restrictions: row.dietaryRestrictions,
      additional_notes: row.additionalNotes,
      consultation_reason: row.consultationReason,
      occupation: row.occupation,
      supplements: row.supplements,
      surgeries: row.surgeries,
      intolerances: row.intolerances,
      family_history: row.familyHistory,
      waist_circumference: row.waistCircumference ? Number(row.waistCircumference) : null,
      body_fat_percent: row.bodyFatPercent ? Number(row.bodyFatPercent) : null,
      exercise_type: row.exerciseType,
      exercise_frequency: row.exerciseFrequency,
      sleep_hours: row.sleepHours ? Number(row.sleepHours) : null,
      stress_level: row.stressLevel,
      work_type: row.workType,
      energy_level: row.energyLevel,
      digestion: row.digestion,
      mood: row.mood,
      concentration: row.concentration,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    }

    return { profile }
  } catch (error) {
    console.error("Error in getHealthProfile:", error)
    return { error: "Error interno del servidor", profile: null }
  }
}

export async function saveHealthProfile(data: HealthProfileData) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { error: "No autorizado" }
    }

    // Validar campos requeridos (datos estables del perfil)
    if (!data.weight || !data.height || !data.age || !data.gender) {
      return { error: "Por favor completa todos los campos requeridos" }
    }

    // Insertar o actualizar el perfil de salud
    try {
      await prisma.userHealthProfile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          age: data.age,
          gender: data.gender,
          consultationReason: data.consultation_reason,
          occupation: data.occupation,
          diseases: data.diseases,
          medications: data.medications,
          supplements: data.supplements,
          surgeries: data.surgeries,
          allergies: data.allergies,
          intolerances: data.intolerances,
          familyHistory: data.family_history,
          weight: data.weight,
          height: data.height,
          waistCircumference: data.waist_circumference,
          bodyFatPercent: data.body_fat_percent,
          exerciseType: data.exercise_type,
          exerciseFrequency: data.exercise_frequency,
          sleepHours: data.sleep_hours,
          stressLevel: data.stress_level,
          workType: data.work_type,
          energyLevel: data.energy_level,
          digestion: data.digestion,
          mood: data.mood,
          concentration: data.concentration,
          objectives: data.objectives,
          activityLevel: data.activity_level,
          currentExerciseRoutine: data.current_exercise_routine,
          previousInjuries: data.previous_injuries,
          dietaryRestrictions: data.dietary_restrictions,
          additionalNotes: data.additional_notes,
        },
        update: {
          age: data.age,
          gender: data.gender,
          consultationReason: data.consultation_reason,
          occupation: data.occupation,
          diseases: data.diseases,
          medications: data.medications,
          supplements: data.supplements,
          surgeries: data.surgeries,
          allergies: data.allergies,
          intolerances: data.intolerances,
          familyHistory: data.family_history,
          weight: data.weight,
          height: data.height,
          waistCircumference: data.waist_circumference,
          bodyFatPercent: data.body_fat_percent,
          exerciseType: data.exercise_type,
          exerciseFrequency: data.exercise_frequency,
          sleepHours: data.sleep_hours,
          stressLevel: data.stress_level,
          workType: data.work_type,
          energyLevel: data.energy_level,
          digestion: data.digestion,
          mood: data.mood,
          concentration: data.concentration,
          objectives: data.objectives,
          activityLevel: data.activity_level,
          currentExerciseRoutine: data.current_exercise_routine,
          previousInjuries: data.previous_injuries,
          dietaryRestrictions: data.dietary_restrictions,
          additionalNotes: data.additional_notes,
        },
      })
    } catch (err) {
      console.error("Error saving health profile:", err)
      return { error: "Error al guardar el perfil de salud. Por favor intenta de nuevo." }
    }

    revalidatePath("/dashboard/profile")
    revalidatePath("/dashboard/coaches")

    // Puntos por completar perfil de salud (solo la primera vez)
    let pointsEarned: number | undefined
    const pts = await awardPointsOnce({
      userId: session.user.id,
      actionType: POINT_ACTIONS.COMPLETE_HEALTH_PROFILE,
      description: "Perfil de salud completado",
    })
    if (pts.success && !pts.alreadyEarned) {
      pointsEarned = POINTS_BY_ACTION[POINT_ACTIONS.COMPLETE_HEALTH_PROFILE]
    }

    return { success: true, pointsEarned }
  } catch (error) {
    console.error("Error in saveHealthProfile:", error)
    return { error: "Error interno del servidor" }
  }
}
