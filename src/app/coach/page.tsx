import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCoachStats, getTodayAppointments } from "@/app/coach/actions"
import { CalendarDays, Users, CheckCircle, Clock } from "lucide-react"

export default async function CoachHomePage() {
  const session = await auth()
  if (!session || session.user.role !== "coach") redirect("/auth/login")

  const [{ stats }, { appointments: todayAppointments }] = await Promise.all([
    getCoachStats(),
    getTodayAppointments(),
  ])

  const statCards = [
    {
      label: "Citas hoy",
      value: stats?.todayAppointments ?? 0,
      icon: CalendarDays,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Citas programadas",
      value: stats?.scheduledAppointments ?? 0,
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Citas completadas",
      value: stats?.completedAppointments ?? 0,
      icon: CheckCircle,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Clientes únicos",
      value: stats?.totalClients ?? 0,
      icon: Users,
      color: "text-primary bg-primary/10",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl text-zinc-900">Panel del Coach</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Resumen de tu actividad en Happy Sapiens
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-zinc-200 p-5"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
                <Icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <p className="text-2xl font-heading text-zinc-900">{card.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{card.label}</p>
            </div>
          )
        })}
      </div>

      {/* Citas de hoy */}
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="font-heading text-base text-zinc-900">Citas de hoy</h2>
          <a href="/coach/appointments" className="text-xs text-primary hover:underline font-medium">
            Ver todas
          </a>
        </div>

        {todayAppointments.length === 0 ? (
          <div className="px-6 py-10 text-center text-zinc-400 text-sm">
            No tienes citas programadas para hoy
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {todayAppointments.map((apt: any) => (
              <li key={apt.id}>
                <a
                  href={`/coach/appointments/${apt.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {apt.user?.image ? (
                      <img
                        src={apt.user.image}
                        alt={apt.user.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-primary font-semibold text-sm">
                        {apt.user?.name?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {apt.user?.name || "Cliente"}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {apt.consultation_reason}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-medium text-zinc-700">
                      {apt.appointment_time?.slice(0, 5)}
                    </span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
