'use server'

import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { preApprovalClient } from "@/lib/mercadopago"
import { redirect } from "next/navigation"

type ActionResult = { error: string } | { success: string }

async function getSubscriptionId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("subscription_id, subscription_status")
    .eq("id", session.user.id)
    .single()

  return user?.subscription_id ?? null
}

export async function pauseSubscription(months: 1 | 2 | 3): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  const subscriptionId = await getSubscriptionId()
  if (!subscriptionId) return { error: "No se encontró una suscripción activa" }

  try {
    await preApprovalClient.update({
      id: subscriptionId,
      body: { status: "paused" },
    })

    const pauseEndsAt = new Date()
    pauseEndsAt.setMonth(pauseEndsAt.getMonth() + months)

    await supabaseAdmin
      .from("users")
      .update({
        subscription_status: "paused",
        subscription_synced_at: new Date().toISOString(),
        subscription_pause_ends_at: pauseEndsAt.toISOString(),
      })
      .eq("id", session.user.id)
  } catch {
    return { error: "No se pudo pausar la suscripción. Intenta de nuevo." }
  }

  redirect("/dashboard/subscription")
}

export async function reactivateSubscription(): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  const subscriptionId = await getSubscriptionId()
  if (!subscriptionId) return { error: "No se encontró la suscripción" }

  try {
    await preApprovalClient.update({
      id: subscriptionId,
      body: { status: "authorized" },
    })

    await supabaseAdmin
      .from("users")
      .update({
        subscription_status: "active",
        subscription_synced_at: new Date().toISOString(),
        subscription_pause_ends_at: null,
      })
      .eq("id", session.user.id)
  } catch {
    return { error: "No se pudo reactivar la suscripción. Intenta de nuevo." }
  }

  redirect("/dashboard/subscription")
}

export async function cancelSubscription(reason?: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  const subscriptionId = await getSubscriptionId()
  if (!subscriptionId) return { error: "No se encontró la suscripción" }

  try {
    await preApprovalClient.update({
      id: subscriptionId,
      body: { status: "cancelled" },
    })

    await supabaseAdmin
      .from("users")
      .update({ subscription_status: "cancelled", subscription_synced_at: new Date().toISOString() })
      .eq("id", session.user.id)

    if (reason) {
      await supabaseAdmin.from("system_logs").insert({
        actor_email: session.user.email,
        action: "subscription.cancelled",
        entity_type: "subscription",
        metadata: { reason, subscription_id: subscriptionId },
      })
    }
  } catch {
    return { error: "No se pudo cancelar la suscripción. Intenta de nuevo." }
  }

  redirect("/dashboard/subscription")
}
