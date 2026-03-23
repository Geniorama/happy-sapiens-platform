"use client"

import { useState, useTransition } from "react"
import { Search, X, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"

interface LogEntry {
  id: string
  actor_email: string
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

interface PaymentEntry {
  id: string
  user_email: string | null
  status: string
  amount: number | null
  currency: string | null
  payment_method: string | null
  created_at: string
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  "user.created":                   { label: "Usuario creado",           color: "bg-green-100 text-green-700" },
  "user.deleted":                   { label: "Usuario eliminado",         color: "bg-red-100 text-red-700" },
  "user.bulk_deleted":              { label: "Eliminación masiva",        color: "bg-red-100 text-red-700" },
  "user.role_changed":              { label: "Rol cambiado",              color: "bg-purple-100 text-purple-700" },
  "user.subscription_changed":      { label: "Suscripción modificada",    color: "bg-blue-100 text-blue-700" },
  "user.bulk_subscription_changed": { label: "Suscripción masiva",        color: "bg-blue-100 text-blue-700" },
  "user.password_reset":            { label: "Contraseña reseteada",      color: "bg-amber-100 text-amber-700" },
}

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  approved: { label: "Aprobado",  color: "bg-green-100 text-green-700" },
  pending:  { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  rejected: { label: "Rechazado", color: "bg-red-100 text-red-700" },
  cancelled:{ label: "Cancelado", color: "bg-zinc-100 text-zinc-500" },
}

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_LABELS[action] ?? { label: action, color: "bg-zinc-100 text-zinc-600" }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function PaymentBadge({ status }: { status: string }) {
  const cfg = PAYMENT_STATUS_LABELS[status] ?? { label: status, color: "bg-zinc-100 text-zinc-600" }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function MetaDetail({ meta }: { meta: Record<string, unknown> }) {
  const parts: string[] = []
  if (meta.target_email) parts.push(`→ ${meta.target_email}`)
  if (meta.old_role && meta.new_role) parts.push(`${meta.old_role} → ${meta.new_role}`)
  if (meta.status && !meta.old_role) parts.push(String(meta.status))
  if (meta.count) parts.push(`${meta.count} usuario(s)`)
  if (meta.end_date) parts.push(`vence ${new Date(meta.end_date as string).toLocaleDateString("es-CO")}`)
  return <span className="text-xs text-zinc-400">{parts.join(" · ") || "—"}</span>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

const PAGE_SIZE = 50

interface LogsViewerProps {
  logs: LogEntry[]
  payments: PaymentEntry[]
}

export function LogsViewer({ logs, payments }: LogsViewerProps) {
  const [tab, setTab] = useState<"logs" | "payments">("logs")
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("todos")
  const [page, setPage] = useState(0)
  const [isPending, startTransition] = useTransition()

  // Filtros para logs
  const filteredLogs = logs.filter((l) => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || l.actor_email.toLowerCase().includes(q)
      || String(l.metadata?.target_email ?? "").toLowerCase().includes(q)
    const matchAction = actionFilter === "todos" || l.action === actionFilter
    return matchSearch && matchAction
  })

  // Filtros para pagos
  const filteredPayments = payments.filter((p) => {
    const q = search.toLowerCase()
    return !q || (p.user_email ?? "").toLowerCase().includes(q)
  })

  const activeList = tab === "logs" ? filteredLogs : filteredPayments
  const totalPages = Math.ceil(activeList.length / PAGE_SIZE)
  const pageItems = activeList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const resetFilters = () => {
    setSearch(""); setActionFilter("todos"); setPage(0)
  }

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)))

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-0 border-b border-zinc-200">
        <button
          onClick={() => { setTab("logs"); setPage(0) }}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
            tab === "logs" ? "border-amber-500 text-amber-700" : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Acciones admin
          <span className="ml-2 text-xs bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-full">{logs.length}</span>
        </button>
        <button
          onClick={() => { setTab("payments"); setPage(0) }}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
            tab === "payments" ? "border-amber-500 text-amber-700" : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Pagos
          <span className="ml-2 text-xs bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-full">{payments.length}</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder={tab === "logs" ? "Buscar por email del actor o afectado..." : "Buscar por email..."}
            className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        {tab === "logs" && (
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0) }}
            className="text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          >
            <option value="todos">Todas las acciones</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a]?.label ?? a}</option>
            ))}
          </select>
        )}
        {(search || actionFilter !== "todos") && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-500 border border-zinc-300 rounded-lg hover:bg-zinc-50 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-400">
        {activeList.length} registro(s){(search || actionFilter !== "todos") ? " filtrados" : ""}
      </p>

      {/* Tabla de logs */}
      {tab === "logs" && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          {pageItems.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-12">No hay registros</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">Acción</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">Administrador</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {(pageItems as LogEntry[]).map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">{formatDate(log.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><ActionBadge action={log.action} /></td>
                      <td className="px-4 py-3 text-xs text-zinc-600 whitespace-nowrap">{log.actor_email}</td>
                      <td className="px-4 py-3"><MetaDetail meta={log.metadata} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tabla de pagos */}
      {tab === "payments" && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          {pageItems.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-12">No hay registros de pagos</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Usuario</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">Monto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">Método</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {(pageItems as PaymentEntry[]).map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">{formatDate(p.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><PaymentBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-xs text-zinc-600">{p.user_email ?? "—"}</td>
                      <td className="px-4 py-3 text-xs font-medium text-zinc-700 whitespace-nowrap">
                        {p.amount != null
                          ? `${Number(p.amount).toLocaleString("es-CO")} ${p.currency ?? ""}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{p.payment_method ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-400">
            Página {page + 1} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-xs border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="flex items-center gap-1 px-3 py-1.5 text-xs border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Siguiente <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
