"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { logAdminAction } from "@/lib/log"
import { preApprovalClient } from "@/lib/mercadopago"

async function getAdminSession() {
  const session = await auth()
  if (!session?.user?.id) return null
  if (session.user.role !== "admin") return null
  return session
}

export interface PlanUpdateData {
  title: string
  description: string
  price: number
  currency: string
  taxExempt: boolean
  isActive: boolean
  shopifyVariantId: string | null
  shopifyFirstOrderVariantId: string | null
}

// Estados de suscripción cuyo cobro recurrente sigue vigente en Mercado Pago y,
// por tanto, debe re-sincronizarse al cambiar el precio. Las canceladas/inactivas
// se omiten porque ya no se les cobra.
const PROPAGATABLE_STATUSES = ["active", "paused", "past_due"]

export interface ApplyPriceResult {
  total: number
  updated: number
  failed: number
  errors: string[]
}

// Propaga el nuevo precio a las suscripciones existentes del plan: actualiza el
// monto recurrente real en Mercado Pago (lo que se le cobra al cliente en su
// próxima renovación) y luego el snapshot local. Si Mercado Pago falla para un
// usuario, NO se toca su snapshot, para que panel y cobro real no se desajusten.
async function applyPriceToExistingSubscriptions(
  slug: string,
  price: number,
  currency: string,
): Promise<{ result: ApplyPriceResult; failedUserIds: string[] }> {
  const subscribers = await prisma.user.findMany({
    where: {
      subscriptionProduct: slug,
      subscriptionId: { not: null },
      subscriptionStatus: { in: PROPAGATABLE_STATUSES },
    },
    select: { id: true, subscriptionId: true },
  })

  let updated = 0
  const errors: string[] = []
  const failedUserIds: string[] = []

  for (const sub of subscribers) {
    const subscriptionId = sub.subscriptionId!
    try {
      await preApprovalClient.update({
        id: subscriptionId,
        body: {
          auto_recurring: {
            transaction_amount: price,
            currency_id: currency,
          },
        },
      })

      await prisma.user.update({
        where: { id: sub.id },
        data: { subscriptionPrice: price, subscriptionSyncedAt: new Date() },
      })
      updated++
    } catch (err) {
      failedUserIds.push(sub.id)
      const message = err instanceof Error ? err.message : "Error desconocido"
      errors.push(`${subscriptionId}: ${message}`)
      console.error(`Error sincronizando precio en MP para usuario ${sub.id}:`, err)
    }
  }

  return {
    result: { total: subscribers.length, updated, failed: failedUserIds.length, errors },
    failedUserIds,
  }
}

export async function updateSubscriptionPlan(
  slug: string,
  data: PlanUpdateData,
  applyToExisting = false,
) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!slug) return { error: "Plan no válido" }
  if (!data.title?.trim()) return { error: "El título es requerido" }
  if (!data.description?.trim()) return { error: "La descripción es requerida" }
  if (!Number.isFinite(data.price) || data.price <= 0) {
    return { error: "El precio debe ser un número mayor a 0" }
  }
  if (!data.currency?.trim()) return { error: "La moneda es requerida" }

  try {
    const existing = await prisma.subscriptionPlanConfig.findUnique({ where: { slug } })
    if (!existing) return { error: "El plan no existe" }

    await prisma.subscriptionPlanConfig.update({
      where: { slug },
      data: {
        title: data.title.trim(),
        description: data.description.trim(),
        price: data.price,
        currency: data.currency.trim().toUpperCase(),
        taxExempt: data.taxExempt,
        isActive: data.isActive,
        shopifyVariantId: data.shopifyVariantId?.trim() || null,
        shopifyFirstOrderVariantId: data.shopifyFirstOrderVariantId?.trim() || null,
      },
    })

    await logAdminAction({
      actorId: session.user.id!,
      actorEmail: session.user.email ?? "",
      action: "subscription_plan.update",
      entityType: "subscription_plan",
      entityId: slug,
      metadata: {
        before: {
          price: Number(existing.price),
          isActive: existing.isActive,
          shopifyVariantId: existing.shopifyVariantId,
          shopifyFirstOrderVariantId: existing.shopifyFirstOrderVariantId,
        },
        after: {
          price: data.price,
          isActive: data.isActive,
          shopifyVariantId: data.shopifyVariantId,
          shopifyFirstOrderVariantId: data.shopifyFirstOrderVariantId,
        },
      },
    })
  } catch (err) {
    console.error("Error actualizando plan:", err)
    return { error: "No se pudo actualizar el plan" }
  }

  let applied: ApplyPriceResult | undefined
  if (applyToExisting) {
    try {
      const { result, failedUserIds } = await applyPriceToExistingSubscriptions(
        slug,
        data.price,
        data.currency.trim().toUpperCase(),
      )
      applied = result

      await logAdminAction({
        actorId: session.user.id!,
        actorEmail: session.user.email ?? "",
        action: "subscription_plan.apply_price_to_existing",
        entityType: "subscription_plan",
        entityId: slug,
        metadata: {
          price: data.price,
          total: result.total,
          updated: result.updated,
          failed: result.failed,
          failedUserIds,
        },
      })
    } catch (err) {
      console.error("Error aplicando precio a suscripciones existentes:", err)
      // El plan ya se actualizó; informamos el fallo de la propagación.
      return {
        success: true as const,
        applyError: "El plan se guardó, pero no se pudo aplicar a las suscripciones existentes.",
      }
    }
  }

  revalidatePath("/admin/plans")
  revalidatePath("/subscribe")
  revalidatePath("/dashboard/subscription")
  return { success: true as const, applied }
}

export async function toggleSubscriptionPlanActive(slug: string, isActive: boolean) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  try {
    const existing = await prisma.subscriptionPlanConfig.findUnique({ where: { slug } })
    if (!existing) return { error: "El plan no existe" }
    if (existing.isActive === isActive) return { success: true }

    await prisma.subscriptionPlanConfig.update({
      where: { slug },
      data: { isActive },
    })

    await logAdminAction({
      actorId: session.user.id!,
      actorEmail: session.user.email ?? "",
      action: isActive ? "subscription_plan.activate" : "subscription_plan.deactivate",
      entityType: "subscription_plan",
      entityId: slug,
      metadata: { isActive },
    })
  } catch (err) {
    console.error("Error cambiando estado del plan:", err)
    return { error: "No se pudo cambiar el estado del plan" }
  }

  revalidatePath("/admin/plans")
  revalidatePath("/subscribe")
  return { success: true }
}
