"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { updateCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar"

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

async function getCoachSession() {
  const session = await auth()
  if (!session?.user?.id) return null
  if (session.user.role !== "coach") return null
  return session
}

function formatTime(d: Date): string {
  const h = String(d.getUTCHours()).padStart(2, "0")
  const m = String(d.getUTCMinutes()).padStart(2, "0")
  const s = String(d.getUTCSeconds()).padStart(2, "0")
  return `${h}:${m}:${s}`
}

function parseTime(time: string): Date {
  const parts = time.split(":")
  const h = Number(parts[0] ?? 0)
  const m = Number(parts[1] ?? 0)
  const s = Number(parts[2] ?? 0)
  return new Date(Date.UTC(1970, 0, 1, h, m, s))
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

// Tipos internos que reflejan lo que devuelve Prisma en estas queries
type AppointmentWithUser = {
  id: string
  userId: string
  coachId: string
  appointmentDate: Date
  appointmentTime: Date
  durationMinutes: number | null
  status: string | null
  notes: string | null
  googleEventId: string | null
  meetingLink: string | null
  consultationReason: string | null
  consultationSnapshot: unknown
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  } | null
}

function mapAppointmentWithUser(a: AppointmentWithUser) {
  return {
    id: a.id,
    user_id: a.userId,
    coach_id: a.coachId,
    appointment_date: formatDate(a.appointmentDate),
    appointment_time: formatTime(a.appointmentTime),
    duration_minutes: a.durationMinutes ?? 60,
    status: a.status ?? "scheduled",
    notes: a.notes,
    google_event_id: a.googleEventId,
    meeting_link: a.meetingLink,
    consultation_reason: a.consultationReason ?? "",
    consultation_snapshot: (a.consultationSnapshot ?? null) as Record<string, unknown> | null,
    created_at: a.createdAt.toISOString(),
    updated_at: a.updatedAt.toISOString(),
    user: a.user
      ? {
          id: a.user.id,
          name: a.user.name ?? undefined,
          email: a.user.email ?? undefined,
          image: a.user.image ?? undefined,
        }
      : null,
  }
}

// ──────────────────────────────────────────
// Citas
// ──────────────────────────────────────────

export async function getCoachAppointments(status?: string) {
  const session = await getCoachSession()
  if (!session) return { error: "No autorizado", appointments: [] }

  try {
    const data = await prisma.appointment.findMany({
      where: {
        coachId: session.user.id,
        ...(status && status !== "all" ? { status } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "desc" }],
    })

    return { appointments: data.map(mapAppointmentWithUser) }
  } catch (err) {
    console.error("Error fetching coach appointments:", err)
    return { error: "Error al obtener citas", appointments: [] }
  }
}

