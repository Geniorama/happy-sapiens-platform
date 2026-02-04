"use server"

import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

interface HealthProfileData {
  weight: number
  height: number
  age: number
  gender: string
  diseases: string | null
  medications: string | null
  allergies: string | null
  objectives: string
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
  notes: string | null
}

export async function createAppointment(data: CreateAppointmentData) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { error: "No autorizado" }
    }

    // Verificar que el usuario tenga perfil de salud completo
    const hasProfile = await hasHealthProfile()
    if (!hasProfile) {
      return { error: "COMPLETE_PROFILE" }
    }

    // Verificar que el coach existe y está activo (usuario con role='coach')
    const { data: coach, error: coachError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", data.coachId)
      .eq("role", "coach")
      .eq("is_coach_active", true)
      .single()

    if (coachError || !coach) {
      return { error: "Coach no encontrado o no disponible" }
    }

    // Verificar que la fecha no sea en el pasado
    const appointmentDateTime = new Date(`${data.appointmentDate}T${data.appointmentTime}`)
    if (appointmentDateTime < new Date()) {
      return { error: "No puedes agendar citas en el pasado" }
    }

    // Verificar que no haya una cita duplicada
    const { data: existing } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .eq("coach_id", data.coachId)
      .eq("appointment_date", data.appointmentDate)
      .eq("appointment_time", data.appointmentTime)
      .eq("status", "scheduled")
      .single()

    if (existing) {
      return { error: "Este horario ya está ocupado" }
    }

    // Verificar disponibilidad del coach
    const appointmentDay = appointmentDateTime.getDay()
    const { data: availability } = await supabaseAdmin
      .from("coach_availability")
      .select("*")
      .eq("coach_id", data.coachId)
      .eq("day_of_week", appointmentDay)
      .eq("is_available", true)

    if (!availability || availability.length === 0) {
      return { error: "El coach no está disponible en este día" }
    }

    // Verificar que el horario esté dentro del rango de disponibilidad
    const [hour, minute] = data.appointmentTime.split(":").map(Number)
    const appointmentMinutes = hour * 60 + minute
    const isAvailable = availability.some(av => {
      const [startHour, startMin] = av.start_time.split(":").map(Number)
      const [endHour, endMin] = av.end_time.split(":").map(Number)
      const startMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin
      return appointmentMinutes >= startMinutes && appointmentMinutes + 60 <= endMinutes
    })

    if (!isAvailable) {
      return { error: "El horario seleccionado no está disponible" }
    }

    // Crear la cita
    const { error: insertError } = await supabaseAdmin
      .from("appointments")
      .insert({
        user_id: session.user.id,
        coach_id: data.coachId,
        appointment_date: data.appointmentDate,
        appointment_time: data.appointmentTime,
        duration_minutes: 60,
        status: "scheduled",
        notes: data.notes,
      })

    if (insertError) {
      console.error("Error creating appointment:", insertError)
      return { error: "Error al crear la cita. Por favor intenta de nuevo." }
    }

    revalidatePath("/dashboard/coaches")
    revalidatePath("/dashboard/coaches/appointments")
    
    return { success: true }
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
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from("appointments")
      .select("id, status, appointment_date, appointment_time")
      .eq("id", appointmentId)
      .eq("user_id", session.user.id)
      .single()

    if (fetchError || !appointment) {
      return { error: "Cita no encontrada" }
    }

    if (appointment.status !== "scheduled") {
      return { error: "Solo puedes cancelar citas programadas" }
    }

    // Verificar que la cita no sea en el pasado
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
    if (appointmentDateTime < new Date()) {
      return { error: "No puedes cancelar citas pasadas" }
    }

    // Cancelar la cita
    const { error: updateError } = await supabaseAdmin
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentId)

    if (updateError) {
      console.error("Error cancelling appointment:", updateError)
      return { error: "Error al cancelar la cita. Por favor intenta de nuevo." }
    }

    revalidatePath("/dashboard/coaches")
    revalidatePath("/dashboard/coaches/appointments")
    
    return { success: true }
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

    const { data, error } = await supabaseAdmin
      .from("user_health_profiles")
      .select("id, weight, height, age, gender, objectives")
      .eq("user_id", session.user.id)
      .single()

    if (error || !data) {
      return false
    }

    // Verificar que todos los campos requeridos estén completos
    return !!(
      data.weight &&
      data.height &&
      data.age &&
      data.gender &&
      data.objectives
    )
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

    const { data, error } = await supabaseAdmin
      .from("user_health_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single()

    if (error) {
      // Si no existe el perfil, retornar null sin error
      if (error.code === "PGRST116") {
        return { profile: null }
      }
      console.error("Error fetching health profile:", error)
      return { error: "Error al obtener el perfil de salud", profile: null }
    }

    return { profile: data }
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

    // Validar campos requeridos
    if (!data.weight || !data.height || !data.age || !data.gender || !data.objectives) {
      return { error: "Por favor completa todos los campos requeridos" }
    }

    // Insertar o actualizar el perfil de salud
    const { error: upsertError } = await supabaseAdmin
      .from("user_health_profiles")
      .upsert(
        {
          user_id: session.user.id,
          weight: data.weight,
          height: data.height,
          age: data.age,
          gender: data.gender,
          diseases: data.diseases,
          medications: data.medications,
          allergies: data.allergies,
          objectives: data.objectives,
          activity_level: data.activity_level,
          current_exercise_routine: data.current_exercise_routine,
          previous_injuries: data.previous_injuries,
          dietary_restrictions: data.dietary_restrictions,
          additional_notes: data.additional_notes,
        },
        {
          onConflict: "user_id",
        }
      )

    if (upsertError) {
      console.error("Error saving health profile:", upsertError)
      return { error: "Error al guardar el perfil de salud. Por favor intenta de nuevo." }
    }

    revalidatePath("/dashboard/profile")
    revalidatePath("/dashboard/coaches")
    
    return { success: true }
  } catch (error) {
    console.error("Error in saveHealthProfile:", error)
    return { error: "Error interno del servidor" }
  }
}
