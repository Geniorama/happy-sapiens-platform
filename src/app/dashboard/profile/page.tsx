import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { Calendar, Mail, Hash, Check, Sparkles, Package, CreditCard, RefreshCw, BadgeCheck, Receipt, ExternalLink, ShoppingBag, Truck, Clock } from "lucide-react"
import { ProfileForm } from "@/components/dashboard/profile-form"
import { AvatarUpload } from "@/components/dashboard/avatar-upload"
import { ReferralCode } from "@/components/dashboard/referral-code"
import { HealthProfileForm } from "@/components/dashboard/health-profile-form"
import { getHealthProfile } from "@/app/dashboard/coaches/actions"
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

const FULFILLMENT_STATUS: Record<string, { label: string; color: string; icon: string }> = {
  fulfilled: { label: "Despachado", color: "bg-green-100 text-green-700", icon: "truck" },
  partial: { label: "Parcial", color: "bg-yellow-100 text-yellow-700", icon: "truck" },
  pending: { label: "Pendiente", color: "bg-zinc-100 text-zinc-600", icon: "clock" },
}

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", session.user.id)
    .single()

  const { data: referralStats } = await supabaseAdmin
    .from("referral_stats")
    .select("*")
    .eq("user_id", session.user.id)
    .single()

  const { data: transactions } = await supabaseAdmin
    .from("payment_transactions")
    .select("*")
    .eq("user_id", session.user.id)
    .order("payment_date", { ascending: false })
    .limit(20)

  const shopifyOrders = user?.email ? await getShopifyOrdersByEmail(user.email) : []

  const { profile: healthProfile } = await getHealthProfile()

  const subscriptionStatusLabels: Record<string, { label: string; color: string }> = {
    active: { label: "Activa", color: "bg-green-100 text-green-700" },
    inactive: { label: "Inactiva", color: "bg-zinc-100 text-zinc-700" },
    cancelled: { label: "Cancelada", color: "bg-orange-100 text-orange-700" },
    past_due: { label: "Pago Atrasado", color: "bg-red-100 text-red-700" },
  }

  const subscriptionStatus = user?.subscription_status || "inactive"
  const statusInfo = subscriptionStatusLabels[subscriptionStatus] || subscriptionStatusLabels.inactive
  const subscriptionPlan = user?.subscription_product ? SUBSCRIPTION_PLANS[user.subscription_product] : null
  const isActive = subscriptionStatus === "active" || subscriptionStatus === "past_due"

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading text-zinc-900 mb-1 sm:mb-2">Mi Perfil</h1>
        <p className="text-sm sm:text-base text-zinc-600">Gestiona tu información personal y suscripción</p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Avatar */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-heading text-zinc-900 mb-4 sm:mb-6">Foto de Perfil</h2>
          <AvatarUpload
            currentImage={user?.image}
            userName={session.user.name}
            userId={session.user.id}
          />
        </div>

        {/* Información Personal */}
        <ProfileForm user={user} />

        {/* Información de Cuenta */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-heading text-zinc-900 mb-4 sm:mb-6">Información de Cuenta</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
                <Mail className="w-4 h-4" strokeWidth={1.5} />
                Correo electrónico
              </label>
              <div className="px-4 py-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <p className="text-zinc-900">{user?.email || "No especificado"}</p>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
                <Calendar className="w-4 h-4" strokeWidth={1.5} />
                Miembro desde
              </label>
              <div className="px-4 py-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <p className="text-zinc-900">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString("es-CO", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "No disponible"}
                </p>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
                <Hash className="w-4 h-4" strokeWidth={1.5} />
                ID de usuario
              </label>
              <div className="px-4 py-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <p className="text-zinc-600 text-xs font-mono truncate">{user?.id || "No disponible"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Perfil de Salud */}
        <HealthProfileForm
          userId={session.user.id}
          existingProfile={healthProfile || undefined}
        />

        {/* Código de Referido */}
        {user?.referral_code && (
          <ReferralCode
            referralCode={user.referral_code}
            referralStats={referralStats}
          />
        )}

        {/* Suscripción */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-heading text-zinc-900">Suscripción</h2>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          {isActive && (
            <div className="space-y-4">
              {/* Producto */}
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
                {/* Valor pagado */}
                <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Valor mensual</p>
                    <p className="font-medium text-zinc-900">
                      {user?.subscription_price
                        ? Number(user.subscription_price).toLocaleString("es-CO", {
                            style: "currency",
                            currency: "COP",
                            maximumFractionDigits: 0,
                          })
                        : subscriptionPlan
                        ? subscriptionPlan.price.toLocaleString("es-CO", {
                            style: "currency",
                            currency: "COP",
                            maximumFractionDigits: 0,
                          })
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Fecha de inicio */}
                <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Inicio</p>
                    <p className="font-medium text-zinc-900">
                      {user?.subscription_start_date
                        ? new Date(user.subscription_start_date).toLocaleDateString("es-CO", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Próximo cobro */}
                <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Próximo cobro</p>
                    <p className="font-medium text-zinc-900">
                      {user?.subscription_end_date
                        ? new Date(user.subscription_end_date).toLocaleDateString("es-CO", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* ID de suscripción */}
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

          {subscriptionStatus === "cancelled" && (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-700">
                Tu suscripción fue cancelada. Si deseas volver, puedes suscribirte nuevamente.
              </p>
              <a
                href="/subscribe"
                className="inline-block mt-3 px-5 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
              >
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
                  <p className="text-sm text-zinc-600 mb-4">
                    Suscríbete para acceder a todas las funcionalidades de la plataforma.
                  </p>
                  <ul className="space-y-2 text-sm text-zinc-600 mb-4">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" strokeWidth={2} />
                      Acceso completo a todos los módulos
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" strokeWidth={2} />
                      Sin límites ni restricciones
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" strokeWidth={2} />
                      Cancela cuando quieras
                    </li>
                  </ul>
                  <a
                    href="/subscribe"
                    className="inline-block px-6 py-2.5 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Suscribirse
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pedidos Shopify */}
        {shopifyOrders.length > 0 && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <ShoppingBag className="w-5 h-5 text-zinc-500" strokeWidth={1.5} />
              <h2 className="text-lg sm:text-xl lg:text-2xl font-heading text-zinc-900">Mis Pedidos</h2>
            </div>

            <div className="space-y-3">
              {shopifyOrders.map((order) => {
                const fulfillmentKey = order.fulfillment_status ?? "pending"
                const fulfillment = FULFILLMENT_STATUS[fulfillmentKey] ?? FULFILLMENT_STATUS.pending
                const FulfillIcon = fulfillmentKey === "fulfilled" || fulfillmentKey === "partial" ? Truck : Clock
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
                  <div key={order.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-200 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 text-sm">
                          Pedido #{order.order_number} · {product?.title ?? "—"}
                        </p>
                        <p className="text-xs text-zinc-500">{orderDate} · {amount}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${fulfillment.color}`}>
                        <FulfillIcon className="w-3 h-3" strokeWidth={2} />
                        {fulfillment.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Transacciones */}
        {(transactions && transactions.length > 0) && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Receipt className="w-5 h-5 text-zinc-500" strokeWidth={1.5} />
              <h2 className="text-lg sm:text-xl lg:text-2xl font-heading text-zinc-900">Transacciones</h2>
            </div>

            <div className="space-y-3">
              {transactions.map((tx) => {
                const txStatus = PAYMENT_STATUS_LABELS[tx.status] ?? { label: tx.status, color: "bg-zinc-100 text-zinc-600" }
                const txDate = tx.payment_date
                  ? new Date(tx.payment_date).toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "—"
                const txAmount = tx.amount
                  ? Number(tx.amount).toLocaleString("es-CO", {
                      style: "currency",
                      currency: tx.currency ?? "COP",
                      maximumFractionDigits: 0,
                    })
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
  )
}
