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

export async function adminAdjustPoints(
  userId: string,
  amount: number,
  description: string
) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!amount || amount === 0) return { error: "El monto no puede ser cero" }
  if (!description?.trim()) return { error: "La descripción es requerida" }

  // Verificar que el usuario no sea admin
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("role, name")
    .eq("id", userId)
    .single()

  if (!user) return { error: "Usuario no encontrado" }
  if (user.role === "admin") return { error: "No se pueden ajustar puntos de un administrador" }

  const rpcName = amount > 0 ? "award_points" : "spend_points"
  const absAmount = Math.abs(amount)
  const actionType = amount > 0 ? "admin_adjustment" : "admin_deduction"

  const { error } = await supabaseAdmin.rpc(rpcName, {
    p_user_id: userId,
    p_amount: absAmount,
    p_action_type: actionType,
    p_description: description.trim(),
    p_reference_type: "admin",
    p_reference_id: null,
    p_metadata: { adjusted_by: session.user.id },
  })

  if (error) {
    console.error("Error ajustando puntos:", error)
    return { error: "Error al ajustar los puntos" }
  }

  revalidatePath("/admin/points")
  return { success: true }
}

export async function bulkAdjustPoints(
  userIds: string[],
  amount: number,
  description: string
) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!amount || amount === 0) return { error: "El monto no puede ser cero" }
  if (!description?.trim()) return { error: "La descripción es requerida" }
  if (userIds.length === 0) return { error: "Selecciona al menos un usuario" }

  const rpcName = amount > 0 ? "award_points" : "spend_points"
  const absAmount = Math.abs(amount)
  const actionType = amount > 0 ? "admin_adjustment" : "admin_deduction"

  for (const userId of userIds) {
    const { error } = await supabaseAdmin.rpc(rpcName, {
      p_user_id: userId,
      p_amount: absAmount,
      p_action_type: actionType,
      p_description: description.trim(),
      p_reference_type: "admin",
      p_reference_id: null,
      p_metadata: { adjusted_by: session.user.id },
    })

    if (error) {
      console.error("Error en bulk adjust points:", error)
      return { error: "Error al ajustar los puntos de uno o más usuarios" }
    }
  }

  revalidatePath("/admin/points")
  return { success: true }
}

export async function getPointsHistory(userId: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado", history: [] }

  const { data, error } = await supabaseAdmin
    .from("point_transactions")
    .select("id, amount, action_type, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) return { error: "Error al obtener historial", history: [] }
  return { history: data ?? [] }
}
