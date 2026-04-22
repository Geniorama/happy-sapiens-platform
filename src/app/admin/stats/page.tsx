import { prisma } from "@/lib/db"
import {
  Users, CreditCard, TrendingUp, TrendingDown, DollarSign,
  AlertTriangle, Activity, Package, Receipt, ExternalLink,
} from "lucide-react"
import Link from "next/link"

const SUBSCRIPTION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Activa", color: "bg-green-100 text-green-700" },
  past_due: { label: "Pago atrasado", color: "bg-red-100 text-red-700" },
  paused: { label: "Pausada", color: "bg-yellow-100 text-yellow-700" },
  cancelled: { label: "Cancelada", color: "bg-orange-100 text-orange-700" },
  inactive: { label: "Inactiva", color: "bg-zinc-100 text-zinc-600" },
}

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  approved: { label: "Aprobado", color: "bg-green-100 text-green-700" },
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  rejected: { label: "Rechazado", color: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelado", color: "bg-zinc-100 text-zinc-600" },
}

const MONTH_LABELS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
]

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

type MonthRow = {
  month: Date
  new_subs: bigint
  cancels: bigint
  revenue: string | number | null
}

export default async function AdminStatsPage() {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const activeStatuses = ["active", "past_due"]

  const [
    byStatus,
    byProduct,
    mrrAgg,
    totalRevenueAgg,
    monthRevenueAgg,
    new30,
    newPrev30,
    cancels30,
    cancelsPrev30,
    failed30,
    pending30,
    planRows,
    monthSeries,
    recentTxRows,
    approvedTxCount,
  ] = await Promise.all([
    prisma.user.groupBy({
      by: ["subscriptionStatus"],
      _count: { _all: true },
    }),
    prisma.user.groupBy({
      by: ["subscriptionProduct"],
      where: { subscriptionStatus: { in: activeStatuses } },
      _count: { _all: true },
      _sum: { subscriptionPrice: true },
    }),
    prisma.user.aggregate({
      where: { subscriptionStatus: { in: activeStatuses } },
      _sum: { subscriptionPrice: true },
    }),
    prisma.paymentTransaction.aggregate({
      where: { status: "approved" },
      _sum: { amount: true },
    }),
    prisma.paymentTransaction.aggregate({
      where: { status: "approved", paymentDate: { gte: firstOfMonth } },
      _sum: { amount: true },
    }),
    prisma.user.count({
      where: { subscriptionStartDate: { gte: thirtyDaysAgo } },
    }),
    prisma.user.count({
      where: {
        subscriptionStartDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    }),
    prisma.subscriptionHistory.count({
      where: { newStatus: "cancelled", createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.subscriptionHistory.count({
      where: {
        newStatus: "cancelled",
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    }),
    prisma.paymentTransaction.count({
      where: { status: "rejected", paymentDate: { gte: thirtyDaysAgo } },
    }),
    prisma.paymentTransaction.count({
      where: { status: "pending", paymentDate: { gte: thirtyDaysAgo } },
    }),
    prisma.subscriptionPlanConfig.findMany({
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    }),
    prisma.$queryRaw<MonthRow[]>`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE - interval '11 months'),
          date_trunc('month', CURRENT_DATE),
          interval '1 month'
        )::date AS month
      )
      SELECT
        m.month,
        COALESCE(n.count, 0)::bigint AS new_subs,
        COALESCE(c.count, 0)::bigint AS cancels,
        COALESCE(r.total, 0)::numeric AS revenue
      FROM months m
      LEFT JOIN (
        SELECT date_trunc('month', subscription_start_date)::date AS month, COUNT(*) AS count
        FROM users
        WHERE subscription_start_date IS NOT NULL
        GROUP BY 1
      ) n ON n.month = m.month
      LEFT JOIN (
        SELECT date_trunc('month', created_at)::date AS month, COUNT(*) AS count
        FROM subscription_history
        WHERE new_status = 'cancelled'
        GROUP BY 1
      ) c ON c.month = m.month
      LEFT JOIN (
        SELECT date_trunc('month', payment_date)::date AS month, SUM(amount) AS total
        FROM payment_transactions
        WHERE status = 'approved' AND payment_date IS NOT NULL
        GROUP BY 1
      ) r ON r.month = m.month
      ORDER BY m.month ASC
    `,
    prisma.paymentTransaction.findMany({
      orderBy: { paymentDate: "desc" },
      take: 15,
      include: { user: { select: { email: true, name: true } } },
    }),
    prisma.paymentTransaction.count({ where: { status: "approved" } }),
  ])

  const statusCounts: Record<string, number> = {}
  for (const row of byStatus) {
    const key = row.subscriptionStatus ?? "inactive"
    statusCounts[key] = (statusCounts[key] ?? 0) + row._count._all
  }
  const totalUsers = Object.values(statusCounts).reduce((a, b) => a + b, 0)
  const activeCount = (statusCounts.active ?? 0) + (statusCounts.past_due ?? 0)

  const planTitles: Record<string, string> = {}
  for (const p of planRows) planTitles[p.slug] = p.title

  const productCounts = byProduct
    .filter((r) => r.subscriptionProduct)
    .map((r) => ({
      slug: r.subscriptionProduct!,
      title: planTitles[r.subscriptionProduct!] ?? r.subscriptionProduct!,
      count: r._count._all,
      mrr: r._sum.subscriptionPrice ? Number(r._sum.subscriptionPrice) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  const mrr = mrrAgg._sum.subscriptionPrice ? Number(mrrAgg._sum.subscriptionPrice) : 0
  const totalRevenue = totalRevenueAgg._sum.amount ? Number(totalRevenueAgg._sum.amount) : 0
  const monthRevenue = monthRevenueAgg._sum.amount ? Number(monthRevenueAgg._sum.amount) : 0

  // Churn: cancelaciones últimos 30d / (activos + cancelaciones)
  const denom = activeCount + cancels30
  const churnRate = denom > 0 ? (cancels30 / denom) * 100 : 0
  const prevDenom = activeCount + cancels30 + cancelsPrev30 // aproximación para tendencia
  const churnPrev = prevDenom > 0 ? (cancelsPrev30 / prevDenom) * 100 : 0

  const newDelta = newPrev30 > 0 ? ((new30 - newPrev30) / newPrev30) * 100 : null
  const cancelsDelta = cancelsPrev30 > 0 ? ((cancels30 - cancelsPrev30) / cancelsPrev30) * 100 : null

  const series = monthSeries.map((row) => {
    const d = new Date(row.month)
    return {
      label: `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      newSubs: Number(row.new_subs),
      cancels: Number(row.cancels),
      revenue: Number(row.revenue ?? 0),
    }
  })
  const maxFlow = Math.max(1, ...series.map((s) => Math.max(s.newSubs, s.cancels)))
  const maxRev = Math.max(1, ...series.map((s) => s.revenue))

  const transactions = recentTxRows.map((t) => ({
    id: t.id,
    status: t.status,
    amount: t.amount !== null && t.amount !== undefined ? Number(t.amount) : null,
    currency: t.currency ?? "COP",
    paymentDate: t.paymentDate ? t.paymentDate.toISOString() : null,
    mercadopagoPaymentId: t.mercadopagoPaymentId,
    userEmail: t.user?.email ?? null,
    userName: t.user?.name ?? null,
  }))

  const statusOrder = ["active", "past_due", "paused", "cancelled", "inactive"]

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl uppercase font-heading text-zinc-900 mb-1">
          Estadísticas de suscripciones
        </h1>
        <p className="text-sm text-zinc-500">
          Visión general de ingresos recurrentes, altas, cancelaciones y pagos.
        </p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<DollarSign className="w-4 h-4" strokeWidth={1.5} />}
          color="bg-emerald-50 text-emerald-600"
          label="MRR (Ingresos recurrentes)"
          value={formatCOP(mrr)}
          hint={`${formatInt(activeCount)} activas / past_due`}
        />
        <KpiCard
          icon={<CreditCard className="w-4 h-4" strokeWidth={1.5} />}
          color="bg-blue-50 text-blue-600"
          label="Ingresos este mes"
          value={formatCOP(monthRevenue)}
          hint={`${formatInt(approvedTxCount)} pagos aprobados (histórico)`}
        />
        <KpiCard
          icon={<TrendingUp className="w-4 h-4" strokeWidth={1.5} />}
          color="bg-amber-50 text-amber-600"
          label="Nuevas suscripciones (30d)"
          value={formatInt(new30)}
          delta={newDelta}
        />
        <KpiCard
          icon={<TrendingDown className="w-4 h-4" strokeWidth={1.5} />}
          color="bg-rose-50 text-rose-600"
          label="Cancelaciones (30d)"
          value={formatInt(cancels30)}
          delta={cancelsDelta}
          deltaInverted
        />
      </div>

      {/* KPIs secundarios */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Activity className="w-4 h-4" strokeWidth={1.5} />}
          color="bg-purple-50 text-purple-600"
          label="Churn (30d)"
          value={`${churnRate.toFixed(1)}%`}
          hint={`Periodo anterior: ${churnPrev.toFixed(1)}%`}
        />
        <KpiCard
          icon={<DollarSign className="w-4 h-4" strokeWidth={1.5} />}
          color="bg-zinc-50 text-zinc-600"
          label="Ingresos totales"
          value={formatCOP(totalRevenue)}
        />
        <KpiCard
          icon={<AlertTriangle className="w-4 h-4" strokeWidth={1.5} />}
          color="bg-red-50 text-red-600"
          label="Pagos rechazados (30d)"
          value={formatInt(failed30)}
        />
        <KpiCard
          icon={<Users className="w-4 h-4" strokeWidth={1.5} />}
          color="bg-indigo-50 text-indigo-600"
          label="Pagos pendientes (30d)"
          value={formatInt(pending30)}
        />
      </div>

      {/* Distribución por plan y por estado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-zinc-200">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-100">
            <Package className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
            <h2 className="font-semibold text-zinc-900 text-sm">Activas por plan</h2>
          </div>
          <div className="p-6 space-y-4">
            {productCounts.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-4">Sin suscripciones activas</p>
            ) : (
              productCounts.map((p) => {
                const pct = activeCount > 0 ? (p.count / activeCount) * 100 : 0
                return (
                  <div key={p.slug}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div>
                        <span className="font-medium text-zinc-900">{p.title}</span>
                        <span className="text-xs text-zinc-400 ml-2 font-mono">{p.slug}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-zinc-900">{formatInt(p.count)}</span>
                        <span className="text-xs text-zinc-500 ml-2">({pct.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      MRR: {formatCOP(p.mrr)}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-100">
            <Users className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
            <h2 className="font-semibold text-zinc-900 text-sm">Usuarios por estado de suscripción</h2>
          </div>
          <div className="p-6 space-y-3">
            {statusOrder.map((key) => {
              const count = statusCounts[key] ?? 0
              const pct = totalUsers > 0 ? (count / totalUsers) * 100 : 0
              const info = SUBSCRIPTION_STATUS_LABELS[key]
              return (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${info.color}`}>
                      {info.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-zinc-900 text-sm">{formatInt(count)}</span>
                    <span className="text-xs text-zinc-500 ml-2">({pct.toFixed(1)}%)</span>
                  </div>
                </div>
              )
            })}
            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Total usuarios</span>
              <span className="font-semibold text-zinc-900 text-sm">{formatInt(totalUsers)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Serie mensual: altas, bajas, ingresos */}
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-100">
          <Activity className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
          <h2 className="font-semibold text-zinc-900 text-sm">Últimos 12 meses</h2>
          <div className="ml-auto flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-zinc-600">Altas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-zinc-600">Bajas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-zinc-600">Ingresos</span>
            </div>
          </div>
        </div>
        <div className="p-6 overflow-x-auto">
          <div className="flex items-end gap-3 min-w-[600px]" style={{ height: 180 }}>
            {series.map((s) => {
              const newPct = (s.newSubs / maxFlow) * 100
              const cancelPct = (s.cancels / maxFlow) * 100
              const revPct = (s.revenue / maxRev) * 100
              return (
                <div key={s.label} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end gap-1" style={{ height: 140 }}>
                    <div className="flex-1 bg-zinc-50 rounded-t relative overflow-hidden">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-emerald-500"
                        style={{ height: `${newPct}%` }}
                        title={`Altas: ${s.newSubs}`}
                      />
                    </div>
                    <div className="flex-1 bg-zinc-50 rounded-t relative overflow-hidden">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-rose-500"
                        style={{ height: `${cancelPct}%` }}
                        title={`Bajas: ${s.cancels}`}
                      />
                    </div>
                    <div className="flex-1 bg-zinc-50 rounded-t relative overflow-hidden">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-blue-500"
                        style={{ height: `${revPct}%` }}
                        title={`Ingresos: ${formatCOP(s.revenue)}`}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-500">{s.label}</span>
                  <div className="text-[10px] text-center leading-tight">
                    <div className="text-emerald-700 font-medium">{s.newSubs}</div>
                    <div className="text-rose-700">-{s.cancels}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Últimas transacciones */}
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-100">
          <Receipt className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
          <h2 className="font-semibold text-zinc-900 text-sm">Últimas transacciones</h2>
          <Link
            href="/admin/users"
            className="ml-auto text-xs text-zinc-500 hover:text-zinc-900"
          >
            Ver usuarios →
          </Link>
        </div>
        <div className="divide-y divide-zinc-50">
          {transactions.length === 0 ? (
            <p className="px-6 py-8 text-sm text-zinc-400 text-center">Aún no hay transacciones</p>
          ) : (
            transactions.map((tx) => {
              const statusInfo = PAYMENT_STATUS_LABELS[tx.status] ?? {
                label: tx.status,
                color: "bg-zinc-100 text-zinc-600",
              }
              const amountStr = tx.amount !== null
                ? tx.amount.toLocaleString("es-CO", {
                    style: "currency",
                    currency: tx.currency,
                    maximumFractionDigits: 0,
                  })
                : "—"
              const dateStr = tx.paymentDate
                ? new Date(tx.paymentDate).toLocaleDateString("es-CO", {
                    year: "numeric", month: "short", day: "2-digit",
                  })
                : "—"
              return (
                <div key={tx.id} className="flex items-center justify-between px-6 py-3 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {tx.userName || tx.userEmail || "Usuario eliminado"}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {tx.userEmail ?? "—"} · {dateStr}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold text-zinc-900">{amountStr}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    {tx.mercadopagoPaymentId && /^\d+$/.test(tx.mercadopagoPaymentId) && (
                      <a
                        href={`https://www.mercadopago.com.co/activities/payments/${tx.mercadopagoPaymentId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-400 hover:text-zinc-600 transition-colors"
                        title="Ver en Mercado Pago"
                      >
                        <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                      </a>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  icon,
  color,
  label,
  value,
  hint,
  delta,
  deltaInverted = false,
}: {
  icon: React.ReactNode
  color: string
  label: string
  value: string
  hint?: string
  delta?: number | null
  deltaInverted?: boolean
}) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta)
  const up = hasDelta && delta! > 0
  const good = deltaInverted ? !up : up
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        {hasDelta && delta !== 0 && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              good ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            }`}
          >
            {up ? "+" : ""}
            {delta!.toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-zinc-900 leading-tight">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
      {hint && <p className="text-xs text-zinc-400 mt-0.5">{hint}</p>}
    </div>
  )
}
