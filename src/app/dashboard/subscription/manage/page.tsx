import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { ManageSubscriptionClient } from "./manage-client"

export default async function ManagePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("subscription_status, subscription_id, subscription_end_date")
    .eq("id", session.user.id)
    .single()

  if (!user?.subscription_id) redirect("/dashboard/subscription")

  const canCancel = user.subscription_end_date
    ? new Date(user.subscription_end_date).getTime() - Date.now() >= 30 * 24 * 60 * 60 * 1000
    : true

  const nextBillingDate = user.subscription_end_date ?? null

  return (
    <ManageSubscriptionClient
      status={user.subscription_status ?? "inactive"}
      canCancel={canCancel}
      nextBillingDate={nextBillingDate}
    />
  )
}
