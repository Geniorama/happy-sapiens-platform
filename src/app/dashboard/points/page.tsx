import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getPointsBalance, getPointsHistory } from "@/lib/points"
import { PointsHistory } from "@/components/dashboard/points-history"
import { Star, TrendingUp, Gift, Zap } from "lucide-react"

const ACTION_LABELS: Record<string, string> = {
  signup: "Registro en la plataforma",
  complete_profile: "Perfil completado",
  complete_health_profile: "Historia clínica completada",
  upload_avatar: "Foto de perfil subida",
  first_login: "Primer inicio de sesión",
  book_appointment: "Cita reservada",
  complete_appointment: "Cita completada",
  cancel_appointment: "Cita cancelada",
  referral_signup: "Referido registrado",
  referral_subscribed: "Referido suscrito",
  subscription_active: "Suscripción activada",
  redeem_reward: "Recompensa canjeada",
}

export const ACTION_LABELS_EXPORT = ACTION_LABELS

export default async function PointsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const [balance, history] = await Promise.all([
    getPointsBalance(session.user.id),
    getPointsHistory(session.user.id, { limit: 50 }),
  ])

  const earned = history.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const spent = history.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const stats = [
    { label: "Puntos actuales", value: balance, icon: Star, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Puntos ganados", value: earned, icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
    { label: "Puntos canjeados", value: spent, icon: Gift, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Acciones realizadas", value: history.filter((t) => t.amount > 0).length, icon: Zap, color: "text-blue-500", bg: "bg-blue-50" },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl uppercase font-heading text-zinc-900 mb-1 sm:mb-2">
          Mis Puntos
        </h1>
        <p className="text-sm sm:text-base text-zinc-600">
          Gana puntos por cada acción dentro de la plataforma y canjéalos por recompensas.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-zinc-900">{s.value.toLocaleString()}</p>
              <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">{s.label}</p>
            </div>
          )
        })}
      </div>

      {/* Cómo ganar puntos */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 sm:p-6 mb-6">
        <h2 className="font-heading text-lg text-zinc-900 mb-4 uppercase">Cómo ganar puntos</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            { action: "Completar tu perfil", pts: 30 },
            { action: "Completar historia clínica", pts: 40 },
            { action: "Registrarte en la plataforma", pts: 50 },
            { action: "Activar tu suscripción", pts: 50 },
            { action: "Reservar una cita", pts: 15 },
            { action: "Completar una cita", pts: 25 },
            { action: "Referir a un amigo", pts: 20 },
            { action: "Referido que se suscribe", pts: 100 },
          ].map((item) => (
            <div key={item.action} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-50 transition-colors">
              <span className="text-sm text-zinc-700">{item.action}</span>
              <span className="text-sm font-semibold text-amber-600">+{item.pts} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Historial */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 sm:p-6">
        <h2 className="font-heading text-lg text-zinc-900 mb-4 uppercase">Historial de transacciones</h2>
        <PointsHistory transactions={history} actionLabels={ACTION_LABELS} />
      </div>
    </div>
  )
}
