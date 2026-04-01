import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { ManageSubscriptionClient } from "./manage-client"

export default async function ManagePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("subscription_status, subscription_id")
    .eq("id", session.user.id)
    .single()

  if (!user?.subscription_id) redirect("/dashboard/subscription")

  return <ManageSubscriptionClient status={user.subscription_status ?? "inactive"} />
}
