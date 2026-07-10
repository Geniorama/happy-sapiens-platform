import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"

// Rol interno del perfil de afiliado. Un afiliado recomienda la plataforma con su
// referralCode y gana una recompensa en COP cada vez que un referido paga su
// suscripción. A diferencia de un usuario normal (que acumula puntos de
// gamificación), el afiliado acumula un saldo monetario que puede redimir.
export const AFFILIATE_ROLE = "afiliado"

const AFFILIATE_CONFIG_ID = "default"
const DEFAULT_REWARD_PERCENT = 15

// Fallback de porcentaje desde variable de entorno (cuando no hay config en BD).
function getRewardPercentFromEnv(): number {
  const raw = Number(process.env.AFFILIATE_REWARD_PERCENT)
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_REWARD_PERCENT
  return raw
}

// Porcentaje del precio del plan que se abona al afiliado por cada conversión.
// Prioridad: config editable en BD (admin) → variable de entorno → 15.
export async function getAffiliateRewardPercent(): Promise<number> {
  try {
    const config = await prisma.affiliateConfig.findUnique({
      where: { id: AFFILIATE_CONFIG_ID },
      select: { rewardPercent: true },
    })
    if (config?.rewardPercent != null) {
      const n = Number(config.rewardPercent)
      if (Number.isFinite(n) && n > 0) return n
    }
  } catch {
    // Si la BD/tabla no está disponible, usar el fallback de entorno.
  }
  return getRewardPercentFromEnv()
}

/** Guarda el porcentaje de recompensa configurable por el admin. */
export async function setAffiliateRewardPercent(
  percent: number,
  updatedById?: string
): Promise<{ success: boolean; error?: string }> {
  const value = Number(percent)
  if (!Number.isFinite(value) || value <= 0 || value > 100) {
    return { success: false, error: "El porcentaje debe estar entre 0 y 100" }
  }
  try {
    await prisma.affiliateConfig.upsert({
      where: { id: AFFILIATE_CONFIG_ID },
      create: { id: AFFILIATE_CONFIG_ID, rewardPercent: value, updatedById: updatedById ?? null },
      update: { rewardPercent: value, updatedById: updatedById ?? null },
    })
    return { success: true }
  } catch (err) {
    console.error("setAffiliateRewardPercent exception:", err)
    return { success: false, error: "No se pudo guardar el porcentaje" }
  }
}

/**
 * Abona la recompensa en COP a un afiliado por un referido que pagó su suscripción.
 *
 * Idempotente: la fila se llavea por `referredUserId` (unique), de modo que las
 * re-entregas del webhook de MercadoPago no duplican la recompensa. El monto es
 * un porcentaje del precio realmente cobrado, redondeado al peso.
 */
export async function grantAffiliateReward(opts: {
  affiliateId: string
  referredUserId: string
  planPrice: number | null | undefined
}): Promise<{ success: boolean; amount?: number; error?: string }> {
  const percent = await getAffiliateRewardPercent()
  const planPrice = Number(opts.planPrice)

  if (!Number.isFinite(planPrice) || planPrice <= 0) {
    return { success: false, error: "Precio de plan inválido para calcular la recompensa" }
  }

  const amount = Math.round((planPrice * percent) / 100)

  try {
    await prisma.affiliateReward.upsert({
      where: { referredUserId: opts.referredUserId },
      create: {
        affiliateId: opts.affiliateId,
        referredUserId: opts.referredUserId,
        amount,
        planPrice,
        rewardPercent: percent,
        note: `Recompensa por suscripción de referido (${percent}% de ${planPrice.toLocaleString("es-CO")})`,
      },
      // Ya existe: no reabonar. Solo re-asegurar el vínculo del afiliado.
      update: {},
    })
    return { success: true, amount }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al abonar la recompensa"
    console.error("grantAffiliateReward exception:", err)
    return { success: false, error: message }
  }
}

export interface AffiliateRewardRow {
  id: string
  amount: number
  planPrice: number | null
  rewardPercent: number | null
  createdAt: string
  referredUser: {
    id: string
    name: string | null
    email: string | null
    subscriptionStatus: string | null
  } | null
}

export const PAYOUT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  REJECTED: "rejected",
} as const

export type PayoutStatus = (typeof PAYOUT_STATUS)[keyof typeof PAYOUT_STATUS]

export interface AffiliatePayoutRow {
  id: string
  amount: number
  status: string
  payoutMethod: string | null
  adminNote: string | null
  createdAt: string
  resolvedAt: string | null
}

export interface AffiliateSummary {
  totalReferrals: number
  activeReferrals: number
  totalEarned: number
  totalPaid: number
  pendingPayout: number
  availableBalance: number
  currency: string
  rewardPercent: number
  rewards: AffiliateRewardRow[]
  payouts: AffiliatePayoutRow[]
}

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0
  return typeof value === "number" ? value : Number(value)
}

/**
 * Resumen del panel del afiliado: cantidad de referidos, referidos activos,
 * total ganado y saldo disponible (= total ganado, sin flujo de redención por ahora).
 */
