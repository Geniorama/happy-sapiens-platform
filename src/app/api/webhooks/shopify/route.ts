import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { randomBytes } from "crypto"
import { supabaseAdmin } from "@/lib/supabase"
import { getShopifyCustomerById } from "@/lib/shopify"
import { sendEmail } from "@/lib/email"

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

async function sendWelcomeEmail(email: string, name: string, resetToken: string) {
  const appUrl = process.env.NEXTAUTH_URL || "https://happy-sapiens.netlify.app"
  const setupUrl = `${appUrl}/auth/reset-password?token=${resetToken}`

  await sendEmail({
    to: email,
    subject: "¡Bienvenido a Happy Sapiens! Crea tu contraseña",
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #18181b;">
        <img src="${appUrl}/hs-logo.svg" alt="Happy Sapiens" style="width: 160px; margin-bottom: 24px;" />
        <h2 style="margin-bottom: 8px;">¡Tu suscripción está activa!</h2>
        <p>Hola ${name},</p>
        <p>Tu suscripción a Happy Sapiens fue procesada exitosamente. Para acceder a la plataforma solo necesitas crear tu contraseña:</p>
        <a
          href="${setupUrl}"
          style="display:inline-block;margin:24px 0;padding:12px 28px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;"
        >
          Crear mi contraseña
        </a>
        <p style="color:#71717a;font-size:14px;">Este enlace es válido por 24 horas.</p>
        <p style="color:#71717a;font-size:14px;">Si el botón no funciona, copia y pega esta URL en tu navegador:<br/><a href="${setupUrl}" style="color:#16a34a;">${setupUrl}</a></p>
      </div>
    `,
  })
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

    if (user) {
      // Actualizar suscripción del usuario existente
      await supabaseAdmin
        .from("users")
        .update({
          shopify_customer_id: shopifyGid,
          subscription_status: subscriptionStatus,
          subscription_synced_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      console.log(`Suscripción actualizada: ${customer.email} → ${subscriptionStatus}`)
    } else if (topic === "orders/paid") {
      // Crear usuario nuevo para suscriptores que no tienen cuenta
      const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.email
      const resetToken = randomBytes(32).toString("hex")
      const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas

      const { error: createError } = await supabaseAdmin
        .from("users")
        .insert({
          name,
          email: customer.email,
          role: "user",
          shopify_customer_id: shopifyGid,
          subscription_status: "active",
          subscription_synced_at: new Date().toISOString(),
          reset_token: resetToken,
          reset_token_expires: resetTokenExpires.toISOString(),
        })

      if (createError) {
        console.error("Error creando usuario:", createError)
      } else {
        console.log(`Usuario creado: ${customer.email}`)
        await sendWelcomeEmail(customer.email, name, resetToken)
      }
    }
  } catch (error) {
    console.error("Error procesando webhook de Shopify:", error)
  }

  return NextResponse.json({ ok: true })
}
