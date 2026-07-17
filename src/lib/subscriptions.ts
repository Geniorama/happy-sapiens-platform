import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"

// Estados de una suscripción individual.
export const SUB_STATUS = {
  ACTIVE: "active",
  PAUSED: "paused",
  PAST_DUE: "past_due",
  CANCELLED: "cancelled",
  INACTIVE: "inactive",
  PENDING: "pending",
} as const

// Prioridad para el estado de acceso DERIVADO del usuario (a partir del conjunto
// de sus suscripciones). Si tiene al menos una activa, el usuario está activo.
const STATUS_PRIORITY = ["active", "past_due", "paused", "cancelled", "inactive"]

function deriveUserStatus(statuses: string[]): string {
  for (const s of STATUS_PRIORITY) {
    if (statuses.includes(s)) return s
  }
  return "inactive"
}

type SubRow = {
  status: string
  mpPreapprovalId: string | null
  product: string | null
  price: Prisma.Decimal | null
  variantId: string | null
  taxExempt: boolean
  startDate: Date | null
  endDate: Date | null
  pauseEndsAt: Date | null
}

// Elige la suscripción "primaria" que se refleja en las columnas User.subscription*
// (para compatibilidad con las vistas de una sola suscripción): prioriza activa,
// luego past_due, luego paused; si no, la más reciente (ya viene ordenada desc).
function pickPrimary<T extends SubRow>(subs: T[]): T | null {
  if (subs.length === 0) return null
  for (const st of [SUB_STATUS.ACTIVE, SUB_STATUS.PAST_DUE, SUB_STATUS.PAUSED]) {
    const found = subs.find((s) => s.status === st)
    if (found) return found
  }
  return subs[0]
}

/**
 * Recalcula el estado de acceso derivado del usuario y refleja la suscripción
 * primaria en las columnas User.subscription* (denormalización para retro-compat).
 * Debe llamarse tras cualquier cambio en las suscripciones del usuario.
 */
export async function recomputeUserSubscription(userId: string): Promise<void> {
  const subs = await prisma.subscription.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      status: true,
      mpPreapprovalId: true,
      product: true,
      price: true,
      variantId: true,
      taxExempt: true,
      startDate: true,
      endDate: true,
      pauseEndsAt: true,
    },
  })

  const derived = deriveUserStatus(subs.map((s) => s.status))
  const primary = pickPrimary(subs)

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: derived,
      subscriptionId: primary?.mpPreapprovalId ?? null,
      subscriptionProduct: primary?.product ?? null,
      subscriptionPrice: primary?.price ?? null,
      subscriptionVariantId: primary?.variantId ?? null,
      subscriptionTaxExempt: primary?.taxExempt ?? false,
      subscriptionStartDate: primary?.startDate ?? null,
      subscriptionEndDate: primary?.endDate ?? null,
      subscriptionPauseEndsAt: primary?.pauseEndsAt ?? null,
      subscriptionSyncedAt: new Date(),
    },
  })
}

/** Busca una suscripción por su preapproval de MercadoPago, con el usuario. */
export async function findSubscriptionByPreapproval(mpPreapprovalId: string) {
  return prisma.subscription.findUnique({
    where: { mpPreapprovalId },
    include: { user: true },
  })
}
