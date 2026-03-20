import { supabaseAdmin } from "@/lib/supabase"
import { CoachesManager } from "@/components/admin/coaches-manager"

export default async function AdminCoachesPage() {
  const { data: coaches } = await supabaseAdmin
    .from("users")
    .select("id, name, email, image, specialization, bio, is_coach_active, created_at")
    .eq("role", "coach")
    .order("name")

  // Count appointments per coach
  const coachIds = (coaches ?? []).map((c) => c.id)

  let appointmentCounts: Record<string, number> = {}

  if (coachIds.length > 0) {
    const { data: appts } = await supabaseAdmin
      .from("appointments")
      .select("coach_id")
      .in("coach_id", coachIds)

    for (const appt of appts ?? []) {
      appointmentCounts[appt.coach_id] = (appointmentCounts[appt.coach_id] ?? 0) + 1
    }
  }

  const coachesWithCounts = (coaches ?? []).map((c) => ({
    ...c,
    appointments_count: appointmentCounts[c.id] ?? 0,
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl uppercase font-heading text-zinc-900 mb-1">Coaches</h1>
        <p className="text-sm text-zinc-500">
          Administra los coaches de la plataforma y su estado
        </p>
      </div>

      <CoachesManager coaches={coachesWithCounts} />
    </div>
  )
}
