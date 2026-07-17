import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import {
  Calendar, Check, Sparkles, Package, CreditCard, RefreshCw,
  Receipt, ExternalLink, ShoppingBag, Clock, Settings2, AlertTriangle, Plus,
} from "lucide-react"

import Link from "next/link"
import { SectionCover } from "@/components/dashboard/section-cover"
import { getSubscriptionPlansMap } from "@/lib/mercadopago"
import { getShopifyOrdersByEmail } from "@/lib/shopify"
import { OrdersList } from "@/components/dashboard/orders-list"

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

const SUB_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Activa", color: "bg-green-100 text-green-700" },
  inactive: { label: "Inactiva", color: "bg-zinc-100 text-zinc-700" },
  paused: { label: "Pausada", color: "bg-yellow-100 text-yellow-700" },
  cancelled: { label: "Cancelada", color: "bg-orange-100 text-orange-700" },
  past_due: { label: "Pago Atrasado", color: "bg-red-100 text-red-700" },
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
}

// Orden de despliegue: primero las vigentes, luego pausadas/pendientes, al final las inactivas.
const STATUS_ORDER = ["active", "past_due", "paused", "pending", "cancelled", "inactive"]

function fmtDate(d: Date | null): string {
  return d ? d.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" }) : "—"
}

function fmtCurrency(value: number | null): string {
  return value !== null
    ? value.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
    : "—"
}

export default async function SubscriptionPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const [userRow, subscriptionRows, transactionRows, coverRow, plansMap] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    }),
    prisma.subscription.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.paymentTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { paymentDate: "desc" },
      take: 20,
    }),
    prisma.sectionCover.findFirst({
      where: { sectionKey: "subscription", isActive: true },
      select: { title: true, subtitle: true, imageUrl: true },
    }),
    getSubscriptionPlansMap(),
  ])

  const subscriptions = subscriptionRows
    .map((s) => {
      const plan = s.product ? plansMap[s.product] : null
      return {
        id: s.id,
        status: s.status,
        product: s.product,
        productLabel: (s.product && PRODUCT_LABELS[s.product]) || plan?.title || "Suscripción",
        price: s.price !== null && s.price !== undefined ? Number(s.price) : plan?.price ?? null,
        startDate: s.startDate,
        endDate: s.endDate,
        pauseEndsAt: s.pauseEndsAt,
        mpPreapprovalId: s.mpPreapprovalId,
      }
    })
    .sort((a, b) => {
      const ai = STATUS_ORDER.indexOf(a.status)
      const bi = STATUS_ORDER.indexOf(b.status)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })

  const transactions = transactionRows.map((t) => ({
    id: t.id,
    status: t.status,
    amount: t.amount !== null && t.amount !== undefined ? Number(t.amount) : null,
    currency: t.currency,
    payment_method: t.paymentMethod,
    payment_date: t.paymentDate ? t.paymentDate.toISOString() : null,
    mercadopago_payment_id: t.mercadopagoPaymentId,
  }))

  const shopifyOrders = userRow?.email ? await getShopifyOrdersByEmail(userRow.email) : []

  const cover = coverRow
    ? { title: coverRow.title, subtitle: coverRow.subtitle, image_url: coverRow.imageUrl }
    : null

  const hasAnySubscription = subscriptions.length > 0

  return (
    <div>
      <SectionCover
        title={cover?.title || ""}
        subtitle={cover?.subtitle || ""}
        imageUrl={cover?.image_url}
        fallbackTitle="Mi Suscripción"
        fallbackSubtitle="Estado de tus suscripciones, pedidos y pagos"
      />
      <div className="max-w-7xl mx-auto">

      <div className="space-y-4 sm:space-y-6">

        {/* Encabezado + agregar */}
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-heading text-zinc-900">
            {subscriptions.length > 1 ? "Mis Suscripciones" : "Mi Suscripción"}
          </h2>
          {hasAnySubscription && (
            <Link
              href="/dashboard/subscription/add"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-full hover:bg-primary/90 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Agregar suscripción
            </Link>
          )}
        </div>

        {/* Lista de suscripciones */}
        {subscriptions.map((sub) => {
          const statusInfo = SUB_STATUS_LABELS[sub.status] ?? SUB_STATUS_LABELS.inactive
          const isActive = sub.status === "active" || sub.status === "past_due"
          const isPaused = sub.status === "paused"

          return (
            <div key={sub.id} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
              <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                    <Package className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-base sm:text-lg font-heading text-zinc-900 truncate">{sub.productLabel}</h3>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shrink-0 ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>

              {/* Banner past_due */}
              {sub.status === "past_due" && (
                <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <h4 className="font-semibold text-red-800 mb-1">Esta suscripción tiene un pago pendiente</h4>
                    <p className="text-sm text-red-700 mb-3">
                      No pudimos procesar tu último cobro. Los próximos envíos están suspendidos hasta regularizar el pago.
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

              {(isActive || isPaused) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                    <CreditCard className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
                    <div>
                      <p className="text-xs text-zinc-500 mb-0.5">Valor mensual</p>
                      <p className="font-medium text-zinc-900">{fmtCurrency(sub.price)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                    <Calendar className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
                    <div>
                      <p className="text-xs text-zinc-500 mb-0.5">Inicio</p>
                      <p className="font-medium text-zinc-900">{fmtDate(sub.startDate)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                    <RefreshCw className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
                    <div>
                      <p className="text-xs text-zinc-500 mb-0.5">Próximo cobro</p>
                      <p className="font-medium text-zinc-900">{fmtDate(sub.endDate)}</p>
                    </div>
                  </div>
                </div>
              )}

              {isPaused && sub.pauseEndsAt && (
                <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200 mt-4">
                  <Clock className="w-4 h-4 text-yellow-600 shrink-0" strokeWidth={1.5} />
                  <div>
                    <p className="text-xs text-yellow-700 mb-0.5">Reactivación automática</p>
                    <p className="font-medium text-yellow-900">
                      {sub.pauseEndsAt.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                </div>
              )}

              {sub.status === "cancelled" && (
                <p className="text-sm text-orange-700">Esta suscripción fue cancelada.</p>
              )}

              {(isActive || isPaused) && (
                <div className="pt-4 flex justify-end">
                  <Link
                    href={`/dashboard/subscription/manage?sub=${sub.id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    <Settings2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Gestionar suscripción
                  </Link>
                </div>
              )}
            </div>
          )
        })}

        {/* Estado sin suscripciones */}
        {!hasAnySubscription && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
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
          </div>
        )}

        {/* Pedidos */}
        {shopifyOrders.length > 0 && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <ShoppingBag className="w-5 h-5 text-zinc-500" strokeWidth={1.5} />
              <h2 className="text-lg sm:text-xl lg:text-2xl font-heading text-zinc-900">Mis Pedidos</h2>
            </div>
            <OrdersList
              orders={shopifyOrders.map((o) => ({
                id: o.id,
                order_number: o.order_number,
                created_at: o.created_at,
                closed_at: o.closed_at,
                fulfillment_status: o.fulfillment_status,
                line_items: o.line_items,
              }))}
              pageSize={5}
            />
          </div>
        )}

        {/* Transacciones */}
        {transactions.length > 0 && (
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
