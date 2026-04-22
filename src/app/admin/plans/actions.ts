"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { logAdminAction } from "@/lib/log"

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

export async function updateSubscriptionPlan(slug: string, data: PlanUpdateData) {
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

  revalidatePath("/admin/plans")
  revalidatePath("/subscribe")
  revalidatePath("/dashboard/subscription")
  return { success: true }
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
