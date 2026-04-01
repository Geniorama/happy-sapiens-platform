import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { redirect, notFound } from "next/navigation"
import { CoachDetail } from "@/components/dashboard/coach-detail"
import { getHealthProfile } from "@/app/dashboard/coaches/actions"
import { getGoogleCalendarBlocked } from "@/lib/google-calendar"

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export default async function CoachDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  // Obtener información del coach
  const { data: coach } = await supabaseAdmin
    .from("users")
    .select("id, name, email, bio, specialization, image, phone, is_coach_active")
    .eq("id", id)
    .eq("role", "coach")
    .eq("is_coach_active", true)
    .single()

  if (!coach) notFound()

  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 60)
  const startStr = toLocalDateStr(startDate)
  const endStr = toLocalDateStr(endDate)

  // Consultas en paralelo
  const [
    { data: availability },
    { data: existingAppointments },
    { profile: healthProfile },
    googleBlocked,
  ] = await Promise.all([
    supabaseAdmin
      .from("coach_availability")
      .select("*")
      .eq("coach_id", id)
      .eq("is_available", true)
      .order("day_of_week")
      .order("start_time"),

    supabaseAdmin
      .from("appointments")
      .select("appointment_date, appointment_time")
      .eq("coach_id", id)
      .eq("status", "scheduled")
      .gte("appointment_date", startStr)
      .lte("appointment_date", endStr),

    getHealthProfile(),

    // Bloqueados por Google Calendar (falla silenciosamente si no está conectado)
    getGoogleCalendarBlocked(id, startStr, endStr).catch(() => []),
  ])

  return (
    <div className="max-w-4xl mx-auto">
      <CoachDetail
        coach={coach}
        availability={availability || []}
        existingAppointments={existingAppointments || []}
        externalBlocked={googleBlocked}
        userId={session.user.id}
        healthProfile={healthProfile}
        isPaused={session.user.subscriptionStatus === "paused"}
      />
    </div>
  )
}
