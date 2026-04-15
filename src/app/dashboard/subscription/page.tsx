import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import {
  Calendar, Check, Sparkles, Package, CreditCard, RefreshCw,
  BadgeCheck, Receipt, ExternalLink, ShoppingBag, Truck, Clock, Settings2, AlertTriangle,
} from "lucide-react"

import Link from "next/link"
import { SectionCover } from "@/components/dashboard/section-cover"
import { SUBSCRIPTION_PLANS } from "@/lib/mercadopago"
import { getShopifyOrdersByEmail } from "@/lib/shopify"

const PRODUCT_LABELS: Record<string, string> = {
  "happy-on": "Happy On",
  "happy-off": "Happy Off",
  "happy-blend": "Happy Blend",
}

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  approved: { label: "Aprobado", color: "bg-green-100 text-green-700" },
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  rejected: { label: "Rechazado", color: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelado", color: "bg-zinc-100 text-zinc-600" },
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  credit_card: "Tarjeta de crédito",
  debit_card: "Tarjeta débito",
  bank_transfer: "Transferencia bancaria",
  ticket: "Efectivo",
  account_money: "Dinero en cuenta MP",
}

const FULFILLMENT_STATUS: Record<string, { label: string; color: string; truck: boolean }> = {
  fulfilled: { label: "Despachado", color: "bg-green-100 text-green-700", truck: true },
  partial: { label: "Parcial", color: "bg-yellow-100 text-yellow-700", truck: true },
  pending: { label: "Pendiente despacho", color: "bg-orange-100 text-orange-700", truck: false },
  archived: { label: "Archivado", color: "bg-zinc-100 text-zinc-500", truck: false },
}

