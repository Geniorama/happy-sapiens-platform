"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { logAdminAction } from "@/lib/log"
import { provisionFromPreApproval, provisionRecurringOrder } from "@/lib/subscription-provisioning"
import { revalidatePath } from "next/cache"

async function getAdminSession() {
  const session = await auth()
  if (!session?.user?.id) return null
  if (session.user.role !== "admin") return null
  return session
}

// Acciones de system_logs que delatan una suscripción cobrada/autorizada que
// quedó sin aprovisionar (cuenta y/o primer pedido en Shopify no creados).
const PROBLEM_ACTIONS = [
  "webhook.preapproval.pending_payment",
  "webhook.preapproval.shopify_order_error",
  "webhook.preapproval.user_create_error",
  "webhook.payment.shopify_order_error",
]

export type AffectedSubscription = {
  email: string
  preApprovalId: string | null
  lastAction: string
  lastSeen: string
  occurrences: number
  hasUser: boolean
  userStatus: string | null
  orderCreated: boolean
  orderNumber: number | null
  resolved: boolean
}

// Lista las suscripciones afectadas: cruza los logs de problema con el estado
// real (existencia de usuario y de un primer despacho `created` en Shopify). Una
// fila se marca `resolved` cuando ya existe el primer pedido — se mantiene
// visible como historial pero no requiere acción.
export async function listAffectedSubscriptions(): Promise<
  { ok: true; items: AffectedSubscription[] } | { ok: false; error: string }
> {
  const session = await getAdminSession()
  if (!session) return { ok: false, error: "No autorizado" }

  const rows = await prisma.systemLog.findMany({
    where: { action: { in: PROBLEM_ACTIONS } },
    select: { actorEmail: true, action: true, metadata: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 1000,
  })

  // Agrupar por email (el actor de estos logs es el email del suscriptor).
  type Group = {
    email: string
    preApprovalId: string | null
    lastAction: string
    lastSeen: Date
    occurrences: number
  }
  const groups = new Map<string, Group>()
  for (const r of rows) {
    const email = r.actorEmail
    if (!email || email === "system" || email === "unknown") continue
    const meta = (r.metadata ?? {}) as Record<string, unknown>
    const preApprovalId = typeof meta.preApprovalId === "string" ? meta.preApprovalId : null
    const existing = groups.get(email)
    if (existing) {
      existing.occurrences++
      if (!existing.preApprovalId && preApprovalId) existing.preApprovalId = preApprovalId
    } else {
      groups.set(email, {
        email,
        preApprovalId,
        lastAction: r.action,
        lastSeen: r.createdAt,
        occurrences: 1,
      })
    }
  }

  const emails = Array.from(groups.keys())
  if (emails.length === 0) return { ok: true, items: [] }

  const [users, dispatches] = await Promise.all([
    prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true, subscriptionStatus: true, subscriptionId: true },
    }),
    prisma.shopifyOrderDispatch.findMany({
      where: {
        email: { in: emails },
        idempotencyKey: { startsWith: "preapproval:" },
        status: "created",
      },
      select: { email: true, shopifyOrderNumber: true },
    }),
  ])

  const userByEmail = new Map(users.map((u) => [u.email, u]))
  const orderByEmail = new Map(dispatches.map((d) => [d.email, d]))

  const items: AffectedSubscription[] = Array.from(groups.values()).map((g) => {
    const user = userByEmail.get(g.email)
    const order = orderByEmail.get(g.email)
    const orderCreated = !!order
    return {
      email: g.email,
      // El subscriptionId del usuario es el preApprovalId de MercadoPago; sirve de
      // respaldo cuando el log no lo trae (p.ej. payment.shopify_order_error).
      preApprovalId: g.preApprovalId || user?.subscriptionId || null,
      lastAction: g.lastAction,
      lastSeen: g.lastSeen.toISOString(),
      occurrences: g.occurrences,
      hasUser: !!user,
      userStatus: user?.subscriptionStatus ?? null,
      orderCreated,
      orderNumber: order?.shopifyOrderNumber ?? null,
      resolved: orderCreated,
    }
  })

  // No resueltos primero; dentro de cada grupo, más recientes arriba.
  items.sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1
    return b.lastSeen.localeCompare(a.lastSeen)
  })

  return { ok: true, items }
}

