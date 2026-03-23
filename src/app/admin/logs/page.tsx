import { supabaseAdmin } from "@/lib/supabase"
import { LogsViewer } from "@/components/admin/logs-viewer"
import { ScrollText } from "lucide-react"

export default async function AdminLogsPage() {
  const [logsRes, paymentsRes] = await Promise.all([
    supabaseAdmin
      .from("system_logs")
      .select("id, actor_email, action, entity_type, entity_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabaseAdmin
      .from("payment_transactions")
      .select("id, status, amount, currency, payment_method, created_at, user_id, users(email)")
      .order("created_at", { ascending: false })
      .limit(500),
  ])

  const logs = logsRes.data ?? []

  const payments = (paymentsRes.data ?? []).map((p: any) => ({
    id: p.id,
    user_email: p.users?.email ?? null,
    status: p.status,
    amount: p.amount,
    currency: p.currency,
    payment_method: p.payment_method,
    created_at: p.created_at,
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

      <LogsViewer logs={logs as any} payments={payments} />
    </div>
  )
}
