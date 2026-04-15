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

export async function promoteToCoach(email: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!email?.trim()) return { error: "El email es requerido" }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, name: true, email: true, role: true },
  })

  if (!user) return { error: "No se encontró un usuario con ese email" }
  if (user.role === "coach") return { error: "Este usuario ya es coach" }
  if (user.role === "admin") return { error: "No se puede cambiar el rol de un administrador" }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "coach", isCoachActive: true },
    })
  } catch (err) {
    console.error("Error promoviendo coach:", err)
    return { error: "Error al actualizar el rol" }
  }

  revalidatePath("/admin/coaches")
  return { success: true, userName: user.name }
}

export async function removeCoachRole(userId: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: "user", isCoachActive: false },
    })
  } catch (err) {
    console.error("Error removiendo rol coach:", err)
    return { error: "Error al actualizar el rol" }
  }

  revalidatePath("/admin/coaches")
  return { success: true }
}

export async function bulkToggleCoachesActive(ids: string[], isActive: boolean) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  try {
    await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { isCoachActive: isActive },
    })
  } catch (err) {
    console.error("Error en bulk toggle coaches:", err)
    return { error: "Error al actualizar el estado" }
  }

  revalidatePath("/admin/coaches")
  return { success: true }
}

export async function bulkRemoveCoachRole(ids: string[]) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  try {
    await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { role: "user", isCoachActive: false },
    })
  } catch (err) {
    console.error("Error en bulk remove coach role:", err)
    return { error: "Error al quitar el rol" }
  }

  revalidatePath("/admin/coaches")
  return { success: true }
}

export async function toggleCoachActive(userId: string, isActive: boolean) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isCoachActive: isActive },
    })
  } catch (err) {
    console.error("Error toggling coach:", err)
    return { error: "Error al actualizar el estado" }
  }

  revalidatePath("/admin/coaches")
  return { success: true }
}