// Reaprovisiona una suscripción a partir de un preApprovalId o un email. Ejecuta
// el mismo flujo del webhook (crear/activar usuario + correo + primer pedido en
// Shopify). `force` omite la verificación del cobro en MercadoPago — usar solo
// cuando consta que el cobro se realizó pero el agregado de MP no lo refleja.
export async function reprovisionSubscription(input: {
  identifier: string
  force?: boolean
}): Promise<{ ok: boolean; message: string }> {
  const session = await getAdminSession()
  if (!session) return { ok: false, message: "No autorizado" }

  const identifier = input.identifier?.trim()
  if (!identifier) return { ok: false, message: "Ingresa un preApprovalId o un email" }

  // Resolver el preApprovalId a partir del email cuando aplica.
  let preApprovalId = identifier
  if (identifier.includes("@")) {
    const user = await prisma.user.findUnique({
      where: { email: identifier },
      select: { subscriptionId: true },
    })
    if (!user?.subscriptionId) {
      return {
        ok: false,
        message: `No se encontró un subscriptionId (preApprovalId) para ${identifier}. Ingresa el preApprovalId directamente.`,
      }
    }
    preApprovalId = user.subscriptionId
  }

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email ?? "admin",
    action: "admin.subscription.reprovision_attempt",
    entityType: "subscription",
    entityId: preApprovalId,
    metadata: { identifier, force: input.force === true },
  })

  let result
  try {
    result = await provisionFromPreApproval(preApprovalId, { chargeConfirmed: input.force === true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await logAdminAction({
      actorId: session.user.id,
      actorEmail: session.user.email ?? "admin",
      action: "admin.subscription.reprovision_error",
      entityType: "subscription",
      entityId: preApprovalId,
      metadata: { error: msg },
    })
    revalidatePath("/admin/aprovisionamiento")
    return { ok: false, message: `Error al crear la orden en Shopify: ${msg}` }
  }

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email ?? "admin",
    action: "admin.subscription.reprovision_result",
    entityType: "subscription",
    entityId: preApprovalId,
    metadata: { ...result },
  })

  revalidatePath("/admin/aprovisionamiento")

  if (!result.ok) {
    switch (result.reason) {
      case "preapproval_fetch_error":
        return { ok: false, message: `No se pudo obtener la preaprobación en MercadoPago: ${result.detail ?? ""}` }
      case "no_email":
        return { ok: false, message: "No se pudo resolver el email del suscriptor desde la preaprobación." }
      case "pending_payment":
        return {
          ok: false,
          message:
            "MercadoPago aún no reporta un cobro exitoso para esta suscripción. Si te consta que el cobro se realizó, reintenta marcando «Forzar».",
        }
      case "user_create_error":
        return { ok: false, message: `Error al crear el usuario: ${result.detail ?? ""}` }
      case "wrong_status":
        return { ok: false, message: `La preaprobación está en estado '${result.status}', no 'authorized'. No se aprovisiona.` }
      default:
        return { ok: false, message: "No se pudo aprovisionar la suscripción." }
    }
  }

  const orderMsg =
    result.order === "created"
      ? `Pedido en Shopify creado (#${result.orderNumber}).`
      : result.order === "skipped"
        ? `El pedido en Shopify ya existía (#${result.orderNumber ?? "n/a"}), no se duplicó.`
        : "No había variant configurado, no se creó pedido."
  const userMsg = result.userCreated ? "Usuario creado y correo de bienvenida enviado." : "Usuario ya existente, actualizado."

  return { ok: true, message: `Aprovisionamiento completado. ${userMsg} ${orderMsg}` }
}

export type RecurringCharge = {
  mpPaymentId: string
  email: string | null
  amount: number | null
  currency: string
  status: string
  paymentDate: string
  orderState: "created" | "skipped" | "missing"
  orderNumber: number | null
  hasVariant: boolean
  partialError: boolean
}

// Estado de los cobros recurrentes: cruza payment_transactions (cobros mensuales
// que registramos) con shopify_order_dispatches de clave `payment:<id>`. Un cobro
// sin su dispatch `created` es una recurrencia cuyo pedido no se creó en Shopify.
export async function listRecurringCharges(): Promise<
  { ok: true; items: RecurringCharge[] } | { ok: false; error: string }
