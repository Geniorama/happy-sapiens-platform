import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { SectionCover } from "@/components/dashboard/section-cover"
import { CoachesList } from "@/components/dashboard/coaches-list"

export default async function CoachesPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  const { data: cover } = await supabaseAdmin
    .from("section_covers")
    .select("title, subtitle, image_url, is_active")
    .eq("section_key", "coaches")
    .eq("is_active", true)
    .single()

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
      <SectionCover
        title={cover?.title || ""}
        subtitle={cover?.subtitle || ""}
        imageUrl={cover?.image_url}
        fallbackTitle="Ritual Coaches"
        fallbackSubtitle="Agenda citas con nuestros profesionales especializados"
      />

      <CoachesList
        coaches={coaches || []}
        userAppointments={userAppointments || []}
        userId={session.user.id}
        isPaused={session.user.subscriptionStatus === "paused"}
      />
    </div>
  )
}
