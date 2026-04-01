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

export async function pauseSubscription(): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  const subscriptionId = await getSubscriptionId()
  if (!subscriptionId) return { error: "No se encontró una suscripción activa" }

  try {
    await preApprovalClient.update({
      id: subscriptionId,
      body: { status: "paused" },
    })

    await supabaseAdmin
      .from("users")
      .update({ subscription_status: "paused", subscription_synced_at: new Date().toISOString() })
      .eq("id", session.user.id)

    redirect("/dashboard/subscription")
  } catch {
    return { error: "No se pudo pausar la suscripción. Intenta de nuevo." }
  }
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
      .update({ subscription_status: "active", subscription_synced_at: new Date().toISOString() })
      .eq("id", session.user.id)

    redirect("/dashboard/subscription")
  } catch {
    return { error: "No se pudo reactivar la suscripción. Intenta de nuevo." }
  }
}

export async function cancelSubscription(): Promise<ActionResult> {
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

    redirect("/dashboard/subscription")
  } catch {
    return { error: "No se pudo cancelar la suscripción. Intenta de nuevo." }
  }
}
