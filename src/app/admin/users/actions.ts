"use server"

import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { logAdminAction } from "@/lib/log"
import { revalidatePath } from "next/cache"
import { hash } from "bcryptjs"

async function getAdminSession() {
  const session = await auth()
  if (!session?.user?.id) return null
  if (session.user.role !== "admin") return null
  return session
}

async function getUserEmail(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("users").select("email").eq("id", userId).single()
  return data?.email ?? null
}

export async function createUser(data: {
  name: string
  email: string
  password: string
  role: "user" | "coach" | "admin"
  subscription_status: "active" | "inactive"
  subscription_start_date?: string
  subscription_end_date?: string
}) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!data.name?.trim()) return { error: "El nombre es requerido" }
  if (!data.email?.trim()) return { error: "El email es requerido" }
  if (!data.password || data.password.length < 6)
    return { error: "La contraseña debe tener al menos 6 caracteres" }

  if (data.subscription_status === "active") {
    if (!data.subscription_start_date) return { error: "La fecha de inicio es requerida" }
    if (!data.subscription_end_date) return { error: "La fecha de vencimiento es requerida" }
    if (new Date(data.subscription_end_date) <= new Date(data.subscription_start_date))
      return { error: "La fecha de vencimiento debe ser posterior a la de inicio" }
  }

  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", data.email.trim().toLowerCase())
    .single()

  if (existing) return { error: "Ya existe un usuario con ese email" }

  const hashedPassword = await hash(data.password, 10)
  const now = new Date().toISOString()

  const { data: created, error } = await supabaseAdmin
    .from("users")
    .insert({
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: hashedPassword,
      role: data.role,
      subscription_status: data.subscription_status,
      subscription_start_date: data.subscription_status === "active"
        ? new Date(data.subscription_start_date!).toISOString()
        : null,
      subscription_end_date: data.subscription_status === "active"
        ? new Date(data.subscription_end_date!).toISOString()
        : null,
      is_coach_active: data.role === "coach",
      created_at: now,
      updated_at: now,
    })
    .select("id, name, email, role, phone, birth_date, gender, subscription_status, subscription_end_date, image, created_at")
    .single()

  if (error) {
    console.error("Error creando usuario:", error)
    return { error: "Error al crear el usuario" }
  }

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: "user.created",
    entityType: "user",
    entityId: created.id,
    metadata: {
      target_name: data.name.trim(),
      target_email: data.email.trim().toLowerCase(),
      role: data.role,
      subscription_status: data.subscription_status,
    },
  })

  revalidatePath("/admin/users")
  return { success: true, user: { ...created, coupons_count: 0, total_points: 0 } }
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

  if (userId === session.user.id) return { error: "No puedes cambiar tu propio rol" }

  const { data: target } = await supabaseAdmin
    .from("users")
    .select("email, role")
    .eq("id", userId)
    .single()

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

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: "user.role_changed",
    entityType: "user",
    entityId: userId,
    metadata: {
      target_email: target?.email ?? null,
      old_role: target?.role ?? null,
      new_role: role,
    },
  })

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

  const targetEmail = await getUserEmail(userId)

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      subscription_status: status,
      subscription_start_date: status === "active" ? new Date().toISOString() : null,
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

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: "user.subscription_changed",
    entityType: "user",
    entityId: userId,
    metadata: {
      target_email: targetEmail,
      status,
      end_date: endDate ?? null,
    },
  })

  revalidatePath("/admin/users")
  return { success: true }
}

export async function resetPassword(userId: string, newPassword: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!newPassword || newPassword.length < 6)
    return { error: "La contraseña debe tener al menos 6 caracteres" }

  const targetEmail = await getUserEmail(userId)
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

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: "user.password_reset",
    entityType: "user",
    entityId: userId,
    metadata: { target_email: targetEmail },
  })

  return { success: true }
}

export async function bulkDeleteUsers(ids: string[]) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const safeIds = ids.filter((id) => id !== session.user.id)
  if (safeIds.length === 0) return { error: "No puedes eliminar tu propia cuenta" }

  // Obtener emails antes de borrar
  const { data: targets } = await supabaseAdmin
    .from("users")
    .select("email")
    .in("id", safeIds)

  const { error } = await supabaseAdmin.from("users").delete().in("id", safeIds)

  if (error) {
    console.error("Error en bulk delete users:", error)
    return { error: "Error al eliminar los usuarios" }
  }

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: "user.bulk_deleted",
    entityType: "user",
    metadata: {
      count: safeIds.length,
      target_emails: targets?.map((t) => t.email) ?? [],
    },
  })

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

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: "user.bulk_subscription_changed",
    entityType: "user",
    metadata: { count: ids.length, status },
  })

  revalidatePath("/admin/users")
  return { success: true }
}

export async function deleteUser(userId: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (userId === session.user.id) return { error: "No puedes eliminar tu propia cuenta" }

  const targetEmail = await getUserEmail(userId)

  const { error } = await supabaseAdmin.from("users").delete().eq("id", userId)

  if (error) {
    console.error("Error eliminando usuario:", error)
    return { error: "Error al eliminar el usuario" }
  }

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: "user.deleted",
    entityType: "user",
    entityId: userId,
    metadata: { target_email: targetEmail },
  })

  revalidatePath("/admin/users")
  return { success: true }
}
