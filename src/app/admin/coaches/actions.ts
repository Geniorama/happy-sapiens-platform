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

export async function promoteToCoach(email: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!email?.trim()) return { error: "El email es requerido" }

  const { data: user, error: findError } = await supabaseAdmin
    .from("users")
    .select("id, name, email, role")
    .eq("email", email.trim().toLowerCase())
    .single()

  if (findError || !user) return { error: "No se encontró un usuario con ese email" }
  if (user.role === "coach") return { error: "Este usuario ya es coach" }
  if (user.role === "admin") return { error: "No se puede cambiar el rol de un administrador" }

  const { error } = await supabaseAdmin
    .from("users")
    .update({ role: "coach", is_coach_active: true })
    .eq("id", user.id)

  if (error) {
    console.error("Error promoviendo coach:", error)
    return { error: "Error al actualizar el rol" }
  }

  revalidatePath("/admin/coaches")
  return { success: true, userName: user.name }
}

export async function removeCoachRole(userId: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const { error } = await supabaseAdmin
    .from("users")
    .update({ role: "user", is_coach_active: false })
    .eq("id", userId)

  if (error) {
    console.error("Error removiendo rol coach:", error)
    return { error: "Error al actualizar el rol" }
  }

  revalidatePath("/admin/coaches")
  return { success: true }
}

export async function bulkToggleCoachesActive(ids: string[], isActive: boolean) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const { error } = await supabaseAdmin
    .from("users")
    .update({ is_coach_active: isActive })
    .in("id", ids)

  if (error) {
    console.error("Error en bulk toggle coaches:", error)
    return { error: "Error al actualizar el estado" }
  }

  revalidatePath("/admin/coaches")
  return { success: true }
}

export async function bulkRemoveCoachRole(ids: string[]) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const { error } = await supabaseAdmin
    .from("users")
    .update({ role: "user", is_coach_active: false })
    .in("id", ids)

  if (error) {
    console.error("Error en bulk remove coach role:", error)
    return { error: "Error al quitar el rol" }
  }

  revalidatePath("/admin/coaches")
  return { success: true }
}

export async function toggleCoachActive(userId: string, isActive: boolean) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const { error } = await supabaseAdmin
    .from("users")
    .update({ is_coach_active: isActive })
    .eq("id", userId)

  if (error) {
    console.error("Error toggling coach:", error)
    return { error: "Error al actualizar el estado" }
  }

  revalidatePath("/admin/coaches")
  return { success: true }
}