> {
  const session = await getAdminSession()
  if (!session) return { ok: false, error: "No autorizado" }

  const txs = await prisma.paymentTransaction.findMany({
    where: { mercadopagoPaymentId: { not: null } },
    select: {
      mercadopagoPaymentId: true,
      amount: true,
      currency: true,
      status: true,
      paymentDate: true,
      createdAt: true,
      user: { select: { email: true, subscriptionVariantId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  })

  if (txs.length === 0) return { ok: true, items: [] }

  const keys = txs.map((t) => `payment:${t.mercadopagoPaymentId}`)
  const dispatches = await prisma.shopifyOrderDispatch.findMany({
    where: { idempotencyKey: { in: keys } },
    select: { idempotencyKey: true, status: true, shopifyOrderNumber: true, errorMessage: true },
  })
  const dispatchByKey = new Map(dispatches.map((d) => [d.idempotencyKey, d]))

  const items: RecurringCharge[] = txs.map((t) => {
    const mpPaymentId = t.mercadopagoPaymentId as string
    const dispatch = dispatchByKey.get(`payment:${mpPaymentId}`)
    const orderState: RecurringCharge["orderState"] =
      dispatch?.status === "created" ? "created" : dispatch?.status === "skipped" ? "skipped" : "missing"
    return {
      mpPaymentId,
      email: t.user?.email ?? null,
      amount: t.amount !== null && t.amount !== undefined ? Number(t.amount) : null,
      currency: t.currency ?? "COP",
      status: t.status,
      paymentDate: (t.paymentDate ?? t.createdAt).toISOString(),
      orderState,
      orderNumber: dispatch?.shopifyOrderNumber ?? null,
      hasVariant: !!t.user?.subscriptionVariantId,
      partialError: !!dispatch?.errorMessage,
    }
  })

  // Pedidos faltantes primero; dentro de cada grupo, más recientes arriba.
  items.sort((a, b) => {
    const aMissing = a.orderState === "missing"
    const bMissing = b.orderState === "missing"
    if (aMissing !== bMissing) return aMissing ? -1 : 1
    return b.paymentDate.localeCompare(a.paymentDate)
  })

  return { ok: true, items }
}

// Reaprovisiona el pedido en Shopify de un cobro recurrente concreto (por su
// mercadopagoPaymentId). Idempotente: no duplica un pedido ya creado.
export async function reprovisionRecurringOrder(
  mpPaymentId: string
): Promise<{ ok: boolean; message: string }> {
  const session = await getAdminSession()
  if (!session) return { ok: false, message: "No autorizado" }

  const id = mpPaymentId?.trim()
  if (!id) return { ok: false, message: "Ingresa el ID de pago de MercadoPago" }

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email ?? "admin",
    action: "admin.recurring.reprovision_attempt",
    entityType: "subscription",
    entityId: id,
    metadata: { mpPaymentId: id },
  })

  let result
  try {
    result = await provisionRecurringOrder(id)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await logAdminAction({
      actorId: session.user.id,
      actorEmail: session.user.email ?? "admin",
      action: "admin.recurring.reprovision_error",
      entityType: "subscription",
      entityId: id,
      metadata: { error: msg },
    })
    revalidatePath("/admin/aprovisionamiento")
    return { ok: false, message: `Error al crear la orden en Shopify: ${msg}` }
  }

  revalidatePath("/admin/aprovisionamiento")

  if (!result.ok) {
    switch (result.reason) {
      case "no_payment":
        return { ok: false, message: `No se encontró el cobro ${id} en payment_transactions (o no tiene usuario asociado).` }
      case "no_user":
        return { ok: false, message: "El cobro no tiene un usuario válido asociado." }
      case "no_variant":
        return { ok: false, message: "El usuario no tiene variant recurrente configurado (subscriptionVariantId)." }
      default:
        return { ok: false, message: "No se pudo crear el pedido recurrente." }
    }
  }

  return {
    ok: true,
    message:
      result.order === "created"
        ? `Pedido recurrente creado en Shopify (#${result.orderNumber}).`
        : `El pedido recurrente ya existía (#${result.orderNumber ?? "n/a"}), no se duplicó.`,
  }
}
