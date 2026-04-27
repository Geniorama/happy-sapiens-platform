"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function assignCoupon(partnerId: string, campaignTitle?: string | null, campaignDescription?: string | null) {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: "No autenticado" }
  }

  try {
    // Verificar que la suscripción no esté pausada
    const userStatus = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionStatus: true },
    })

    if (userStatus?.subscriptionStatus === "paused") {
      return { error: "Tu suscripción está pausada. Reactívala para redimir cupones." }
    }

    // Construir filtros por campaña (title + description). `undefined` = no filtrar; `null` = filtrar por valor nulo.
    const campaignFilter: { title?: string | null; description?: string | null } = {}
    if (campaignTitle !== undefined) campaignFilter.title = campaignTitle
    if (campaignDescription !== undefined) campaignFilter.description = campaignDescription

    // Buscar un cupón disponible para esta campaña específica (excluyendo expirados)
    const now = new Date()
    const availableCoupon = await prisma.coupon.findFirst({
      where: {
        partnerId,
        isAssigned: false,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
        ...campaignFilter,
      },
    })

    if (!availableCoupon) {
      return { error: "No hay cupones disponibles para esta campaña" }
    }

    if (availableCoupon.expiresAt && availableCoupon.expiresAt < now) {
      return { error: "Esta campaña ya expiró" }
    }

    // Verificar límite por usuario de esta campaña
    if (availableCoupon.maxPerUser !== null && availableCoupon.maxPerUser !== undefined) {
      const count = await prisma.coupon.count({
        where: {
          userId: session.user.id,
          partnerId,
          isAssigned: true,
          ...campaignFilter,
        },
      })

      if (count >= availableCoupon.maxPerUser) {
        return { error: `Ya obtuviste el máximo de ${availableCoupon.maxPerUser} cupones de esta campaña` }
      }
    }

    // Asignar el cupón al usuario
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // Expira en 30 días

    const updated = await prisma.coupon.update({
      where: { id: availableCoupon.id },
      data: {
        userId: session.user.id,
        isAssigned: true,
        assignedAt: new Date(),
        expiresAt,
      },
    })

    const assignedCoupon = {
      id: updated.id,
      partner_id: updated.partnerId,
      coupon_code: updated.couponCode,
      title: updated.title,
      description: updated.description,
      cover_image_url: updated.coverImageUrl,
      max_per_user: updated.maxPerUser,
      is_assigned: updated.isAssigned,
      user_id: updated.userId,
      assigned_at: updated.assignedAt ? updated.assignedAt.toISOString() : null,
      used_at: updated.usedAt ? updated.usedAt.toISOString() : null,
      expires_at: updated.expiresAt ? updated.expiresAt.toISOString() : null,
      discount_percentage: updated.discountPercentage,
      discount_description: updated.discountDescription,
      terms_and_conditions: updated.termsAndConditions,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    }

    revalidatePath("/dashboard/partners")
    return { success: true, coupon: assignedCoupon }
  } catch (error) {
    console.error("Error asignando cupón:", error)
    return { error: "Error al asignar el cupón" }
  }
}

export async function markCouponAsUsed(couponId: string) {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: "No autenticado" }
  }

  try {
    const result = await prisma.coupon.updateMany({
      where: { id: couponId, userId: session.user.id },
      data: { usedAt: new Date() },
    })

    if (result.count === 0) {
      return { error: "Error al actualizar el cupón" }
    }

    revalidatePath("/dashboard/partners")
    return { success: true }
  } catch (error) {
    console.error("Error actualizando cupón:", error)
    return { error: "Error al actualizar el cupón" }
  }
}

// Función auxiliar para obtener cupones disponibles por marca
export async function getAvailableCouponsCount(partnerId: string) {
  const count = await prisma.coupon.count({
    where: { partnerId, isAssigned: false },
  })

  return count
}
