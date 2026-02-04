import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { redirect, notFound } from "next/navigation"
import { CoachDetail } from "@/components/dashboard/coach-detail"
import { getHealthProfile } from "@/app/dashboard/coaches/actions"

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

  // Obtener información del coach (usuario con role='coach')
  const { data: coach } = await supabaseAdmin
    .from("users")
    .select("id, name, email, bio, specialization, image, phone, is_coach_active")
    .eq("id", id)
    .eq("role", "coach")
    .eq("is_coach_active", true)
    .single()

  if (!coach) {
    notFound()
  }

  // Obtener disponibilidad del coach
  const { data: availability } = await supabaseAdmin
    .from("coach_availability")
    .select("*")
    .eq("coach_id", id)
    .eq("is_available", true)
    .order("day_of_week")
    .order("start_time")

  // Obtener citas existentes del coach para los próximos 30 días
  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 30)

  const { data: existingAppointments } = await supabaseAdmin
    .from("appointments")
    .select("appointment_date, appointment_time")
    .eq("coach_id", id)
    .eq("status", "scheduled")
    .gte("appointment_date", startDate.toISOString().split("T")[0])
    .lte("appointment_date", endDate.toISOString().split("T")[0])

  // Verificar si el usuario tiene perfil de salud
  const { profile: healthProfile } = await getHealthProfile()

  return (
    <div className="max-w-4xl mx-auto">
      <CoachDetail
        coach={coach}
        availability={availability || []}
        existingAppointments={existingAppointments || []}
        userId={session.user.id}
        healthProfile={healthProfile}
      />
    </div>
  )
}
