import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { ManageSubscriptionClient } from "./manage-client"

export default async function ManagePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      subscriptionStatus: true,
      subscriptionId: true,
      subscriptionEndDate: true,
    },
  })

  if (!user?.subscriptionId) redirect("/dashboard/subscription")

  const subscriptionEndDateIso = user.subscriptionEndDate
    ? user.subscriptionEndDate.toISOString()
    : null

  const canCancel = subscriptionEndDateIso
    ? new Date(subscriptionEndDateIso).getTime() - Date.now() >= 30 * 24 * 60 * 60 * 1000
    : true

  const nextBillingDate = subscriptionEndDateIso

  return (
    <ManageSubscriptionClient
      status={user.subscriptionStatus ?? "inactive"}
      canCancel={canCancel}
      nextBillingDate={nextBillingDate}
    />
  )
}