export async function getAppointmentById(id: string) {
  const session = await getCoachSession()
  if (!session) return { error: "No autorizado", appointment: null }

  const data = await prisma.appointment.findFirst({
    where: { id, coachId: session.user.id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  })

  if (!data) return { error: "Cita no encontrada", appointment: null }

  return { appointment: mapAppointmentWithUser(data) }
}

export async function updateAppointment({
  id,
  status,
  notes,
  meetingLink,
}: {
  id: string
  status?: string
  notes?: string
  meetingLink?: string
}) {
  const session = await getCoachSession()
  if (!session) return { error: "No autorizado" }

  // Verificar que la cita pertenece al coach
  const existing = await prisma.appointment.findFirst({
    where: { id, coachId: session.user.id },
    select: { id: true, status: true, googleEventId: true },
  })

  if (!existing) return { error: "Cita no encontrada" }

  const updates: { status?: string; notes?: string; meetingLink?: string } = {}
  if (status !== undefined) {
    const allowed = ["completed", "no_show", "cancelled"]
    if (!allowed.includes(status)) return { error: "Estado inválido" }
    updates.status = status
  }
  if (notes !== undefined) updates.notes = notes
  if (meetingLink !== undefined) updates.meetingLink = meetingLink

  try {
    await prisma.appointment.update({
      where: { id },
      data: updates,
    })
  } catch (err) {
    console.error("Error updating appointment:", err)
    return { error: "Error al actualizar la cita" }
  }

  revalidatePath("/coach/appointments")
  revalidatePath(`/coach/appointments/${id}`)

  // Sincronizar con Google Calendar (silencioso)
  if (existing.googleEventId) {
    if (status === "cancelled" || status === "no_show") {
      await deleteCalendarEvent(session.user.id, existing.googleEventId).catch(() => {})
    } else if (status === "completed") {
      await updateCalendarEvent(session.user.id, existing.googleEventId, {
        summary: "[Completada] " + (notes ? notes.slice(0, 60) : "Cita completada"),
      }).catch(() => {})
    }
  }

  return { success: true }
}

// ──────────────────────────────────────────
// Disponibilidad
// ──────────────────────────────────────────

export interface TimeBlock {
  start_time: string   // "HH:MM"
  end_time: string     // "HH:MM"
  slot_duration: number // minutos: 30, 45, 60, 90, 120
}

export interface AvailabilitySlot {
  day_of_week: number // 0=Dom, 1=Lun … 6=Sáb
  is_available: boolean
  blocks: TimeBlock[]
}

export async function getCoachAvailability() {
  const session = await getCoachSession()
  if (!session) return { error: "No autorizado", availability: [] }

  try {
    const rows = await prisma.coachAvailability.findMany({
      where: { coachId: session.user.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    })

    const availability = rows.map((r) => ({
      id: r.id,
      coach_id: r.coachId,
      day_of_week: r.dayOfWeek,
      start_time: formatTime(r.startTime),
      end_time: formatTime(r.endTime),
      is_available: r.isAvailable,
      slot_duration: r.slotDuration,
      created_at: r.createdAt.toISOString(),
    }))

    return { availability }
  } catch (err) {
    console.error("Error fetching availability:", err)
    return { error: "Error al obtener disponibilidad", availability: [] }
  }
}

export async function saveCoachAvailability(slots: AvailabilitySlot[]) {
  const session = await getCoachSession()
  if (!session) return { error: "No autorizado" }

  // Validar bloques
  for (const slot of slots) {
    if (!slot.is_available) continue
    if (slot.blocks.length === 0) {
      return { error: "Cada día activo debe tener al menos un bloque horario" }
    }
    for (const block of slot.blocks) {
      const [sh, sm] = block.start_time.split(":").map(Number)
      const [eh, em] = block.end_time.split(":").map(Number)
      if (sh * 60 + sm >= eh * 60 + em) {
        return { error: "La hora de inicio debe ser anterior a la hora de fin en todos los bloques" }
      }
    }
    // Verificar solapamientos entre bloques del mismo día
    const sorted = [...slot.blocks].sort((a, b) => a.start_time.localeCompare(b.start_time))
    for (let i = 1; i < sorted.length; i++) {
      const [prevEh, prevEm] = sorted[i - 1].end_time.split(":").map(Number)
      const [curSh, curSm] = sorted[i].start_time.split(":").map(Number)
      if (prevEh * 60 + prevEm > curSh * 60 + curSm) {
        return { error: "Los bloques horarios del mismo día no pueden solaparse" }
      }
    }
  }

  // Eliminar y reinsertar
  try {
    await prisma.coachAvailability.deleteMany({
      where: { coachId: session.user.id },
    })
  } catch (err) {
    console.error("Error deleting availability:", err)
    return { error: "Error al guardar disponibilidad" }
  }

  const rows = slots
    .filter((s) => s.is_available)
    .flatMap((s) =>
      s.blocks.map((b) => ({
        coachId: session.user.id,
        dayOfWeek: s.day_of_week,
        startTime: parseTime(b.start_time),
        endTime: parseTime(b.end_time),
        slotDuration: b.slot_duration ?? 60,
        isAvailable: true,
      }))
    )

  if (rows.length > 0) {
    try {
      await prisma.coachAvailability.createMany({ data: rows })
    } catch (err) {
      console.error("Error inserting availability:", err)
      return { error: "Error al guardar disponibilidad" }
    }
  }

  revalidatePath("/coach/availability")
  return { success: true }
}

// ──────────────────────────────────────────
// Perfil del coach
// ──────────────────────────────────────────

export async function getCoachProfile() {
  const session = await getCoachSession()
  if (!session) return { error: "No autorizado", profile: null }

  const data = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      phone: true,
      bio: true,
      specialization: true,
      isCoachActive: true,
      createdAt: true,
    },
  })

  if (!data) return { error: "Error al obtener perfil", profile: null }

  const profile = {
    id: data.id,
    name: data.name,
    email: data.email,
    image: data.image,
    phone: data.phone,
    bio: data.bio,
    specialization: data.specialization,
    is_coach_active: data.isCoachActive,
    created_at: data.createdAt.toISOString(),
  }

  return { profile }
}

