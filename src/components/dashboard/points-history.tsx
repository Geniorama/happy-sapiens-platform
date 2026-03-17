"use client"

import { TrendingUp, TrendingDown } from "lucide-react"

interface PointTransaction {
  id: string
  amount: number
  action_type: string
  description: string | null
  created_at: string
}

interface PointsHistoryProps {
  transactions: PointTransaction[]
  actionLabels: Record<string, string>
}

export function PointsHistory({ transactions, actionLabels }: PointsHistoryProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-zinc-400">
        <p className="text-sm">Aún no tienes transacciones de puntos.</p>
        <p className="text-xs mt-1">Completa acciones en la plataforma para comenzar a ganar.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-zinc-100">
      {transactions.map((tx) => {
        const isPositive = tx.amount > 0
        const label = actionLabels[tx.action_type] ?? tx.action_type
        const date = new Date(tx.created_at)
        const formatted = date.toLocaleDateString("es-AR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })

        return (
          <div key={tx.id} className="flex items-center gap-3 py-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isPositive ? "bg-green-50" : "bg-red-50"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-800 truncate">
                {tx.description || label}
              </p>
              <p className="text-xs text-zinc-400">{formatted}</p>
            </div>
            <span
              className={`text-sm font-semibold shrink-0 ${
                isPositive ? "text-green-600" : "text-red-500"
              }`}
            >
              {isPositive ? "+" : ""}
              {tx.amount.toLocaleString()} pts
            </span>
          </div>
        )
      })}
    </div>
  )
}
