"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

async function getAdminSession() {
  const session = await auth()
  if (!session?.user?.id) return null
  if (session.user.role !== "admin") return null
  return session
}

export interface CouponBatchData {
  partner_id: string
  title?: string
  description?: string
  expires_at?: string
  codes: string[]
  max_per_user?: number | null
  cover_image_url?: string
  terms_and_conditions?: string
  discount_percentage?: number | null
  discount_description?: string
}

export async function createCouponBatch(data: CouponBatchData) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!data.partner_id) return { error: "La marca es requerida" }
  if (!data.codes || data.codes.length === 0) return { error: "Debe ingresar al menos un código" }

  const trimmedCodes = data.codes.map((c) => c.trim()).filter(Boolean)
  if (trimmedCodes.length === 0) return { error: "Los códigos no pueden estar vacíos" }

  const rows = trimmedCodes.map((code) => ({
    partnerId: data.partner_id,
    title: data.title?.trim() || null,
    description: data.description?.trim() || null,
    expiresAt: data.expires_at ? new Date(data.expires_at) : null,
    couponCode: code,
    isAssigned: false,
    maxPerUser: data.max_per_user || null,
    coverImageUrl: data.cover_image_url?.trim() || null,
    termsAndConditions: data.terms_and_conditions?.trim() || null,
    discountPercentage: data.discount_percentage ?? null,
    discountDescription: data.discount_description?.trim() || null,
  }))

  try {
    await prisma.coupon.createMany({ data: rows })
  } catch (err) {
    console.error("Error creando cupones:", err)
    return { error: "Error al crear los cupones" }
  }

  revalidatePath("/admin/coupons")
  revalidatePath("/dashboard/partners")
  return { success: true, count: rows.length }
}

export interface CouponCampaignUpdateData {
  title?: string | null
  description?: string | null
  expires_at?: string | null
  cover_image_url?: string | null
  terms_and_conditions?: string | null
  max_per_user?: number | null
  discount_percentage?: number | null
  discount_description?: string | null
}

export async function updateCouponCampaign(
  partnerId: string,
  originalTitle: string | null,
  originalDescription: string | null,
  data: CouponCampaignUpdateData
) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  try {
    await prisma.coupon.updateMany({
      where: {
        partnerId,
        title: originalTitle,
        description: originalDescription,
      },
      data: {
        title: data.title?.trim() || null,
        description: data.description?.trim() || null,
        expiresAt: data.expires_at ? new Date(data.expires_at) : null,
        coverImageUrl: data.cover_image_url?.trim() || null,
        termsAndConditions: data.terms_and_conditions?.trim() || null,
        maxPerUser: data.max_per_user ?? null,
        discountPercentage: data.discount_percentage ?? null,
        discountDescription: data.discount_description?.trim() || null,
      },
    })
  } catch (err) {
    console.error("Error actualizando campaña:", err)
    return { error: "Error al actualizar la campaña" }
  }

  revalidatePath("/admin/coupons")
  revalidatePath("/dashboard/partners")
  return { success: true }
}

export async function markCouponUsed(id: string, used: boolean) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  try {
    await prisma.coupon.update({
      where: { id },
      data: { usedAt: used ? new Date() : null },
    })
  } catch (err) {
    console.error("Error marcando cupón:", err)
    return { error: "Error al actualizar el cupón" }
  }

  revalidatePath("/admin/coupons")
  revalidatePath("/dashboard/partners")
  return { success: true }
}

export async function deleteCoupon(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  // Solo se puede eliminar si no está asignado
  const coupon = await prisma.coupon.findUnique({
    where: { id },
    select: { isAssigned: true },
  })

  if (coupon?.isAssigned) {
    return { error: "No se puede eliminar un cupón ya asignado a un usuario" }
  }

  try {
    await prisma.coupon.delete({ where: { id } })
  } catch (err) {
    console.error("Error eliminando cupón:", err)
    return { error: "Error al eliminar el cupón" }
  }

  revalidatePath("/admin/coupons")
  revalidatePath("/dashboard/partners")
  return { success: true }
}

export async function deleteAllCampaignCoupons(partnerId: string, title: string | null, description: string | null) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  try {
    await prisma.coupon.deleteMany({
      where: {
        partnerId,
        title,
        description,
      },
    })
  } catch (err) {
    console.error("Error eliminando campaña completa:", err)
    return { error: "Error al eliminar la campaña" }
  }

  revalidatePath("/admin/coupons")
  revalidatePath("/dashboard/partners")
  return { success: true }
}

export async function bulkDeleteCampaigns(
  campaigns: { partnerId: string; title: string | null; description: string | null }[],
  mode: "available" | "all"
) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  try {
    for (const c of campaigns) {
      await prisma.coupon.deleteMany({
        where: {
          partnerId: c.partnerId,
          title: c.title,
          description: c.description,
          ...(mode === "available" ? { isAssigned: false } : {}),
        },
      })
    }
  } catch (err) {
    console.error("Error en bulk delete campaigns:", err)
    return { error: "Error al eliminar los cupones" }
  }

  revalidatePath("/admin/coupons")
  revalidatePath("/dashboard/partners")
  return { success: true }
}

export async function deleteCouponCampaign(partnerId: string, title: string | null, description: string | null) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  try {
    await prisma.coupon.deleteMany({
      where: {
        partnerId,
        isAssigned: false,
        title,
        description,
      },
    })
  } catch (err) {
    console.error("Error eliminando campaña:", err)
    return { error: "Error al eliminar los cupones disponibles" }
  }

  revalidatePath("/admin/coupons")
  revalidatePath("/dashboard/partners")
  return { success: true }
}