export default async function SubscriptionPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const userRow = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  const user = userRow
    ? {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        image: userRow.image,
        subscription_status: userRow.subscriptionStatus,
        subscription_id: userRow.subscriptionId,
        subscription_start_date: userRow.subscriptionStartDate
          ? userRow.subscriptionStartDate.toISOString()
          : null,
        subscription_end_date: userRow.subscriptionEndDate
          ? userRow.subscriptionEndDate.toISOString()
          : null,
        subscription_price: userRow.subscriptionPrice ? Number(userRow.subscriptionPrice) : null,
        subscription_product: userRow.subscriptionProduct,
        subscription_pause_ends_at: userRow.subscriptionPauseEndsAt
          ? userRow.subscriptionPauseEndsAt.toISOString()
          : null,
      }
    : null

  const transactionRows = await prisma.paymentTransaction.findMany({
    where: { userId: session.user.id },
    orderBy: { paymentDate: "desc" },
    take: 20,
  })

  const transactions = transactionRows.map((t) => ({
    id: t.id,
    status: t.status,
    amount: t.amount !== null && t.amount !== undefined ? Number(t.amount) : null,
    currency: t.currency,
    payment_method: t.paymentMethod,
    payment_date: t.paymentDate ? t.paymentDate.toISOString() : null,
    mercadopago_payment_id: t.mercadopagoPaymentId,
    created_at: t.createdAt.toISOString(),
  }))

  const shopifyOrders = user?.email ? await getShopifyOrdersByEmail(user.email) : []

  const coverRow = await prisma.sectionCover.findFirst({
    where: { sectionKey: "subscription", isActive: true },
    select: { title: true, subtitle: true, imageUrl: true, isActive: true },
  })

  const cover = coverRow
    ? {
        title: coverRow.title,
        subtitle: coverRow.subtitle,
        image_url: coverRow.imageUrl,
        is_active: coverRow.isActive,
      }
    : null

  const subscriptionStatusLabels: Record<string, { label: string; color: string }> = {
    active: { label: "Activa", color: "bg-green-100 text-green-700" },
    inactive: { label: "Inactiva", color: "bg-zinc-100 text-zinc-700" },
    paused: { label: "Pausada", color: "bg-yellow-100 text-yellow-700" },
    cancelled: { label: "Cancelada", color: "bg-orange-100 text-orange-700" },
    past_due: { label: "Pago Atrasado", color: "bg-red-100 text-red-700" },
  }

  const subscriptionStatus = user?.subscription_status || "inactive"
  const statusInfo = subscriptionStatusLabels[subscriptionStatus] ?? subscriptionStatusLabels.inactive
  const subscriptionPlan = user?.subscription_product ? SUBSCRIPTION_PLANS[user.subscription_product] : null
  const isActive = subscriptionStatus === "active" || subscriptionStatus === "past_due"
  const isPaused = subscriptionStatus === "paused"

  return (
    <div>
      <SectionCover
        title={cover?.title || ""}
        subtitle={cover?.subtitle || ""}
        imageUrl={cover?.image_url}
        fallbackTitle="Mi Suscripción"
        fallbackSubtitle="Estado de tu suscripción, pedidos y pagos"
      />
      <div className="max-w-7xl mx-auto">

      <div className="space-y-4 sm:space-y-6">

        {/* Banner past_due */}
        {subscriptionStatus === "past_due" && (
          <div className="flex items-start gap-4 p-5 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-semibold text-red-800 mb-1">Tu suscripción tiene un pago pendiente</h3>
              <p className="text-sm text-red-700 mb-3">
                No pudimos procesar tu último cobro. Tu acceso a la plataforma y los próximos envíos están suspendidos hasta regularizar el pago.
              </p>
              <a
                href="https://www.mercadopago.com.co/subscriptions"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Actualizar método de pago en Mercado Pago
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Estado de la suscripción */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-heading text-zinc-900">Suscripción</h2>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          {isActive && (
            <div className="space-y-4">
              {subscriptionPlan && (
                <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                    <Package className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Producto</p>
                    <p className="font-medium text-zinc-900">
                      {PRODUCT_LABELS[user?.subscription_product ?? ""] ?? subscriptionPlan.title}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Valor mensual</p>
                    <p className="font-medium text-zinc-900">
                      {user?.subscription_price
                        ? Number(user.subscription_price).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
                        : subscriptionPlan
                        ? subscriptionPlan.price.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Inicio</p>
                    <p className="font-medium text-zinc-900">
                      {user?.subscription_start_date
                        ? new Date(user.subscription_start_date).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Próximo cobro</p>
                    <p className="font-medium text-zinc-900">
                      {user?.subscription_end_date
                        ? new Date(user.subscription_end_date).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {user?.subscription_id && (
                <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                    <BadgeCheck className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500 mb-0.5">ID de suscripción (Mercado Pago)</p>
                    <p className="font-mono text-xs text-zinc-600 truncate">{user.subscription_id}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {isPaused && user?.subscription_pause_ends_at && (
            <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex-shrink-0 w-9 h-9 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs text-yellow-700 mb-0.5">Reactivación automática</p>
                <p className="font-medium text-yellow-900">
                  {new Date(user.subscription_pause_ends_at).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>
          )}

          {(isActive || isPaused) && (
            <div className="pt-2 flex justify-end">
              <Link
                href="/dashboard/subscription/manage"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <Settings2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                Gestionar suscripción
              </Link>
            </div>
          )}

          {subscriptionStatus === "cancelled" && (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-700">
                Tu suscripción fue cancelada. Si deseas volver, puedes suscribirte nuevamente.
              </p>
              <a href="/subscribe" className="inline-block mt-3 px-5 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
                Suscribirse de nuevo
              </a>
            </div>
          )}

          {subscriptionStatus === "inactive" && (
            <div className="p-6 bg-secondary/30 rounded-lg border border-secondary">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-heading text-lg text-zinc-900 mb-1">Desbloquea todo el potencial</h3>
                  <p className="text-sm text-zinc-600 mb-4">Suscríbete para acceder a todas las funcionalidades de la plataforma.</p>
                  <ul className="space-y-2 text-sm text-zinc-600 mb-4">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" strokeWidth={2} />Acceso completo a todos los módulos</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" strokeWidth={2} />Sin límites ni restricciones</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" strokeWidth={2} />Cancela cuando quieras</li>
                  </ul>
                  <a href="/subscribe" className="inline-block px-6 py-2.5 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
                    Suscribirse
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pedidos */}
        {shopifyOrders.length > 0 && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <ShoppingBag className="w-5 h-5 text-zinc-500" strokeWidth={1.5} />
              <h2 className="text-lg sm:text-xl lg:text-2xl font-heading text-zinc-900">Mis Pedidos</h2>
            </div>
            <div className="space-y-3">
              {shopifyOrders.map((order) => {
                const fulfillmentKey = order.closed_at
                  ? "archived"
                  : (order.fulfillment_status ?? "pending")
                const fulfillment = FULFILLMENT_STATUS[fulfillmentKey] ?? FULFILLMENT_STATUS.pending
                const FulfillIcon = fulfillment.truck ? Truck : Clock
                const product = order.line_items[0]
                const orderDate = new Date(order.created_at).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })
                const amount = product
                  ? Number(product.price).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
                  : "—"

                return (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-200 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 text-sm">Pedido #{order.order_number} · {product?.title ?? "—"}</p>
                        <p className="text-xs text-zinc-500">{orderDate} · {amount}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${fulfillment.color}`}>
                      <FulfillIcon className="w-3 h-3" strokeWidth={2} />
                      {fulfillment.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Transacciones */}
        {transactions && transactions.length > 0 && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Receipt className="w-5 h-5 text-zinc-500" strokeWidth={1.5} />
              <h2 className="text-lg sm:text-xl lg:text-2xl font-heading text-zinc-900">Transacciones</h2>
            </div>
            <div className="space-y-3">
              {transactions.map((tx) => {
                const txStatus = PAYMENT_STATUS_LABELS[tx.status] ?? { label: tx.status, color: "bg-zinc-100 text-zinc-600" }
                const txDate = tx.payment_date
                  ? new Date(tx.payment_date).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })
                  : "—"
                const txAmount = tx.amount
                  ? Number(tx.amount).toLocaleString("es-CO", { style: "currency", currency: tx.currency ?? "COP", maximumFractionDigits: 0 })
                  : "—"
                const txMethod = PAYMENT_METHOD_LABELS[tx.payment_method ?? ""] ?? tx.payment_method ?? "—"

                return (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-200 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 text-sm">{txAmount}</p>
                        <p className="text-xs text-zinc-500">{txDate} · {txMethod}</p>
                        {tx.mercadopago_payment_id && (
                          <p className="font-mono text-xs text-zinc-400 truncate">ID: {tx.mercadopago_payment_id}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${txStatus.color}`}>
                        {txStatus.label}
                      </span>
                      {tx.mercadopago_payment_id && /^\d+$/.test(tx.mercadopago_payment_id) && (
                        <a
                          href={`https://www.mercadopago.com.co/activities/payments/${tx.mercadopago_payment_id}`}
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
              })}
            </div>
          </div>
        )}

      </div>
      </div>
    </div>
  )
}
