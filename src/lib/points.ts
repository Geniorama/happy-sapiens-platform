import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"

/** Tipos de acción que otorgan o gastan puntos */
export const POINT_ACTIONS = {
  // Registro y perfil
  SIGNUP: "signup",
  COMPLETE_PROFILE: "complete_profile",
  COMPLETE_HEALTH_PROFILE: "complete_health_profile",
  UPLOAD_AVATAR: "upload_avatar",

  // Engagement
  FIRST_LOGIN: "first_login",

  // Citas y coaches
  BOOK_APPOINTMENT: "book_appointment",
  COMPLETE_APPOINTMENT: "complete_appointment",
  CANCEL_APPOINTMENT: "cancel_appointment",

  // Referidos
  REFERRAL_SIGNUP: "referral_signup",
  REFERRAL_SUBSCRIBED: "referral_subscribed",

  // Suscripción
  SUBSCRIPTION_ACTIVE: "subscription_active",

  // Canje (gasto)
  REDEEM_REWARD: "redeem_reward",
} as const

export type PointActionType = (typeof POINT_ACTIONS)[keyof typeof POINT_ACTIONS]

/** Puntos por cada tipo de acción (puedes ajustar según tu gamificación) */
export const POINTS_BY_ACTION: Record<PointActionType, number> = {
  [POINT_ACTIONS.SIGNUP]: 50,
  [POINT_ACTIONS.COMPLETE_PROFILE]: 30,
  [POINT_ACTIONS.COMPLETE_HEALTH_PROFILE]: 40,
  [POINT_ACTIONS.UPLOAD_AVATAR]: 10,
  [POINT_ACTIONS.FIRST_LOGIN]: 5,
  [POINT_ACTIONS.BOOK_APPOINTMENT]: 15,
  [POINT_ACTIONS.COMPLETE_APPOINTMENT]: 25,
  [POINT_ACTIONS.CANCEL_APPOINTMENT]: -5,
  [POINT_ACTIONS.REFERRAL_SIGNUP]: 20,
  [POINT_ACTIONS.REFERRAL_SUBSCRIBED]: 100,
  [POINT_ACTIONS.SUBSCRIPTION_ACTIVE]: 50,
  [POINT_ACTIONS.REDEEM_REWARD]: 0, // Se usa con amount negativo al llamar spendPoints
}

export interface AwardPointsOptions {
  userId: string
  actionType: PointActionType
  description?: string
  referenceType?: string
  referenceId?: string
  metadata?: Record<string, unknown>
  /** Si no se pasa, se usa POINTS_BY_ACTION[actionType] */
  amount?: number
}

export interface SpendPointsOptions {
  userId: string
  amount: number
  actionType: string
  description?: string
  referenceType?: string
  referenceId?: string
  metadata?: Record<string, unknown>
}

export interface PointTransaction {
  id: string
  user_id: string
  amount: number
  action_type: string
  description: string | null
  reference_type: string | null
  reference_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

/**
 * Otorga puntos a un usuario por una acción.
 * Inserta una transacción y actualiza el saldo en una transacción atómica.
 */
export async function awardPoints(
  options: AwardPointsOptions
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const amount = options.amount ?? POINTS_BY_ACTION[options.actionType]
  if (amount == null || amount <= 0) {
    return { success: false, error: "Puntos no configurados o inválidos para esta acción" }
  }

  // Administradores, usuarios con suscripción pausada o cancelada no acumulan puntos
  try {
    const recipient = await prisma.user.findUnique({
      where: { id: options.userId },
      select: { role: true, subscriptionStatus: true },
    })
    if (recipient?.role === "admin") return { success: true }
    if (
      recipient?.subscriptionStatus === "paused" ||
      recipient?.subscriptionStatus === "cancelled"
    ) {
      return { success: true }
    }
  } catch {
    // Si falla la verificación, continuar normalmente
  }

  try {
    const transactionId = await prisma.$transaction(async (tx) => {
      const created = await tx.pointTransaction.create({
        data: {
          userId: options.userId,
          amount,
          actionType: options.actionType,
          description: options.description ?? null,
          referenceType: options.referenceType ?? null,
          referenceId: options.referenceId ?? null,
          metadata: (options.metadata ?? {}) as Prisma.InputJsonValue,
        },
        select: { id: true },
      })

      await tx.userPoints.upsert({
        where: { userId: options.userId },
        create: { userId: options.userId, totalPoints: amount },
        update: { totalPoints: { increment: amount } },
      })

      return created.id
    })

    return { success: true, transactionId }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al otorgar puntos"
    console.error("awardPoints exception:", err)
    return { success: false, error: message }
  }
}

/**
 * Descuenta puntos (ej. canje de recompensa).
 * Valida saldo y aplica en transacción atómica.
 */
export async function spendPoints(
  options: SpendPointsOptions
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  if (options.amount <= 0) {
    return { success: false, error: "El monto debe ser positivo" }
  }

  try {
    const transactionId = await prisma.$transaction(async (tx) => {
      const balance = await tx.userPoints.findUnique({
        where: { userId: options.userId },
        select: { totalPoints: true },
      })

      const current = balance?.totalPoints ?? 0
      if (current < options.amount) {
        throw new Error(`Saldo insuficiente: tiene ${current}, necesita ${options.amount}`)
      }

      const created = await tx.pointTransaction.create({
        data: {
          userId: options.userId,
          amount: -options.amount,
          actionType: options.actionType,
          description: options.description ?? null,
          referenceType: options.referenceType ?? null,
          referenceId: options.referenceId ?? null,
          metadata: (options.metadata ?? {}) as Prisma.InputJsonValue,
        },
        select: { id: true },
      })

      await tx.userPoints.update({
        where: { userId: options.userId },
        data: { totalPoints: { decrement: options.amount } },
      })

      return created.id
    })

    return { success: true, transactionId }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al descontar puntos"
    console.error("spendPoints exception:", err)
    return { success: false, error: message }
  }
}

/**
 * Obtiene el saldo actual de puntos de un usuario.
 */
export async function getPointsBalance(userId: string): Promise<number> {
  const data = await prisma.userPoints.findUnique({
    where: { userId },
    select: { totalPoints: true },
  })
  return data?.totalPoints ?? 0
}

/**
 * Verifica si un usuario ya recibió puntos por una acción específica (para acciones de una sola vez).
 */
export async function hasEarnedPoints(
  userId: string,
  actionType: PointActionType
): Promise<boolean> {
  const count = await prisma.pointTransaction.count({
    where: { userId, actionType },
  })
  return count > 0
}

/**
 * Otorga puntos solo si el usuario aún no los recibió por esa acción (idempotente).
 */
export async function awardPointsOnce(
  options: AwardPointsOptions
): Promise<{ success: boolean; alreadyEarned?: boolean; error?: string }> {
  const already = await hasEarnedPoints(options.userId, options.actionType)
  if (already) return { success: true, alreadyEarned: true }
  return awardPoints(options)
}

/**
 * Obtiene el historial de transacciones de puntos de un usuario.
 */
export async function getPointsHistory(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<PointTransaction[]> {
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  const rows = await prisma.pointTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: limit,
  })

  return rows.map((r) => ({
    id: r.id,
    user_id: r.userId,
    amount: r.amount,
    action_type: r.actionType,
    description: r.description,
    reference_type: r.referenceType,
    reference_id: r.referenceId,
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
    created_at: r.createdAt.toISOString(),
  }))
}
