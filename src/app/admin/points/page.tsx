import { supabaseAdmin } from "@/lib/supabase"
import { PointsManager } from "@/components/admin/points-manager"

export default async function AdminPointsPage() {
  // Fetch users (non-admin) with their points balance
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, name, email, role")
    .neq("role", "admin")
    .order("name")

  const userIds = (users ?? []).map((u) => u.id)

  // Fetch points balances
  const { data: pointsRows } = userIds.length
    ? await supabaseAdmin
        .from("user_points")
        .select("user_id, total_points")
        .in("user_id", userIds)
    : { data: [] }

  const pointsMap: Record<string, number> = {}
  for (const row of pointsRows ?? []) {
    pointsMap[row.user_id] = Number(row.total_points) || 0
  }

  const usersWithPoints = (users ?? []).map((u) => ({
    ...u,
    total_points: pointsMap[u.id] ?? 0,
  }))

  // Sort by points desc
  usersWithPoints.sort((a, b) => b.total_points - a.total_points)

  const totalPoints = usersWithPoints.reduce((s, u) => s + u.total_points, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl uppercase font-heading text-zinc-900 mb-1">
            Puntos
          </h1>
          <p className="text-sm text-zinc-500">
            Gestiona los puntos de usuarios y coaches
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-zinc-900">{totalPoints.toLocaleString()}</p>
          <p className="text-xs text-zinc-400">pts en circulación</p>
        </div>
      </div>

      <PointsManager users={usersWithPoints} />
    </div>
  )
}
