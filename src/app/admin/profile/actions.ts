"use server"

import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { compare, hash } from "bcryptjs"

async function getAdminSession() {
  const session = await auth()
  if (!session?.user?.id) return null
  if (session.user.role !== "admin") return null
  return session
}

export async function updateAdminProfile(data: { name: string; phone?: string }) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!data.name?.trim()) return { error: "El nombre es requerido" }

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.user.id)

  if (error) {
    console.error("Error actualizando perfil admin:", error)
    return { error: "Error al actualizar el perfil" }
  }

  revalidatePath("/admin/profile")
  return { success: true }
}

export async function updateAdminPassword(data: {
  currentPassword: string
  newPassword: string
}) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!data.newPassword || data.newPassword.length < 6)
    return { error: "La nueva contraseña debe tener al menos 6 caracteres" }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("password")
    .eq("id", session.user.id)
    .single()

  if (!user?.password) return { error: "Esta cuenta no tiene contraseña configurada" }

  const isValid = await compare(data.currentPassword, user.password)
  if (!isValid) return { error: "La contraseña actual es incorrecta" }

  const hashed = await hash(data.newPassword, 10)

  const { error } = await supabaseAdmin
    .from("users")
    .update({ password: hashed, updated_at: new Date().toISOString() })
    .eq("id", session.user.id)

  if (error) {
    console.error("Error actualizando contraseña:", error)
    return { error: "Error al actualizar la contraseña" }
  }

  return { success: true }
}
