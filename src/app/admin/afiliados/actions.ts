"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { logAdminAction } from "@/lib/log"
import { PAYOUT_STATUS, setAffiliateRewardPercent } from "@/lib/affiliate"
import { revalidatePath } from "next/cache"

async function getAdminSession() {
  const session = await auth()
  if (!session?.user?.id) return null
  if (session.user.role !== "admin") return null
  return session
}

/**
 * Resuelve una solicitud de retiro pendiente: 'paid' (pagada, se mantiene el
 * descuento del saldo) o 'rejected' (rechazada, libera los fondos).
 */
export async function resolveAffiliatePayout(
  payoutId: string,
  action: "paid" | "rejected",
  adminNote?: string
): Promise<{ success: true } | { error: string }> {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const payout = await prisma.affiliatePayout.findUnique({
    where: { id: payoutId },
    select: {
      id: true,
      status: true,
      amount: true,
      affiliate: { select: { id: true, email: true } },
    },
  })

  if (!payout) return { error: "Solicitud no encontrada" }
  if (payout.status !== PAYOUT_STATUS.PENDING) {
    return { error: "La solicitud ya fue resuelta" }
  }

  const newStatus = action === "paid" ? PAYOUT_STATUS.PAID : PAYOUT_STATUS.REJECTED

  try {
    await prisma.affiliatePayout.update({
      where: { id: payoutId },
      data: {
        status: newStatus,
        adminNote: adminNote?.trim() || null,
        resolvedById: session.user.id,
        resolvedAt: new Date(),
      },
    })
  } catch (err) {
    console.error("resolveAffiliatePayout error:", err)
    return { error: "No se pudo actualizar la solicitud" }
  }

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: newStatus === PAYOUT_STATUS.PAID ? "affiliate.payout_paid" : "affiliate.payout_rejected",
    entityType: "affiliate_payout",
    entityId: payoutId,
    metadata: {
      affiliate_id: payout.affiliate?.id ?? null,
      affiliate_email: payout.affiliate?.email ?? null,
      amount: Number(payout.amount),
      note: adminNote?.trim() || null,
    },
  })

  revalidatePath("/admin/afiliados")
  return { success: true }
}

/** Actualiza el porcentaje de recompensa por referido (config editable). */
export async function updateRewardPercent(
  percent: number
): Promise<{ success: true } | { error: string }> {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const result = await setAffiliateRewardPercent(percent, session.user.id)
  if (!result.success) {
    return { error: result.error ?? "No se pudo guardar el porcentaje" }
  }

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: "affiliate.reward_percent_changed",
    entityType: "affiliate_config",
    metadata: { percent: Number(percent) },
  })

  revalidatePath("/admin/afiliados")
  return { success: true }
}
