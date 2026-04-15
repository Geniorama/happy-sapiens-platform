"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
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

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
      },
    })
  } catch (err) {
    console.error("Error actualizando perfil admin:", err)
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  })

  if (!user?.password) return { error: "Esta cuenta no tiene contraseña configurada" }

  const isValid = await compare(data.currentPassword, user.password)
  if (!isValid) return { error: "La contraseña actual es incorrecta" }

  const hashed = await hash(data.newPassword, 10)

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashed },
    })
  } catch (err) {
    console.error("Error actualizando contraseña:", err)
    return { error: "Error al actualizar la contraseña" }
  }

  return { success: true }
}
