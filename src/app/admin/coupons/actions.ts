"use server"

import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
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
}

export async function createCouponBatch(data: CouponBatchData) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!data.partner_id) return { error: "La marca es requerida" }
  if (!data.codes || data.codes.length === 0) return { error: "Debe ingresar al menos un código" }

  const trimmedCodes = data.codes.map((c) => c.trim()).filter(Boolean)
  if (trimmedCodes.length === 0) return { error: "Los códigos no pueden estar vacíos" }

  const rows = trimmedCodes.map((code) => ({
    partner_id: data.partner_id,
    title: data.title?.trim() || null,
    description: data.description?.trim() || null,
    expires_at: data.expires_at || null,
    coupon_code: code,
    is_assigned: false,
    max_per_user: data.max_per_user || null,
    cover_image_url: data.cover_image_url?.trim() || null,
    terms_and_conditions: data.terms_and_conditions?.trim() || null,
  }))

  const { error } = await supabaseAdmin.from("coupons").insert(rows)

  if (error) {
    console.error("Error creando cupones:", error)
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
}

export async function updateCouponCampaign(
  partnerId: string,
  originalTitle: string | null,
  originalDescription: string | null,
  data: CouponCampaignUpdateData
) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const updateFields: Record<string, unknown> = {
    title: data.title?.trim() || null,
    description: data.description?.trim() || null,
    expires_at: data.expires_at || null,
    cover_image_url: data.cover_image_url?.trim() || null,
    terms_and_conditions: data.terms_and_conditions?.trim() || null,
    max_per_user: data.max_per_user ?? null,
  }

  let query = supabaseAdmin
    .from("coupons")
    .update(updateFields)
    .eq("partner_id", partnerId)

  if (originalTitle !== null) query = query.eq("title", originalTitle)
  else query = query.is("title", null)

  if (originalDescription !== null) query = query.eq("description", originalDescription)
  else query = query.is("description", null)

  const { error } = await query

  if (error) {
    console.error("Error actualizando campaña:", error)
    return { error: "Error al actualizar la campaña" }
  }

  revalidatePath("/admin/coupons")
  revalidatePath("/dashboard/partners")
  return { success: true }
}

export async function deleteCoupon(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  // Solo se puede eliminar si no está asignado
  const { data: coupon } = await supabaseAdmin
    .from("coupons")
    .select("is_assigned")
    .eq("id", id)
    .single()

  if (coupon?.is_assigned) {
    return { error: "No se puede eliminar un cupón ya asignado a un usuario" }
  }

  const { error } = await supabaseAdmin.from("coupons").delete().eq("id", id)

  if (error) {
    console.error("Error eliminando cupón:", error)
    return { error: "Error al eliminar el cupón" }
  }

  revalidatePath("/admin/coupons")
  revalidatePath("/dashboard/partners")
  return { success: true }
}

export async function deleteAllCampaignCoupons(partnerId: string, title: string | null, description: string | null) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  let query = supabaseAdmin
    .from("coupons")
    .delete()
    .eq("partner_id", partnerId)

  if (title !== null) query = query.eq("title", title)
  if (description !== null) query = query.eq("description", description)

  const { error } = await query

  if (error) {
    console.error("Error eliminando campaña completa:", error)
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

  for (const c of campaigns) {
    let query = supabaseAdmin
      .from("coupons")
      .delete()
      .eq("partner_id", c.partnerId)

    if (mode === "available") query = query.eq("is_assigned", false)
    if (c.title !== null) query = query.eq("title", c.title)
    if (c.description !== null) query = query.eq("description", c.description)

    const { error } = await query
    if (error) {
      console.error("Error en bulk delete campaigns:", error)
      return { error: "Error al eliminar los cupones" }
    }
  }

  revalidatePath("/admin/coupons")
  revalidatePath("/dashboard/partners")
  return { success: true }
}

export async function deleteCouponCampaign(partnerId: string, title: string | null, description: string | null) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  let query = supabaseAdmin
    .from("coupons")
    .delete()
    .eq("partner_id", partnerId)
    .eq("is_assigned", false)

  if (title !== null) query = query.eq("title", title)
  if (description !== null) query = query.eq("description", description)

  const { error } = await query

  if (error) {
    console.error("Error eliminando campaña:", error)
    return { error: "Error al eliminar los cupones disponibles" }
  }

  revalidatePath("/admin/coupons")
  revalidatePath("/dashboard/partners")
  return { success: true }
}
