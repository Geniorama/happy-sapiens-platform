"use server"

import { auth } from "@/lib/auth"
import {
  AFFILIATE_ROLE,
  getAffiliateSummary,
  requestAffiliatePayout,
  type AffiliateSummary,
} from "@/lib/affiliate"
import { ensureReferralCode } from "@/lib/referral-code"
import { revalidatePath } from "next/cache"

export interface AffiliateData {
  referralCode: string
  summary: AffiliateSummary
}

export async function getAffiliateData(): Promise<
  { data: AffiliateData; error?: undefined } | { data?: undefined; error: string }
> {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== AFFILIATE_ROLE) {
    return { error: "No autorizado" }
  }

  try {
    const [referralCode, summary] = await Promise.all([
      ensureReferralCode(session.user.id),
      getAffiliateSummary(session.user.id),
    ])
    return { data: { referralCode, summary } }
  } catch (err) {
    console.error("getAffiliateData error:", err)
    return { error: "No se pudieron cargar tus datos de afiliado" }
  }
}

export async function requestPayout(input: {
  amount: number
  payoutMethod?: string
}): Promise<{ success: true } | { error: string }> {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== AFFILIATE_ROLE) {
    return { error: "No autorizado" }
  }

  const result = await requestAffiliatePayout({
    affiliateId: session.user.id,
    amount: input.amount,
    payoutMethod: input.payoutMethod,
  })

  if (!result.success) {
    return { error: result.error ?? "No se pudo solicitar el retiro" }
  }

  revalidatePath("/afiliado")
  return { success: true }
}
