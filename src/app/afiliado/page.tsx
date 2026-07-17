import { redirect } from "next/navigation"
import { Users, UserCheck, Wallet, PiggyBank, History, ShoppingBag } from "lucide-react"
import { getAffiliateData } from "@/app/afiliado/actions"
import { AffiliateShareCard } from "@/components/afiliado/affiliate-share-card"
import { PayoutRequestCard } from "@/components/afiliado/payout-request-card"

export const dynamic = "force-dynamic"

function formatCOP(value: number): string {
  return `$${Math.round(value).toLocaleString("es-CO")}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active: { label: "Activo", className: "bg-green-50 text-green-700 border-green-200" },
  paused: { label: "Pausado", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  cancelled: { label: "Cancelado", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  past_due: { label: "Vencido", className: "bg-red-50 text-red-700 border-red-200" },
  inactive: { label: "Inactivo", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
}

export default async function AfiliadoHomePage() {
  const result = await getAffiliateData()

  if (result.error === "No autorizado") {
    redirect("/dashboard")
  }

  if (!result.data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {result.error ?? "No se pudieron cargar tus datos de afiliado"}
      </div>
    )
  }

  const { referralCode, summary } = result.data

  const statCards = [
    {
      label: "Referidos totales",
      value: summary.totalReferrals.toString(),
      icon: Users,
      color: "text-primary bg-primary/10",
    },
    {
      label: "Referidos activos",
      value: summary.activeReferrals.toString(),
      icon: UserCheck,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Total ganado",
      value: formatCOP(summary.totalEarned),
      icon: Wallet,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Disponible para redimir",
      value: formatCOP(summary.availableBalance),
      icon: PiggyBank,
      color: "text-amber-600 bg-amber-50",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl text-zinc-900">Panel de Afiliado</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Recomienda Happy Sapiens y gana recompensas en COP por cada referido que se suscribe
          y por cada compra en la tienda que use tu código.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-xl border border-zinc-200 p-5">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
                <Icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <p className="text-2xl font-heading text-zinc-900 break-words">{card.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{card.label}</p>
            </div>
          )
        })}
      </div>

      {/* Enlace de afiliado */}
      <AffiliateShareCard referralCode={referralCode} rewardPercent={summary.rewardPercent} />

      {/* Redimir saldo */}
      <PayoutRequestCard
        availableBalance={summary.availableBalance}
        pendingPayout={summary.pendingPayout}
        totalPaid={summary.totalPaid}
        payouts={summary.payouts}
      />

      {/* Historial de recompensas */}
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
          <History className="w-4 h-4 text-zinc-500" strokeWidth={1.75} />
          <h2 className="font-heading text-base text-zinc-900">Referidos y recompensas</h2>
        </div>

        {summary.rewards.length === 0 ? (
          <div className="px-6 py-10 text-center text-zinc-400 text-sm">
            Aún no tienes recompensas. Comparte tu enlace para empezar a ganar.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {summary.rewards.map((r) => {
              const name = r.referredUser?.name || r.referredUser?.email || "Referido"
              const status =
                STATUS_LABELS[r.referredUser?.subscriptionStatus ?? "inactive"] ?? STATUS_LABELS.inactive
              return (
                <li
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-6 py-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{name}</p>
                      <p className="text-xs text-zinc-500">
                        Se suscribió el {formatDate(r.createdAt)}
                        {r.plan ? ` · ${r.plan}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pl-12 sm:pl-0 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${status.className}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {status.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">
                      +{formatCOP(r.amount)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Comisiones por compras en la tienda */}
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-zinc-500" strokeWidth={1.75} />
          <h2 className="font-heading text-base text-zinc-900">Comisiones por compras en la tienda</h2>
        </div>

        <div className="px-6 pt-4">
          <p className="text-xs text-zinc-500">
            Ganas el {summary.shopifyRewardPercent}% del valor de los productos cuando un cliente compra
            en la tienda escribiendo tu código <span className="font-mono text-zinc-700">{referralCode}</span>{" "}
            en la nota del pedido.
          </p>
        </div>

        {summary.orderRewards.length === 0 ? (
          <div className="px-6 py-10 text-center text-zinc-400 text-sm">
            Aún no tienes comisiones por compras en la tienda.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 mt-2">
            {summary.orderRewards.map((o) => {
              const cancelled = o.status === "cancelled"
              return (
                <li
                  key={o.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-6 py-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        Pedido {o.shopifyOrderNumber ? `#${o.shopifyOrderNumber}` : ""}
                        {o.customerEmail ? ` · ${o.customerEmail}` : ""}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(o.createdAt)}
                        {o.orderAmount != null ? ` · compra ${formatCOP(o.orderAmount)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pl-12 sm:pl-0 shrink-0">
                    {cancelled ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium bg-zinc-100 text-zinc-500 border-zinc-200 line-through">
                        Anulada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">
                        +{formatCOP(o.amount)}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