export async function updateCoachProfile({
  name,
  phone,
  bio,
  specialization,
  isActive,
}: {
  name: string
  phone?: string
  bio?: string
  specialization?: string
  isActive?: boolean
}) {
  const session = await getCoachSession()
  if (!session) return { error: "No autorizado" }

  if (!name?.trim()) return { error: "El nombre es requerido" }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name.trim(),
        phone: phone || null,
        bio: bio || null,
        specialization: specialization || null,
        isCoachActive: isActive ?? true,
      },
    })
  } catch (err) {
    console.error("Error updating coach profile:", err)
    return { error: "Error al actualizar el perfil" }
  }

  revalidatePath("/coach/profile")
  return { success: true }
}

// ──────────────────────────────────────────
// Historial de cliente
// ──────────────────────────────────────────

export async function getClientHistory(userId: string) {
  const session = await getCoachSession()
  if (!session) return { error: "No autorizado", client: null, healthProfile: null, appointments: [] }

  // Verificar que el coach tiene al menos una cita con este usuario
  const relationship = await prisma.appointment.findFirst({
    where: { coachId: session.user.id, userId },
    select: { id: true },
  })

  if (!relationship) return { error: "Sin acceso a este cliente", client: null, healthProfile: null, appointments: [] }

  // Datos del cliente
  const clientRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, createdAt: true },
  })

  const client = clientRow
    ? {
        id: clientRow.id,
        name: clientRow.name,
        email: clientRow.email,
        image: clientRow.image,
        created_at: clientRow.createdAt.toISOString(),
      }
    : null

  // Perfil de salud actual del cliente
  const healthRow = await prisma.userHealthProfile.findUnique({
    where: { userId },
  })

  const healthProfile = healthRow
    ? {
        id: healthRow.id,
        user_id: healthRow.userId,
        weight: healthRow.weight ? Number(healthRow.weight) : null,
        height: healthRow.height ? Number(healthRow.height) : null,
        age: healthRow.age,
        gender: healthRow.gender,
        diseases: healthRow.diseases,
        medications: healthRow.medications,
        allergies: healthRow.allergies,
        objectives: healthRow.objectives,
        activity_level: healthRow.activityLevel,
        current_exercise_routine: healthRow.currentExerciseRoutine,
        previous_injuries: healthRow.previousInjuries,
        dietary_restrictions: healthRow.dietaryRestrictions,
        additional_notes: healthRow.additionalNotes,
        consultation_reason: healthRow.consultationReason,
        occupation: healthRow.occupation,
        supplements: healthRow.supplements,
        surgeries: healthRow.surgeries,
        intolerances: healthRow.intolerances,
        family_history: healthRow.familyHistory,
        waist_circumference: healthRow.waistCircumference ? Number(healthRow.waistCircumference) : null,
        body_fat_percent: healthRow.bodyFatPercent ? Number(healthRow.bodyFatPercent) : null,
        exercise_type: healthRow.exerciseType,
        exercise_frequency: healthRow.exerciseFrequency,
        sleep_hours: healthRow.sleepHours ? Number(healthRow.sleepHours) : null,
        stress_level: healthRow.stressLevel,
        work_type: healthRow.workType,
        energy_level: healthRow.energyLevel,
        digestion: healthRow.digestion,
        mood: healthRow.mood,
        concentration: healthRow.concentration,
        created_at: healthRow.createdAt.toISOString(),
        updated_at: healthRow.updatedAt.toISOString(),
      }
    : null

  // Todas las citas del usuario
  let appointmentRows
  try {
    appointmentRows = await prisma.appointment.findMany({
      where: { userId },
      select: {
        id: true,
        appointmentDate: true,
        appointmentTime: true,
        durationMinutes: true,
        status: true,
        consultationReason: true,
        notes: true,
        coachId: true,
      },
      orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "desc" }],
    })
  } catch (err) {
    console.error("Error fetching client history:", err)
    return { error: "Error al obtener el historial", client, healthProfile, appointments: [] }
  }

  // Resolver datos de coaches en una sola consulta
  const coachIds = [...new Set(appointmentRows.map((a) => a.coachId).filter(Boolean))]
  const coaches = coachIds.length
    ? await prisma.user.findMany({
        where: { id: { in: coachIds } },
        select: { id: true, name: true, image: true, specialization: true },
      })
    : []

  const coachMap = Object.fromEntries(coaches.map((c) => [c.id, c]))

  const normalized = appointmentRows.map((a) => ({
    id: a.id,
    appointment_date: formatDate(a.appointmentDate),
    appointment_time: formatTime(a.appointmentTime),
    duration_minutes: a.durationMinutes ?? 60,
    status: a.status ?? "scheduled",
    consultation_reason: a.consultationReason ?? "",
    notes: a.notes,
    coach_id: a.coachId,
    coach: coachMap[a.coachId] ?? null,
  }))

  return { client, healthProfile, appointments: normalized }
}

