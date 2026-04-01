"use server"

import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function assignCoupon(partnerId: string, campaignTitle?: string | null, campaignDescription?: string | null) {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: "No autenticado" }
  }

  try {
    // Verificar que la suscripción no esté pausada
    const { data: userStatus } = await supabaseAdmin
      .from("users")
      .select("subscription_status")
      .eq("id", session.user.id)
      .single()

    if (userStatus?.subscription_status === "paused") {
      return { error: "Tu suscripción está pausada. Reactívala para redimir cupones." }
    }

    // Buscar un cupón disponible para esta campaña específica
    let query = supabaseAdmin
      .from("coupons")
      .select("*")
      .eq("partner_id", partnerId)
      .eq("is_assigned", false)

    // Filtrar por campaña (title + description)
    if (campaignTitle !== undefined) {
      query = query.eq("title", campaignTitle)
    }
    if (campaignDescription !== undefined) {
      query = query.eq("description", campaignDescription)
    }

    const { data: availableCoupon, error: fetchError } = await query
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      console.error("Error buscando cupón:", fetchError)
      return { error: "Error al buscar cupón disponible" }
    }

    if (!availableCoupon) {
      return { error: "No hay cupones disponibles para esta campaña" }
    }

    // Verificar límite por usuario de esta campaña
    if (availableCoupon.max_per_user !== null) {
      // Contar cuántos cupones de esta campaña ya tiene el usuario
      let countQuery = supabaseAdmin
        .from("coupons")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("partner_id", partnerId)
        .eq("is_assigned", true)

      if (campaignTitle !== undefined) {
        countQuery = countQuery.eq("title", campaignTitle)
      }
      if (campaignDescription !== undefined) {
        countQuery = countQuery.eq("description", campaignDescription)
      }

      const { count } = await countQuery

      if (count !== null && count >= availableCoupon.max_per_user) {
        return { error: `Ya obtuviste el máximo de ${availableCoupon.max_per_user} cupones de esta campaña` }
      }
    }

    // Asignar el cupón al usuario
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // Expira en 30 días

    const { data: assignedCoupon, error: updateError } = await supabaseAdmin
      .from("coupons")
      .update({
        user_id: session.user.id,
        is_assigned: true,
        assigned_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq("id", availableCoupon.id)
      .select()
      .single()

    if (updateError) {
      console.error("Error asignando cupón:", updateError)
      return { error: "Error al asignar el cupón" }
    }

    revalidatePath("/dashboard/partners")
    return { success: true, coupon: assignedCoupon }
  } catch (error) {
    console.error("Error:", error)
    return { error: "Error al asignar el cupón" }
  }
}

export async function markCouponAsUsed(couponId: string) {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: "No autenticado" }
  }

  try {
    const { error } = await supabaseAdmin
      .from("coupons")
      .update({
        used_at: new Date().toISOString(),
      })
      .eq("id", couponId)
      .eq("user_id", session.user.id)

    if (error) {
      console.error("Error actualizando cupón:", error)
      return { error: "Error al actualizar el cupón" }
    }

    revalidatePath("/dashboard/partners")
    return { success: true }
  } catch (error) {
    console.error("Error:", error)
    return { error: "Error al actualizar el cupón" }
  }
}

// Función auxiliar para obtener cupones disponibles por marca
export async function getAvailableCouponsCount(partnerId: string) {
  const { count } = await supabaseAdmin
    .from("coupons")
    .select("*", { count: "exact", head: true })
    .eq("partner_id", partnerId)
    .eq("is_assigned", false)

  return count || 0
}
