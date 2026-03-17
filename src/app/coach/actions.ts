"use server"

import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
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

// ──────────────────────────────────────────
// Citas
// ──────────────────────────────────────────

export async function getCoachAppointments(status?: string) {
  const session = await getCoachSession()
  if (!session) return { error: "No autorizado", appointments: [] }

  let query = supabaseAdmin
    .from("appointments")
    .select(`*, user:users!user_id(id, name, email, image)`)
    .eq("coach_id", session.user.id)
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false })

  if (status && status !== "all") {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching coach appointments:", error)
    return { error: "Error al obtener citas", appointments: [] }
  }

  return { appointments: data || [] }
}

export async function getAppointmentById(id: string) {
  const session = await getCoachSession()
  if (!session) return { error: "No autorizado", appointment: null }

  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select(`*, user:users!user_id(id, name, email, image)`)
    .eq("id", id)
    .eq("coach_id", session.user.id)
    .single()

  if (error || !data) return { error: "Cita no encontrada", appointment: null }

  return { appointment: data }
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
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("appointments")
    .select("id, status, google_event_id")
    .eq("id", id)
    .eq("coach_id", session.user.id)
    .single()

  if (fetchError || !existing) return { error: "Cita no encontrada" }

  const updates: Record<string, unknown> = {}
  if (status !== undefined) {
    const allowed = ["completed", "no_show", "cancelled"]
    if (!allowed.includes(status)) return { error: "Estado inválido" }
    updates.status = status
  }
  if (notes !== undefined) updates.notes = notes
  if (meetingLink !== undefined) updates.meeting_link = meetingLink

  const { error } = await supabaseAdmin
    .from("appointments")
    .update(updates)
    .eq("id", id)

  if (error) {
    console.error("Error updating appointment:", error)
    return { error: "Error al actualizar la cita" }
  }

  revalidatePath("/coach/appointments")
  revalidatePath(`/coach/appointments/${id}`)

  // Sincronizar con Google Calendar (silencioso)
  if (existing.google_event_id) {
    if (status === "cancelled" || status === "no_show") {
      await deleteCalendarEvent(session.user.id, existing.google_event_id).catch(() => {})
    } else if (status === "completed") {
      await updateCalendarEvent(session.user.id, existing.google_event_id, {
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

  const { data, error } = await supabaseAdmin
    .from("coach_availability")
    .select("*")
    .eq("coach_id", session.user.id)
    .order("day_of_week")
    .order("start_time")

  if (error) {
    console.error("Error fetching availability:", error)
    return { error: "Error al obtener disponibilidad", availability: [] }
  }

  return { availability: data || [] }
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
  const { error: deleteError } = await supabaseAdmin
    .from("coach_availability")
    .delete()
    .eq("coach_id", session.user.id)

  if (deleteError) {
    console.error("Error deleting availability:", deleteError)
    return { error: "Error al guardar disponibilidad" }
  }

  const rows = slots
    .filter((s) => s.is_available)
    .flatMap((s) =>
      s.blocks.map((b) => ({
        coach_id: session.user.id,
        day_of_week: s.day_of_week,
        start_time: b.start_time,
        end_time: b.end_time,
        slot_duration: b.slot_duration ?? 60,
        is_available: true,
      }))
    )

  if (rows.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from("coach_availability")
      .insert(rows)

    if (insertError) {
      console.error("Error inserting availability:", insertError)
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

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email, image, phone, bio, specialization, is_coach_active, created_at")
    .eq("id", session.user.id)
    .single()

  if (error || !data) return { error: "Error al obtener perfil", profile: null }

  return { profile: data }
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

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      name: name.trim(),
      phone: phone || null,
      bio: bio || null,
      specialization: specialization || null,
      is_coach_active: isActive ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.user.id)

  if (error) {
    console.error("Error updating coach profile:", error)
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
  if (!session) return { error: "No autorizado", client: null, appointments: [] }

  // Verificar que el coach tiene al menos una cita con este usuario
  const { data: relationship } = await supabaseAdmin
    .from("appointments")
    .select("id")
    .eq("coach_id", session.user.id)
    .eq("user_id", userId)
    .limit(1)
    .single()

  if (!relationship) return { error: "Sin acceso a este cliente", client: null, appointments: [] }

  // Datos del cliente
  const { data: client } = await supabaseAdmin
    .from("users")
    .select("id, name, email, image, created_at")
    .eq("id", userId)
    .single()

  // Perfil de salud actual del cliente
  const { data: healthProfile } = await supabaseAdmin
    .from("user_health_profiles")
    .select("*")
    .eq("user_id", userId)
    .single()

  // Todas las citas del usuario
  const { data: appointments, error } = await supabaseAdmin
    .from("appointments")
    .select("id, appointment_date, appointment_time, duration_minutes, status, consultation_reason, notes, coach_id")
    .eq("user_id", userId)
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false })

  if (error) {
    console.error("Error fetching client history:", error.message, error.details, error.hint)
    return { error: "Error al obtener el historial", client, appointments: [] }
  }

  // Resolver datos de coaches en una sola consulta
  const coachIds = [...new Set((appointments ?? []).map((a) => a.coach_id).filter(Boolean))]
  const { data: coaches } = coachIds.length
    ? await supabaseAdmin
        .from("users")
        .select("id, name, image, specialization")
        .in("id", coachIds)
    : { data: [] }

  const coachMap = Object.fromEntries((coaches ?? []).map((c) => [c.id, c]))

  const normalized = (appointments ?? []).map((a) => ({
    ...a,
    coach: coachMap[a.coach_id] ?? null,
  }))

  return { client, healthProfile: healthProfile ?? null, appointments: normalized }
}

// ──────────────────────────────────────────
// Stats del home
// ──────────────────────────────────────────

export async function getCoachStats() {
  const session = await getCoachSession()
  if (!session) return { error: "No autorizado", stats: null }

  const today = new Date().toISOString().split("T")[0]

  const [todayRes, scheduledRes, completedRes, totalClientsRes] = await Promise.all([
    supabaseAdmin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", session.user.id)
      .eq("appointment_date", today)
      .eq("status", "scheduled"),
    supabaseAdmin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", session.user.id)
      .eq("status", "scheduled"),
    supabaseAdmin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", session.user.id)
      .eq("status", "completed"),
    supabaseAdmin
      .from("appointments")
      .select("user_id")
      .eq("coach_id", session.user.id),
  ])

  const uniqueClients = new Set(totalClientsRes.data?.map((a) => a.user_id) ?? []).size

  return {
    stats: {
      todayAppointments: todayRes.count ?? 0,
      scheduledAppointments: scheduledRes.count ?? 0,
      completedAppointments: completedRes.count ?? 0,
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

  const today = new Date().toISOString().split("T")[0]

  const { data } = await supabaseAdmin
    .from("appointments")
    .select(`*, user:users!user_id(id, name, email, image)`)
    .eq("coach_id", session.user.id)
    .eq("appointment_date", today)
    .eq("status", "scheduled")
    .order("appointment_time", { ascending: true })

  return { appointments: data || [] }
}
