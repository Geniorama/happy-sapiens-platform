'use server'

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { preApprovalClient } from "@/lib/mercadopago"

type ActionResult = { error: string } | { success: true }

async function getSubscriptionId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionId: true, subscriptionStatus: true },
  })

  return user?.subscriptionId ?? null
}

export async function pauseSubscription(months: 1 | 2 | 3): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  const subscriptionId = await getSubscriptionId()
  if (!subscriptionId) return { error: "No se encontró una suscripción activa" }

  try {
    await preApprovalClient.update({
      id: subscriptionId,
      body: { status: "paused" },
    })

    const pauseEndsAt = new Date()
    pauseEndsAt.setMonth(pauseEndsAt.getMonth() + months)

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        subscriptionStatus: "paused",
        subscriptionSyncedAt: new Date(),
        subscriptionPauseEndsAt: pauseEndsAt,
      },
    })
  } catch {
    return { error: "No se pudo pausar la suscripción. Intenta de nuevo." }
  }

  return { success: true }
}

export async function reactivateSubscription(): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  const subscriptionId = await getSubscriptionId()
  if (!subscriptionId) return { error: "No se encontró la suscripción" }

  try {
    await preApprovalClient.update({
      id: subscriptionId,
      body: { status: "authorized" },
    })

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        subscriptionStatus: "active",
        subscriptionSyncedAt: new Date(),
        subscriptionPauseEndsAt: null,
      },
    })
  } catch {
    return { error: "No se pudo reactivar la suscripción. Intenta de nuevo." }
  }

  return { success: true }
}

export async function cancelSubscription(reason?: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  const subscriptionId = await getSubscriptionId()
  if (!subscriptionId) return { error: "No se encontró la suscripción" }

  try {
    await preApprovalClient.update({
      id: subscriptionId,
      body: { status: "cancelled" },
    })

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        subscriptionStatus: "cancelled",
        subscriptionSyncedAt: new Date(),
      },
    })

    if (reason) {
      await prisma.systemLog.create({
        data: {
          actorEmail: session.user.email ?? "",
          action: "subscription.cancelled",
          entityType: "subscription",
          metadata: { reason, subscription_id: subscriptionId },
        },
      })
    }
  } catch {
    return { error: "No se pudo cancelar la suscripción. Intenta de nuevo." }
  }

  return { success: true }
}
