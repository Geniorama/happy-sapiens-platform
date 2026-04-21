"use client"

import { useMemo, useState } from "react"
import { Package, Truck, Clock, ChevronLeft, ChevronRight } from "lucide-react"

export type OrderItem = {
  id: number
  order_number: number
  created_at: string
  closed_at: string | null
  fulfillment_status: string | null
  line_items: { title: string; price: string; quantity: number }[]
}

const FULFILLMENT_STATUS: Record<string, { label: string; color: string; truck: boolean }> = {
  fulfilled: { label: "Despachado", color: "bg-green-100 text-green-700", truck: true },
  partial: { label: "Parcial", color: "bg-yellow-100 text-yellow-700", truck: true },
  pending: { label: "Pendiente despacho", color: "bg-orange-100 text-orange-700", truck: false },
  archived: { label: "Archivado", color: "bg-zinc-100 text-zinc-500", truck: false },
}

type Props = {
  orders: OrderItem[]
  pageSize?: number
}

export function OrdersList({ orders, pageSize = 5 }: Props) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize))
  const currentPage = Math.min(page, totalPages)

  const pageOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return orders.slice(start, start + pageSize)
  }, [orders, currentPage, pageSize])

  const goTo = (next: number) => {
    const clamped = Math.max(1, Math.min(totalPages, next))
    setPage(clamped)
  }

  return (
    <div>
      <div className="space-y-3">
        {pageOrders.map((order) => {
          const fulfillmentKey = order.closed_at
            ? "archived"
            : (order.fulfillment_status ?? "pending")
          const fulfillment = FULFILLMENT_STATUS[fulfillmentKey] ?? FULFILLMENT_STATUS.pending
          const FulfillIcon = fulfillment.truck ? Truck : Clock
          const product = order.line_items[0]
          const orderDate = new Date(order.created_at).toLocaleDateString("es-CO", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
          const amount = product
            ? Number(product.price).toLocaleString("es-CO", {
                style: "currency",
                currency: "COP",
                maximumFractionDigits: 0,
              })
            : "—"

          return (
            <div
              key={order.id}
              className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-200 gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                  <Package className="w-4 h-4 text-primary" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900 text-sm">
                    Pedido #{order.order_number} · {product?.title ?? "—"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {orderDate} · {amount}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${fulfillment.color}`}
              >
                <FulfillIcon className="w-3 h-3" strokeWidth={2} />
                {fulfillment.label}
              </span>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-xs text-zinc-500">
            Página <span className="font-medium text-zinc-700">{currentPage}</span> de{" "}
            <span className="font-medium text-zinc-700">{totalPages}</span> · {orders.length} pedidos
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goTo(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Página anterior"
              className="p-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => goTo(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Página siguiente"
              className="p-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
