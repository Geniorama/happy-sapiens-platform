import { prisma } from "@/lib/db"
import { LogsViewer } from "@/components/admin/logs-viewer"

export default async function AdminLogsPage() {
  const [logRows, paymentRows] = await Promise.all([
    prisma.systemLog.findMany({
      select: {
        id: true,
        actorEmail: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.paymentTransaction.findMany({
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        createdAt: true,
        userId: true,
        user: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ])

  const logs = logRows.map((l) => ({
    id: l.id,
    actor_email: l.actorEmail,
    action: l.action,
    entity_type: l.entityType,
    entity_id: l.entityId,
    metadata: (l.metadata ?? {}) as Record<string, unknown>,
    created_at: l.createdAt.toISOString(),
  }))

  const payments = paymentRows.map((p) => ({
    id: p.id,
    user_email: p.user?.email ?? null,
    status: p.status,
    amount: p.amount !== null && p.amount !== undefined ? Number(p.amount) : null,
    currency: p.currency,
    payment_method: p.paymentMethod,
    created_at: p.createdAt.toISOString(),
  }))

  // Stats rápidas
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const logsToday = logs.filter((l) => new Date(l.created_at) >= today).length
  const paymentsApproved = payments.filter((p) => p.status === "approved").length

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl uppercase font-heading text-zinc-900 mb-1">
          Logs del Sistema
        </h1>
        <p className="text-sm text-zinc-500">Historial de acciones administrativas y pagos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Acciones totales",  value: logs.length },
          { label: "Acciones hoy",      value: logsToday },
          { label: "Pagos registrados", value: payments.length },
          { label: "Pagos aprobados",   value: paymentsApproved },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-2xl font-bold text-zinc-900">{s.value.toLocaleString()}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <LogsViewer logs={logs} payments={payments} />
    </div>
  )
}
