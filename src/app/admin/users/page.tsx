import { prisma } from "@/lib/db"
import { UsersManager } from "@/components/admin/users-manager"

export default async function AdminUsersPage() {
  const rows = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      birthDate: true,
      gender: true,
      subscriptionStatus: true,
      subscriptionEndDate: true,
      image: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const userIds = rows.map((u) => u.id)

  const [couponsRows, pointsRows] = await Promise.all([
    userIds.length
      ? prisma.coupon.findMany({
          where: { userId: { in: userIds }, isAssigned: true },
          select: { userId: true },
        })
      : Promise.resolve([] as { userId: string | null }[]),
    userIds.length
      ? prisma.userPoints.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, totalPoints: true },
        })
      : Promise.resolve([] as { userId: string; totalPoints: number }[]),
  ])

  const couponCounts: Record<string, number> = {}
  for (const c of couponsRows) {
    if (!c.userId) continue
    couponCounts[c.userId] = (couponCounts[c.userId] ?? 0) + 1
  }

  const pointsMap: Record<string, number> = {}
  for (const p of pointsRows) {
    pointsMap[p.userId] = Number(p.totalPoints) || 0
  }

  const enriched = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email ?? "",
    role: u.role ?? "user",
    phone: u.phone,
    birth_date: u.birthDate ? u.birthDate.toISOString().slice(0, 10) : null,
    gender: u.gender,
    subscription_status: u.subscriptionStatus,
    subscription_end_date: u.subscriptionEndDate ? u.subscriptionEndDate.toISOString() : null,
    image: u.image,
    created_at: u.createdAt.toISOString(),
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