export async function getAffiliateSummary(affiliateId: string): Promise<AffiliateSummary> {
  const [totalReferrals, activeReferrals, rewards, earnedAgg, payouts, rewardPercent] =
    await Promise.all([
      prisma.user.count({ where: { referredBy: affiliateId } }),
      prisma.user.count({ where: { referredBy: affiliateId, subscriptionStatus: "active" } }),
      prisma.affiliateReward.findMany({
        where: { affiliateId },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          referredUser: {
            select: { id: true, name: true, email: true, subscriptionStatus: true },
          },
        },
      }),
      prisma.affiliateReward.aggregate({
        where: { affiliateId },
        _sum: { amount: true },
      }),
      prisma.affiliatePayout.findMany({
        where: { affiliateId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      getAffiliateRewardPercent(),
    ])

  const totalEarned = toNumber(earnedAgg._sum.amount)

  // Un retiro pendiente reserva fondos; uno pagado los descuenta. Un retiro
  // rechazado libera los fondos (no cuenta). Disponible = ganado - pagado - pendiente.
  let totalPaid = 0
  let pendingPayout = 0
  for (const p of payouts) {
    if (p.status === PAYOUT_STATUS.PAID) totalPaid += toNumber(p.amount)
    else if (p.status === PAYOUT_STATUS.PENDING) pendingPayout += toNumber(p.amount)
  }

  return {
    totalReferrals,
    activeReferrals,
    totalEarned,
    totalPaid,
    pendingPayout,
    availableBalance: totalEarned - totalPaid - pendingPayout,
    currency: "COP",
    rewardPercent,
    rewards: rewards.map((r) => ({
      id: r.id,
      amount: toNumber(r.amount),
      planPrice: r.planPrice == null ? null : toNumber(r.planPrice),
      rewardPercent: r.rewardPercent == null ? null : toNumber(r.rewardPercent),
      createdAt: r.createdAt.toISOString(),
      referredUser: r.referredUser
        ? {
            id: r.referredUser.id,
            name: r.referredUser.name,
            email: r.referredUser.email,
            subscriptionStatus: r.referredUser.subscriptionStatus,
          }
        : null,
    })),
    payouts: payouts.map((p) => ({
      id: p.id,
      amount: toNumber(p.amount),
      status: p.status,
      payoutMethod: p.payoutMethod,
      adminNote: p.adminNote,
      createdAt: p.createdAt.toISOString(),
      resolvedAt: p.resolvedAt ? p.resolvedAt.toISOString() : null,
    })),
  }
}

export interface AffiliateReportItem {
  id: string
  name: string | null
  email: string | null
  referralCode: string | null
  totalReferrals: number
  activeReferrals: number
  totalEarned: number
  totalPaid: number
  pendingPayout: number
  availableBalance: number
}

export interface AffiliatesReport {
  totals: {
    affiliates: number
    referrals: number
    earned: number
    paid: number
    pending: number
  }
  affiliates: AffiliateReportItem[]
}

/**
 * Reporte global de afiliados para el admin: por cada afiliado, sus referidos,
 * ganancias, pagos y saldo; más los totales agregados.
 */
export async function getAffiliatesReport(): Promise<AffiliatesReport> {
  const affiliates = await prisma.user.findMany({
    where: { role: AFFILIATE_ROLE },
    select: { id: true, name: true, email: true, referralCode: true },
    orderBy: { createdAt: "desc" },
  })
  const ids = affiliates.map((a) => a.id)

  if (ids.length === 0) {
    return { totals: { affiliates: 0, referrals: 0, earned: 0, paid: 0, pending: 0 }, affiliates: [] }
  }

  const [referralsBy, activeReferralsBy, earnedBy, payoutsBy] = await Promise.all([
    prisma.user.groupBy({
      by: ["referredBy"],
      where: { referredBy: { in: ids } },
      _count: { _all: true },
    }),
    prisma.user.groupBy({
      by: ["referredBy"],
      where: { referredBy: { in: ids }, subscriptionStatus: "active" },
      _count: { _all: true },
    }),
    prisma.affiliateReward.groupBy({
      by: ["affiliateId"],
      where: { affiliateId: { in: ids } },
      _sum: { amount: true },
    }),
    prisma.affiliatePayout.groupBy({
      by: ["affiliateId", "status"],
      where: { affiliateId: { in: ids } },
      _sum: { amount: true },
    }),
  ])

  const referralsMap = new Map<string, number>()
  for (const r of referralsBy) if (r.referredBy) referralsMap.set(r.referredBy, r._count._all)
  const activeMap = new Map<string, number>()
  for (const r of activeReferralsBy) if (r.referredBy) activeMap.set(r.referredBy, r._count._all)
  const earnedMap = new Map<string, number>()
  for (const r of earnedBy) earnedMap.set(r.affiliateId, toNumber(r._sum.amount))
  const paidMap = new Map<string, number>()
  const pendingMap = new Map<string, number>()
  for (const r of payoutsBy) {
    const amt = toNumber(r._sum.amount)
    if (r.status === PAYOUT_STATUS.PAID) paidMap.set(r.affiliateId, (paidMap.get(r.affiliateId) ?? 0) + amt)
    else if (r.status === PAYOUT_STATUS.PENDING)
      pendingMap.set(r.affiliateId, (pendingMap.get(r.affiliateId) ?? 0) + amt)
  }

  const items: AffiliateReportItem[] = affiliates.map((a) => {
    const totalEarned = earnedMap.get(a.id) ?? 0
    const totalPaid = paidMap.get(a.id) ?? 0
    const pendingPayout = pendingMap.get(a.id) ?? 0
    return {
      id: a.id,
      name: a.name,
      email: a.email,
      referralCode: a.referralCode,
      totalReferrals: referralsMap.get(a.id) ?? 0,
      activeReferrals: activeMap.get(a.id) ?? 0,
      totalEarned,
      totalPaid,
      pendingPayout,
      availableBalance: totalEarned - totalPaid - pendingPayout,
    }
  })

  items.sort((a, b) => b.totalEarned - a.totalEarned)

  const totals = items.reduce(
    (acc, it) => {
      acc.referrals += it.totalReferrals
      acc.earned += it.totalEarned
      acc.paid += it.totalPaid
      acc.pending += it.pendingPayout
      return acc
    },
    { affiliates: items.length, referrals: 0, earned: 0, paid: 0, pending: 0 }
  )

  return { totals, affiliates: items }
}

export interface PendingPayoutRow {
  id: string
  amount: number
  payoutMethod: string | null
  createdAt: string
  affiliate: { id: string; name: string | null; email: string | null } | null
}

/** Solicitudes de retiro pendientes de resolución (para el admin). */
export async function getPendingPayouts(): Promise<PendingPayoutRow[]> {
  const rows = await prisma.affiliatePayout.findMany({
    where: { status: PAYOUT_STATUS.PENDING },
    orderBy: { createdAt: "asc" },
    include: { affiliate: { select: { id: true, name: true, email: true } } },
  })
  return rows.map((p) => ({
    id: p.id,
    amount: toNumber(p.amount),
    payoutMethod: p.payoutMethod,
    createdAt: p.createdAt.toISOString(),
    affiliate: p.affiliate
      ? { id: p.affiliate.id, name: p.affiliate.name, email: p.affiliate.email }
      : null,
  }))
}

/**
 * Saldo disponible de un afiliado = recompensas ganadas - retiros pagados - retiros pendientes.
 */
export async function getAffiliateAvailableBalance(affiliateId: string): Promise<number> {
  const [earnedAgg, reservedAgg] = await Promise.all([
    prisma.affiliateReward.aggregate({
      where: { affiliateId },
      _sum: { amount: true },
    }),
    prisma.affiliatePayout.aggregate({
      where: { affiliateId, status: { in: [PAYOUT_STATUS.PENDING, PAYOUT_STATUS.PAID] } },
      _sum: { amount: true },
    }),
  ])
  return toNumber(earnedAgg._sum.amount) - toNumber(reservedAgg._sum.amount)
}

/**
 * Crea una solicitud de retiro (pendiente) por un monto que no supere el saldo
 * disponible. Recalcula el disponible dentro de una transacción para evitar que
 * dos solicitudes concurrentes reserven más de lo que hay.
 */
export async function requestAffiliatePayout(opts: {
  affiliateId: string
  amount: number
  payoutMethod?: string | null
}): Promise<{ success: boolean; payoutId?: string; error?: string }> {
  const amount = Math.round(Number(opts.amount))
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "El monto debe ser mayor a cero" }
  }

  try {
    const payoutId = await prisma.$transaction(async (tx) => {
      const [earnedAgg, reservedAgg] = await Promise.all([
        tx.affiliateReward.aggregate({
          where: { affiliateId: opts.affiliateId },
          _sum: { amount: true },
        }),
        tx.affiliatePayout.aggregate({
          where: {
            affiliateId: opts.affiliateId,
            status: { in: [PAYOUT_STATUS.PENDING, PAYOUT_STATUS.PAID] },
          },
          _sum: { amount: true },
        }),
      ])
      const available = toNumber(earnedAgg._sum.amount) - toNumber(reservedAgg._sum.amount)
      if (amount > available) {
        throw new Error(
          `Saldo insuficiente: disponible ${available.toLocaleString("es-CO")}, solicitado ${amount.toLocaleString("es-CO")}`
        )
      }

      const created = await tx.affiliatePayout.create({
        data: {
          affiliateId: opts.affiliateId,
          amount,
          status: PAYOUT_STATUS.PENDING,
          payoutMethod: opts.payoutMethod?.trim() || null,
        },
        select: { id: true },
      })
      return created.id
    })

    return { success: true, payoutId }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al solicitar el retiro"
    console.error("requestAffiliatePayout exception:", err)
    return { success: false, error: message }
  }
}
