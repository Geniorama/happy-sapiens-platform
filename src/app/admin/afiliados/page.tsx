import { Users, Wallet, Banknote, Clock, Hourglass } from "lucide-react"
import { getAffiliatesReport, getPendingPayouts, getAffiliateRewardPercent } from "@/lib/affiliate"
import { PayoutsManager } from "@/components/admin/payouts-manager"
import { AffiliateConfigForm } from "@/components/admin/affiliate-config-form"

export const dynamic = "force-dynamic"

function formatCOP(value: number): string {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  })
}

function formatInt(value: number): string {
  return value.toLocaleString("es-CO")
}

export default async function AdminAfiliadosPage() {
  const [report, pendingPayouts, rewardPercent] = await Promise.all([
    getAffiliatesReport(),
    getPendingPayouts(),
    getAffiliateRewardPercent(),
  ])
  const { totals, affiliates } = report

  const kpis = [
    { label: "Afiliados", value: formatInt(totals.affiliates), icon: Users, color: "bg-blue-50 text-blue-600" },
    { label: "Referidos generados", value: formatInt(totals.referrals), icon: Users, color: "bg-indigo-50 text-indigo-600" },
    { label: "Total ganado", value: formatCOP(totals.earned), icon: Wallet, color: "bg-emerald-50 text-emerald-600" },
    { label: "Pagado", value: formatCOP(totals.paid), icon: Banknote, color: "bg-zinc-50 text-zinc-600" },
    { label: "Pendiente de pago", value: formatCOP(totals.pending), icon: Hourglass, color: "bg-amber-50 text-amber-600" },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl uppercase font-heading text-zinc-900 mb-1">Afiliados</h1>
        <p className="text-sm text-zinc-500">
          Recompensas por referidos, saldos y solicitudes de retiro.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${k.color}`}>
                <Icon className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <p className="text-xl font-bold text-zinc-900 leading-tight break-words">{k.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{k.label}</p>
            </div>
          )
        })}
      </div>

      {/* Config: porcentaje de recompensa */}
      <AffiliateConfigForm current={rewardPercent} />

      {/* Solicitudes de retiro pendientes */}
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-100">
          <Clock className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
          <h2 className="font-semibold text-zinc-900 text-sm">Solicitudes de retiro pendientes</h2>
          {pendingPayouts.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
              {pendingPayouts.length}
            </span>
          )}
        </div>
        <PayoutsManager payouts={pendingPayouts} />
      </div>

      {/* Reporte de afiliados */}
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-100">
          <Users className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
          <h2 className="font-semibold text-zinc-900 text-sm">Detalle por afiliado</h2>
        </div>
        {affiliates.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-400 text-center">
            Aún no hay usuarios con rol afiliado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-xs text-zinc-500 border-b border-zinc-100">
                  <th className="px-6 py-3 font-medium">Afiliado</th>
                  <th className="px-4 py-3 font-medium text-right">Referidos</th>
                  <th className="px-4 py-3 font-medium text-right">Activos</th>
                  <th className="px-4 py-3 font-medium text-right">Ganado</th>
                  <th className="px-4 py-3 font-medium text-right">Pagado</th>
                  <th className="px-4 py-3 font-medium text-right">Pendiente</th>
                  <th className="px-6 py-3 font-medium text-right">Disponible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {affiliates.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-3">
                      <p className="font-medium text-zinc-900 truncate">{a.name || a.email || "—"}</p>
                      <p className="text-xs text-zinc-500 truncate">
                        {a.email ?? "—"}
                        {a.referralCode ? ` · ${a.referralCode}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-900">{formatInt(a.totalReferrals)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{formatInt(a.activeReferrals)}</td>
                    <td className="px-4 py-3 text-right text-zinc-900">{formatCOP(a.totalEarned)}</td>
                    <td className="px-4 py-3 text-right text-zinc-500">{formatCOP(a.totalPaid)}</td>
                    <td className="px-4 py-3 text-right text-amber-700">{formatCOP(a.pendingPayout)}</td>
                    <td className="px-6 py-3 text-right font-semibold text-zinc-900">
                      {formatCOP(a.availableBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
