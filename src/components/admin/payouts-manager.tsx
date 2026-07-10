"use client"

import { useState, useTransition } from "react"
import { Check, X, Banknote } from "lucide-react"
import { resolveAffiliatePayout } from "@/app/admin/afiliados/actions"

interface PendingPayout {
  id: string
  amount: number
  payoutMethod: string | null
  createdAt: string
  affiliate: { id: string; name: string | null; email: string | null } | null
}

function formatCOP(value: number): string {
  return `$${Math.round(value).toLocaleString("es-CO")}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })
}

export function PayoutsManager({ payouts }: { payouts: PendingPayout[] }) {
  const [items, setItems] = useState(payouts)
  const [note, setNote] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [activeId, setActiveId] = useState<string | null>(null)

  const resolve = (id: string, action: "paid" | "rejected") => {
    setError(null)
    setActiveId(id)
    startTransition(async () => {
      const res = await resolveAffiliatePayout(id, action, note[id])
      if ("error" in res) {
        setError(res.error)
      } else {
        setItems((prev) => prev.filter((p) => p.id !== id))
      }
      setActiveId(null)
    })
  }

  if (items.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-sm text-zinc-400">
        No hay solicitudes de retiro pendientes.
      </div>
    )
  }

  return (
    <div>
      {error && <p className="px-6 pt-4 text-sm text-red-600">{error}</p>}
      <ul className="divide-y divide-zinc-100">
        {items.map((p) => {
          const name = p.affiliate?.name || p.affiliate?.email || "Afiliado"
          const busy = isPending && activeId === p.id
          return (
            <li key={p.id} className="px-6 py-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
                    <span className="text-sm font-semibold text-zinc-900">{formatCOP(p.amount)}</span>
                    <span className="text-sm text-zinc-500 truncate">· {name}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">
                    {p.affiliate?.email ?? "—"} · Solicitado el {formatDate(p.createdAt)}
                  </p>
                  {p.payoutMethod && (
                    <p className="text-xs text-zinc-600 mt-0.5">
                      Método: <span className="font-medium">{p.payoutMethod}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    value={note[p.id] ?? ""}
                    onChange={(e) => setNote((n) => ({ ...n, [p.id]: e.target.value }))}
                    placeholder="Nota (opcional)"
                    disabled={busy}
                    className="text-sm border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 w-40 sm:w-48"
                  />
                  <button
                    onClick={() => resolve(p.id, "paid")}
                    disabled={busy}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer"
                    title="Marcar como pagado"
                  >
                    <Check className="w-4 h-4" strokeWidth={2} />
                    Pagado
                  </button>
                  <button
                    onClick={() => resolve(p.id, "rejected")}
                    disabled={busy}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-zinc-300 text-zinc-700 text-sm font-medium rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50 cursor-pointer"
                    title="Rechazar solicitud"
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                    Rechazar
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
