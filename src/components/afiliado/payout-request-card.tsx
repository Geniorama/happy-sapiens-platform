"use client"

import { useState, useTransition } from "react"
import { Banknote, Clock, CheckCircle2, XCircle } from "lucide-react"
import { requestPayout } from "@/app/afiliado/actions"

interface PayoutRow {
  id: string
  amount: number
  status: string
  payoutMethod: string | null
  adminNote: string | null
  createdAt: string
  resolvedAt: string | null
}

interface PayoutRequestCardProps {
  availableBalance: number
  pendingPayout: number
  totalPaid: number
  payouts: PayoutRow[]
}

function formatCOP(value: number): string {
  return `$${Math.round(value).toLocaleString("es-CO")}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })
}

const STATUS_META: Record<string, { label: string; className: string; Icon: typeof Clock }> = {
  pending: { label: "Pendiente", className: "bg-amber-50 text-amber-700 border-amber-200", Icon: Clock },
  paid: { label: "Pagado", className: "bg-green-50 text-green-700 border-green-200", Icon: CheckCircle2 },
  rejected: { label: "Rechazado", className: "bg-red-50 text-red-700 border-red-200", Icon: XCircle },
}

export function PayoutRequestCard({
  availableBalance,
  pendingPayout,
  totalPaid,
  payouts,
}: PayoutRequestCardProps) {
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("")
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const canRequest = availableBalance > 0

  const submit = () => {
    setMessage(null)
    const amt = Math.round(Number(amount))
    if (!Number.isFinite(amt) || amt <= 0) {
      setMessage({ type: "error", text: "Ingresa un monto válido" })
      return
    }
    if (amt > availableBalance) {
      setMessage({ type: "error", text: "El monto supera tu saldo disponible" })
      return
    }
    if (!method.trim()) {
      setMessage({ type: "error", text: "Indica cómo quieres recibir el pago (Nequi, cuenta, etc.)" })
      return
    }

    startTransition(async () => {
      const res = await requestPayout({ amount: amt, payoutMethod: method.trim() })
      if ("error" in res) {
        setMessage({ type: "error", text: res.error })
      } else {
        setMessage({ type: "ok", text: "Solicitud enviada. El equipo procesará tu retiro." })
        setAmount("")
        setMethod("")
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Banknote className="w-5 h-5 text-primary" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-lg font-heading text-zinc-900">Redimir saldo</h2>
          <p className="text-sm text-zinc-600">
            Disponible: <span className="font-semibold text-zinc-900">{formatCOP(availableBalance)}</span>
            {pendingPayout > 0 && (
              <span className="text-amber-600"> · {formatCOP(pendingPayout)} en trámite</span>
            )}
            {totalPaid > 0 && <span className="text-zinc-400"> · {formatCOP(totalPaid)} pagado</span>}
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Monto (COP)</label>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!canRequest || isPending}
            placeholder="0"
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-zinc-50 disabled:cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">
            ¿Cómo quieres recibirlo?
          </label>
          <input
            type="text"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            disabled={!canRequest || isPending}
            placeholder="Nequi 300..., Bancolombia ahorros 123..., etc."
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-zinc-50 disabled:cursor-not-allowed"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={submit}
            disabled={!canRequest || isPending}
            className="w-full sm:w-auto px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? "Enviando..." : "Solicitar"}
          </button>
        </div>
      </div>

      {!canRequest && (
        <p className="mt-3 text-xs text-zinc-500">
          Aún no tienes saldo disponible para redimir.
        </p>
      )}

      {message && (
        <p
          className={`mt-3 text-sm ${
            message.type === "ok" ? "text-green-700" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Historial de solicitudes */}
      {payouts.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-zinc-900 mb-3">Historial de retiros</h3>
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 overflow-hidden">
            {payouts.map((p) => {
              const meta = STATUS_META[p.status] ?? STATUS_META.pending
              const Icon = meta.Icon
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">{formatCOP(p.amount)}</p>
                    <p className="text-xs text-zinc-500 truncate">
                      Solicitado el {formatDate(p.createdAt)}
                      {p.payoutMethod ? ` · ${p.payoutMethod}` : ""}
                    </p>
                    {p.adminNote && <p className="text-xs text-zinc-400 truncate">Nota: {p.adminNote}</p>}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium shrink-0 ${meta.className}`}
                  >
                    <Icon className="w-3 h-3" strokeWidth={2} />
                    {meta.label}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
