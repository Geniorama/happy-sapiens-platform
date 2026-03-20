"use server"

import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { hash } from "bcryptjs"

async function getAdminSession() {
  const session = await auth()
  if (!session?.user?.id) return null
  if (session.user.role !== "admin") return null
  return session
}

export async function createUser(data: {
  name: string
  email: string
  password: string
  role: "user" | "coach" | "admin"
  subscription_status: "active" | "inactive"
}) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!data.name?.trim()) return { error: "El nombre es requerido" }
  if (!data.email?.trim()) return { error: "El email es requerido" }
  if (!data.password || data.password.length < 6)
    return { error: "La contraseña debe tener al menos 6 caracteres" }

  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", data.email.trim().toLowerCase())
    .single()

  if (existing) return { error: "Ya existe un usuario con ese email" }

  const hashedPassword = await hash(data.password, 10)

  const subscriptionEnd = data.subscription_status === "active"
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { error } = await supabaseAdmin.from("users").insert({
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    password: hashedPassword,
    role: data.role,
    subscription_status: data.subscription_status,
    subscription_start_date: data.subscription_status === "active" ? new Date().toISOString() : null,
    subscription_end_date: subscriptionEnd,
    is_coach_active: data.role === "coach",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  if (error) {
    console.error("Error creando usuario:", error)
    return { error: "Error al crear el usuario" }
  }

  revalidatePath("/admin/users")
  return { success: true }
}

export async function updateUser(
  userId: string,
  data: {
    name: string
    email: string
    phone?: string
    birth_date?: string
    gender?: string
  }
) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!data.name?.trim()) return { error: "El nombre es requerido" }
  if (!data.email?.trim()) return { error: "El email es requerido" }

  // Verificar que el email no esté en uso por otro usuario
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", data.email.trim().toLowerCase())
    .neq("id", userId)
    .single()

  if (existing) return { error: "El email ya está en uso por otro usuario" }

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || null,
      birth_date: data.birth_date || null,
      gender: data.gender || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) {
    console.error("Error actualizando usuario:", error)
    return { error: "Error al actualizar el usuario" }
  }

  revalidatePath("/admin/users")
  return { success: true }
}

export async function changeUserRole(userId: string, role: "user" | "coach" | "admin") {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  // No puede cambiar su propio rol
  if (userId === session.user.id) return { error: "No puedes cambiar tu propio rol" }

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      role,
      is_coach_active: role === "coach",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) {
    console.error("Error cambiando rol:", error)
    return { error: "Error al cambiar el rol" }
  }

  revalidatePath("/admin/users")
  return { success: true }
}

export async function setSubscription(
  userId: string,
  status: "active" | "inactive",
  endDate?: string
) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      subscription_status: status,
      subscription_start_date:
        status === "active" ? new Date().toISOString() : null,
      subscription_end_date:
        status === "active"
          ? endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) {
    console.error("Error actualizando suscripción:", error)
    return { error: "Error al actualizar la suscripción" }
  }

  revalidatePath("/admin/users")
  return { success: true }
}

export async function resetPassword(userId: string, newPassword: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!newPassword || newPassword.length < 6)
    return { error: "La contraseña debe tener al menos 6 caracteres" }

  const hashedPassword = await hash(newPassword, 10)

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      password: hashedPassword,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) {
    console.error("Error reseteando contraseña:", error)
    return { error: "Error al resetear la contraseña" }
  }

  return { success: true }
}

export async function bulkDeleteUsers(ids: string[]) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const safeIds = ids.filter((id) => id !== session.user.id)
  if (safeIds.length === 0) return { error: "No puedes eliminar tu propia cuenta" }

  const { error } = await supabaseAdmin.from("users").delete().in("id", safeIds)

  if (error) {
    console.error("Error en bulk delete users:", error)
    return { error: "Error al eliminar los usuarios" }
  }

  revalidatePath("/admin/users")
  return { success: true, deletedCount: safeIds.length }
}

export async function bulkSetSubscription(ids: string[], status: "active" | "inactive") {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const now = new Date().toISOString()
  const update =
    status === "active"
      ? {
          subscription_status: "active",
          subscription_start_date: now,
          subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: now,
        }
      : {
          subscription_status: "inactive",
          subscription_start_date: null,
          subscription_end_date: null,
          updated_at: now,
        }

  const { error } = await supabaseAdmin.from("users").update(update).in("id", ids)

  if (error) {
    console.error("Error en bulk set subscription:", error)
    return { error: "Error al actualizar la suscripción" }
  }

  revalidatePath("/admin/users")
  return { success: true }
}

export async function deleteUser(userId: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (userId === session.user.id) return { error: "No puedes eliminar tu propia cuenta" }

  const { error } = await supabaseAdmin.from("users").delete().eq("id", userId)

  if (error) {
    console.error("Error eliminando usuario:", error)
    return { error: "Error al eliminar el usuario" }
  }

  revalidatePath("/admin/users")
  return { success: true }
}
