'use server'

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { preApprovalClient } from "@/lib/mercadopago"
import { recomputeUserSubscription, SUB_STATUS } from "@/lib/subscriptions"

type ActionResult = { error: string } | { success: true }

// Resuelve la suscripción a gestionar. Con múltiples suscripciones por usuario, el
// cliente pasa el id de la fila (Subscription.id). Se valida que sea del usuario.
// Por retro-compatibilidad, si no llega id se usa la suscripción primaria (la
// reflejada en User.subscriptionId).
async function resolveSubscription(
  subscriptionRowId?: string
): Promise<{ userId: string; rowId: string | null; preapprovalId: string; email: string | null } | { error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  if (subscriptionRowId) {
    const row = await prisma.subscription.findUnique({
      where: { id: subscriptionRowId },
      select: { id: true, userId: true, mpPreapprovalId: true, user: { select: { email: true } } },
    })
    if (!row || row.userId !== session.user.id) return { error: "No se encontró la suscripción" }
    if (!row.mpPreapprovalId) return { error: "Esta suscripción no tiene un identificador de Mercado Pago" }
    return { userId: row.userId, rowId: row.id, preapprovalId: row.mpPreapprovalId, email: row.user.email }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionId: true, email: true },
  })
  if (!user?.subscriptionId) return { error: "No se encontró una suscripción activa" }
  return { userId: session.user.id, rowId: null, preapprovalId: user.subscriptionId, email: user.email }
}

export async function pauseSubscription(months: 1 | 2 | 3, subscriptionRowId?: string): Promise<ActionResult> {
  const sub = await resolveSubscription(subscriptionRowId)
  if ("error" in sub) return sub

  try {
    await preApprovalClient.update({
      id: sub.preapprovalId,
      body: { status: "paused" },
    })

    const pauseEndsAt = new Date()
    pauseEndsAt.setMonth(pauseEndsAt.getMonth() + months)

    if (sub.rowId) {
      await prisma.subscription.update({
        where: { id: sub.rowId },
        data: { status: SUB_STATUS.PAUSED, pauseEndsAt, syncedAt: new Date() },
      })
    }
    await recomputeUserSubscription(sub.userId)
  } catch {
    return { error: "No se pudo pausar la suscripción. Intenta de nuevo." }
  }

  return { success: true }
}

export async function reactivateSubscription(subscriptionRowId?: string): Promise<ActionResult> {
  const sub = await resolveSubscription(subscriptionRowId)
  if ("error" in sub) return sub

  try {
    await preApprovalClient.update({
      id: sub.preapprovalId,
      body: { status: "authorized" },
    })

    if (sub.rowId) {
      await prisma.subscription.update({
        where: { id: sub.rowId },
        data: { status: SUB_STATUS.ACTIVE, pauseEndsAt: null, syncedAt: new Date() },
      })
    }
    await recomputeUserSubscription(sub.userId)
  } catch {
    return { error: "No se pudo reactivar la suscripción. Intenta de nuevo." }
  }

  return { success: true }
}

export async function cancelSubscription(reason?: string, subscriptionRowId?: string): Promise<ActionResult> {
  const sub = await resolveSubscription(subscriptionRowId)
  if ("error" in sub) return sub

  try {
    await preApprovalClient.update({
      id: sub.preapprovalId,
      body: { status: "cancelled" },
    })

    if (sub.rowId) {
      await prisma.subscription.update({
        where: { id: sub.rowId },
        data: { status: SUB_STATUS.CANCELLED, syncedAt: new Date() },
      })
    }
    await recomputeUserSubscription(sub.userId)

    if (reason) {
      await prisma.systemLog.create({
        data: {
          actorEmail: sub.email ?? "",
          action: "subscription.cancelled",
          entityType: "subscription",
          metadata: { reason, subscription_id: sub.preapprovalId },
        },
      })
    }
  } catch {
    return { error: "No se pudo cancelar la suscripción. Intenta de nuevo." }
  }

  return { success: true }
}
