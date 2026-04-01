import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { CoachesList } from "@/components/dashboard/coaches-list"

export default async function CoachesPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  // Obtener todos los coaches activos (usuarios con role='coach')
  const { data: coaches } = await supabaseAdmin
    .from("users")
    .select("id, name, email, bio, specialization, image, phone, is_coach_active")
    .eq("role", "coach")
    .eq("is_coach_active", true)
    .order("name")

  // Obtener las reservas del usuario
  const { data: userAppointments } = await supabaseAdmin
    .from("appointments")
    .select(`
      *,
      coach:users!coach_id(id, name, image, specialization)
    `)
    .eq("user_id", session.user.id)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true })

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl uppercase font-heading text-zinc-900 mb-1 sm:mb-2">
          Ritual Coaches
        </h1>
        <p className="text-sm sm:text-base text-zinc-600">
          Agenda citas con nuestros profesionales especializados
        </p>
      </div>

      <CoachesList
        coaches={coaches || []}
        userAppointments={userAppointments || []}
        userId={session.user.id}
        isPaused={session.user.subscriptionStatus === "paused"}
      />
    </div>
  )
}
