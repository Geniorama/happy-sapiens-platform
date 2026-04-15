"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { awardPoints, spendPoints, type PointActionType } from "@/lib/points"

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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, name: true },
  })

  if (!user) return { error: "Usuario no encontrado" }
  if (user.role === "admin") return { error: "No se pueden ajustar puntos de un administrador" }

  const absAmount = Math.abs(amount)
  const actionType = amount > 0 ? "admin_adjustment" : "admin_deduction"

  const result =
    amount > 0
      ? await awardPoints({
          userId,
          actionType: actionType as PointActionType,
          amount: absAmount,
          description: description.trim(),
          referenceType: "admin",
          metadata: { adjusted_by: session.user.id },
        })
      : await spendPoints({
          userId,
          amount: absAmount,
          actionType,
          description: description.trim(),
          referenceType: "admin",
          metadata: { adjusted_by: session.user.id },
        })

  if (!result.success) {
    console.error("Error ajustando puntos:", result.error)
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

  const absAmount = Math.abs(amount)
  const actionType = amount > 0 ? "admin_adjustment" : "admin_deduction"

  for (const userId of userIds) {
    const result =
      amount > 0
        ? await awardPoints({
            userId,
            actionType: actionType as PointActionType,
            amount: absAmount,
            description: description.trim(),
            referenceType: "admin",
            metadata: { adjusted_by: session.user.id },
          })
        : await spendPoints({
            userId,
            amount: absAmount,
            actionType,
            description: description.trim(),
            referenceType: "admin",
            metadata: { adjusted_by: session.user.id },
          })

    if (!result.success) {
      console.error("Error en bulk adjust points:", result.error)
      return { error: "Error al ajustar los puntos de uno o más usuarios" }
    }
  }

  revalidatePath("/admin/points")
  return { success: true }
}

export async function getPointsHistory(userId: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado", history: [] }

  try {
    const rows = await prisma.pointTransaction.findMany({
      where: { userId },
      select: {
        id: true,
        amount: true,
        actionType: true,
        description: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    const history = rows.map((r) => ({
      id: r.id,
      amount: r.amount,
      action_type: r.actionType,
      description: r.description,
      created_at: r.createdAt.toISOString(),
    }))

    return { history }
  } catch (err) {
    console.error("Error al obtener historial:", err)
    return { error: "Error al obtener historial", history: [] }
  }
}