// ──────────────────────────────────────────
// Stats del home
// ──────────────────────────────────────────

export async function getCoachStats() {
  const session = await getCoachSession()
  if (!session) return { error: "No autorizado", stats: null }

  const todayDate = parseDate(new Date().toISOString().split("T")[0])

  const [todayCount, scheduledCount, completedCount, clientsList] = await Promise.all([
    prisma.appointment.count({
      where: {
        coachId: session.user.id,
        appointmentDate: todayDate,
        status: "scheduled",
      },
    }),
    prisma.appointment.count({
      where: { coachId: session.user.id, status: "scheduled" },
    }),
    prisma.appointment.count({
      where: { coachId: session.user.id, status: "completed" },
    }),
    prisma.appointment.findMany({
      where: { coachId: session.user.id },
      select: { userId: true },
    }),
  ])

  const uniqueClients = new Set(clientsList.map((a) => a.userId)).size

  return {
    stats: {
      todayAppointments: todayCount,
      scheduledAppointments: scheduledCount,
      completedAppointments: completedCount,
      totalClients: uniqueClients,
    },
  }
}

// ──────────────────────────────────────────
// Citas próximas de hoy (para el home)
// ──────────────────────────────────────────

export async function getTodayAppointments() {
  const session = await getCoachSession()
  if (!session) return { appointments: [] }

  const todayDate = parseDate(new Date().toISOString().split("T")[0])

  const data = await prisma.appointment.findMany({
    where: {
      coachId: session.user.id,
      appointmentDate: todayDate,
      status: "scheduled",
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { appointmentTime: "asc" },
  })

  return { appointments: data.map(mapAppointmentWithUser) }
}
