import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { supabaseAdmin } from "@/lib/supabase"
import { getShopifyCustomerById } from "@/lib/shopify"

function verifyShopifyHmac(body: string, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_CLIENT_SECRET!
  const digest = crypto.createHmac("sha256", secret).update(body).digest("base64")
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader))
}

// Detectar si una orden es de suscripción (tiene selling plan)
function isSubscriptionOrder(payload: Record<string, unknown>): boolean {
  const lineItems = payload.line_items as Array<Record<string, unknown>> | undefined
  if (!lineItems?.length) return false
  return lineItems.some(
    (item) =>
      item.selling_plan_allocation != null ||
      (item.properties as Array<{ name: string }> | undefined)?.some(
        (p) => p.name === "_selling_plan_id" || p.name === "selling_plan_id"
      )
  )
}

export async function POST(request: NextRequest) {
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256")
  if (!hmacHeader) {
    return NextResponse.json({ error: "Sin firma HMAC" }, { status: 401 })
  }

  const body = await request.text()

  if (!verifyShopifyHmac(body, hmacHeader)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 })
  }

  const topic = request.headers.get("x-shopify-topic") ?? ""
  const payload = JSON.parse(body) as Record<string, unknown>

  if (topic !== "orders/paid" && topic !== "orders/cancelled") {
    return NextResponse.json({ ok: true })
  }

  // Solo procesar órdenes de suscripción
  if (!isSubscriptionOrder(payload)) {
    return NextResponse.json({ ok: true })
  }

  const numericCustomerId = payload.customer
    ? (payload.customer as Record<string, unknown>).id as number
    : null

  if (!numericCustomerId) {
    return NextResponse.json({ ok: true })
  }

  try {
    const customer = await getShopifyCustomerById(numericCustomerId)
    if (!customer) {
      console.error("Cliente no encontrado en Shopify:", numericCustomerId)
      return NextResponse.json({ ok: true })
    }

    const subscriptionStatus = topic === "orders/paid" ? "active" : "cancelled"
    const shopifyGid = customer.id

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .or(`email.eq.${customer.email},shopify_customer_id.eq.${shopifyGid}`)
      .single()

    if (!user) {
      console.log("Usuario no encontrado para:", customer.email)
      return NextResponse.json({ ok: true })
    }

    await supabaseAdmin
      .from("users")
      .update({
        shopify_customer_id: shopifyGid,
        subscription_status: subscriptionStatus,
        subscription_synced_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    console.log(`Suscripción actualizada: ${customer.email} → ${subscriptionStatus}`)
  } catch (error) {
    console.error("Error procesando webhook de Shopify:", error)
  }

  return NextResponse.json({ ok: true })
}
