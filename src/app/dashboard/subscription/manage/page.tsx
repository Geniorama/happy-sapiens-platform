import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { getSubscriptionPlan } from "@/lib/mercadopago"
import { ManageSubscriptionClient } from "./manage-client"

const PRODUCT_LABELS: Record<string, string> = {
  "happy-on": "Happy On",
  "happy-off": "Happy Off",
  "happy-blend": "Happy Blend",
}

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ sub?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const { sub: subId } = await searchParams

  let status = "inactive"
  let endDate: Date | null = null
  let product: string | null = null
  let rowId: string | null = null

  try {
    if (subId) {
      // Gestión de una suscripción concreta (fila Subscription).
      const row = await prisma.subscription.findUnique({
        where: { id: subId },
        select: { id: true, userId: true, status: true, endDate: true, product: true },
      })
      if (!row || row.userId !== session.user.id) redirect("/dashboard/subscription")
      status = row!.status
      endDate = row!.endDate
      product = row!.product
      rowId = row!.id
    } else {
      // Retro-compatibilidad: suscripción primaria reflejada en columnas del user.
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { subscriptionStatus: true, subscriptionId: true, subscriptionEndDate: true, subscriptionProduct: true },
      })
      if (!user?.subscriptionId) redirect("/dashboard/subscription")
      status = user!.subscriptionStatus ?? "inactive"
      endDate = user!.subscriptionEndDate
      product = user!.subscriptionProduct
    }
  } catch {
    redirect("/dashboard/subscription")
  }

  const subscriptionEndDateIso = endDate ? endDate.toISOString() : null

  const canCancel = subscriptionEndDateIso
    ? new Date(subscriptionEndDateIso).getTime() - Date.now() >= 30 * 24 * 60 * 60 * 1000
    : true

  const plan = product ? await getSubscriptionPlan(product) : null
  const productLabel = product ? PRODUCT_LABELS[product] ?? plan?.title ?? null : null

  return (
    <ManageSubscriptionClient
      status={status}
      canCancel={canCancel}
      nextBillingDate={subscriptionEndDateIso}
      subscriptionRowId={rowId ?? undefined}
      productLabel={productLabel}
    />
  )
}
