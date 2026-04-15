import { prisma } from "@/lib/db"
import { Users, UserCheck, Building2, Tag, TrendingUp, Clock } from "lucide-react"

export default async function AdminDashboardPage() {
  const [
    usersCount,
    coachesCount,
    activePartnersCount,
    availableCouponsCount,
    assignedCouponsCount,
    recentUsersRows,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "user" } }),
    prisma.user.count({ where: { role: "coach" } }),
    prisma.partner.count({ where: { isActive: true } }),
    prisma.coupon.count({ where: { isAssigned: false } }),
    prisma.coupon.count({ where: { isAssigned: true } }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ])

  const stats = [
    {
      label: "Usuarios",
      value: usersCount,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Coaches",
      value: coachesCount,
      icon: UserCheck,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Marcas activas",
      value: activePartnersCount,
      icon: Building2,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Cupones disponibles",
      value: availableCouponsCount,
      icon: Tag,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Cupones asignados",
      value: assignedCouponsCount,
      icon: TrendingUp,
      color: "bg-rose-50 text-rose-600",
    },
  ]

  const recentUsers = recentUsersRows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    created_at: u.createdAt.toISOString(),
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl uppercase font-heading text-zinc-900 mb-1">
          Panel de Administración
        </h1>
        <p className="text-sm text-zinc-500">Vista general de la plataforma</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
                <Icon className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <p className="text-2xl font-bold text-zinc-900">{stat.value.toLocaleString()}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Recent Users */}
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-100">
          <Clock className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
          <h2 className="font-semibold text-zinc-900 text-sm">Últimos usuarios registrados</h2>
        </div>
        <div className="divide-y divide-zinc-50">
          {recentUsers.length === 0 ? (
            <p className="px-6 py-8 text-sm text-zinc-400 text-center">No hay usuarios aún</p>
          ) : (
            recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{u.name || "Sin nombre"}</p>
                  <p className="text-xs text-zinc-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.role === "coach"
                        ? "bg-green-100 text-green-700"
                        : u.role === "admin"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {u.role}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {new Date(u.created_at).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
