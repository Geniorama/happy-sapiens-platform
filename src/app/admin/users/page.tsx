import { supabaseAdmin } from "@/lib/supabase"
import { UsersManager } from "@/components/admin/users-manager"

export default async function AdminUsersPage() {
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, name, email, role, phone, birth_date, gender, subscription_status, subscription_end_date, image, created_at")
    .order("created_at", { ascending: false })

  const userIds = (users ?? []).map(u => u.id)

  const [couponsRes, pointsRes] = await Promise.all([
    userIds.length
      ? supabaseAdmin.from("coupons").select("user_id").in("user_id", userIds).eq("is_assigned", true)
      : { data: [] },
    userIds.length
      ? supabaseAdmin.from("user_points").select("user_id, total_points").in("user_id", userIds)
      : { data: [] },
  ])

  const couponCounts: Record<string, number> = {}
  for (const c of couponsRes.data ?? []) {
    couponCounts[c.user_id] = (couponCounts[c.user_id] ?? 0) + 1
  }

  const pointsMap: Record<string, number> = {}
  for (const p of pointsRes.data ?? []) {
    pointsMap[p.user_id] = Number(p.total_points) || 0
  }

  const enriched = (users ?? []).map(u => ({
    ...u,
    coupons_count: couponCounts[u.id] ?? 0,
    total_points: pointsMap[u.id] ?? 0,
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl uppercase font-heading text-zinc-900 mb-1">Usuarios</h1>
        <p className="text-sm text-zinc-500">Gestión completa de usuarios de la plataforma</p>
      </div>

      <UsersManager users={enriched} />
    </div>
  )
}
