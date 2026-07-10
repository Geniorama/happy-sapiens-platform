"use client"

import { useEffect, useState } from "react"
import { Loader2, Package, History, Receipt, ExternalLink } from "lucide-react"
import {
  getUserSubscriptionDetail,
  type UserSubscriptionDetail as Detail,
} from "@/app/admin/users/actions"

const SUB_STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  past_due: "Pago atrasado",
  paused: "Pausada",
  cancelled: "Cancelada",
  inactive: "Inactiva",
}

const PAY_STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-zinc-100 text-zinc-600",
}

function formatMoney(value: number | null, currency = "COP"): string {
  if (value == null) return "—"
  return value.toLocaleString("es-CO", { style: "currency", currency, maximumFractionDigits: 0 })
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "2-digit" })
}

export function UserSubscriptionDetail({ userId }: { userId: string }) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getUserSubscriptionDetail(userId).then((res) => {
      if (!active) return
      if ("error" in res) setError(res.error)
      else setDetail(res.data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500 py-6">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando suscripción...
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-600 py-4">{error}</p>
  }

  if (!detail) return null

  const { current, history, payments } = detail

  return (
    <div className="space-y-5">
      {/* Plan actual */}
      <div className="rounded-lg border border-zinc-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-50 border-b border-zinc-100">
          <Package className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
          <span className="text-xs font-semibold text-zinc-700">Suscripción actual</span>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 p-4 text-sm">
          <div>
            <dt className="text-xs text-zinc-500">Plan</dt>
            <dd className="text-zinc-900 font-medium">
              {current.planTitle || current.productSlug || "—"}
            </dd>
            {current.planTitle && current.productSlug && (
              <span className="text-xs text-zinc-400 font-mono">{current.productSlug}</span>
            )}
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Estado</dt>
            <dd className="text-zinc-900">
              {current.status ? SUB_STATUS_LABELS[current.status] ?? current.status : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Precio</dt>
            <dd className="text-zinc-900">{formatMoney(current.price)}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Inicio</dt>
            <dd className="text-zinc-900">{formatDate(current.startDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Vencimiento</dt>
            <dd className="text-zinc-900">{formatDate(current.endDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Exenta de IVA</dt>
            <dd className="text-zinc-900">{current.taxExempt ? "Sí" : "No"}</dd>
          </div>
          {current.subscriptionId && (
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-xs text-zinc-500">ID de suscripción (MP)</dt>
              <dd className="text-zinc-700 font-mono text-xs break-all">{current.subscriptionId}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Historial de suscripción */}
      <div className="rounded-lg border border-zinc-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-50 border-b border-zinc-100">
          <History className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
          <span className="text-xs font-semibold text-zinc-700">Historial de suscripción</span>
        </div>
        {history.length === 0 ? (
          <p className="px-4 py-4 text-xs text-zinc-400 text-center">Sin cambios registrados</p>
        ) : (
          <ul className="divide-y divide-zinc-50">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-900">{h.action}</p>
                  <p className="text-xs text-zinc-500">
                    {h.previousStatus || "—"} → {h.newStatus || "—"}
                    {h.notes ? ` · ${h.notes}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {h.amount != null && (
                    <p className="text-sm text-zinc-700">{formatMoney(h.amount)}</p>
                  )}
                  <p className="text-xs text-zinc-400">{formatDate(h.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagos */}
      <div className="rounded-lg border border-zinc-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-50 border-b border-zinc-100">
          <Receipt className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
          <span className="text-xs font-semibold text-zinc-700">Pagos</span>
        </div>
        {payments.length === 0 ? (
          <p className="px-4 py-4 text-xs text-zinc-400 text-center">Sin pagos registrados</p>
        ) : (
          <ul className="divide-y divide-zinc-50">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900">
                    {formatMoney(p.amount, p.currency ?? "COP")}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatDate(p.paymentDate)}
                    {p.paymentMethod ? ` · ${p.paymentMethod}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      PAY_STATUS_COLORS[p.status] ?? "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {p.status}
                  </span>
                  {p.mercadopagoPaymentId && /^\d+$/.test(p.mercadopagoPaymentId) && (
                    <a
                      href={`https://www.mercadopago.com.co/activities/payments/${p.mercadopagoPaymentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-zinc-600"
                      title="Ver en Mercado Pago"
                    >
                      <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
