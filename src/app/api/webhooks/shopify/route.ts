import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/db"
import { getShopifyCustomerById } from "@/lib/shopify"
import { sendEmail } from "@/lib/email"
import { extractAffiliateCode, grantAffiliateOrderReward, cancelAffiliateOrderReward } from "@/lib/affiliate"

function verifyShopifyHmac(body: string, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_CLIENT_SECRET
  if (!secret) return false
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

// Comisión de afiliado por una compra en la tienda de Shopify.
//
// El código del afiliado viaja como CÓDIGO DE DESCUENTO del pedido (order.discount_codes),
// un descuento de 0% que se crea automáticamente en Shopify por cada afiliado. Como
// fallback (compatibilidad hacia atrás) también se busca en la nota del pedido
// (order.note / note_attributes). Se aplica solo a pedidos que NO son de suscripción
// (esos pagan comisión por el flujo de Mercado Pago, una vez por referido) ni creados
// por la propia app. Es idempotente por id de pedido.
async function handleAffiliateOrderCommission(
  topic: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (isSubscriptionOrder(payload)) return
  if (((payload.source_name as string) || "") === "Happy Sapiens Suscriptions") return

  const orderId = payload.id != null ? String(payload.id) : ""
  if (!orderId) return

  // Cancelación/reembolso: anular la comisión del pedido (si existía).
  if (topic === "orders/cancelled") {
    await cancelAffiliateOrderReward(orderId)
    return
  }

  // orders/paid: el código viaja como código de descuento (fuente principal); la nota
  // y sus atributos quedan como fallback por compatibilidad.
  //
  // Se leen dos campos porque Shopify no siempre los llena igual: `discount_codes`
  // (legacy) y `discount_applications` (los descuentos por código nuevos suelen
  // aparecer aquí, con `code` para type=discount_code o `title`).
  const discountCodes =
    (payload.discount_codes as Array<{ code?: string }> | undefined) || []
  const discountApplications =
    (payload.discount_applications as Array<{ code?: string; title?: string }> | undefined) || []
  const discountText = [
    ...discountCodes.map((d) => d?.code ?? ""),
    ...discountApplications.map((d) => `${d?.code ?? ""} ${d?.title ?? ""}`),
  ].join(" ")

  const note = (payload.note as string) || ""
  const noteAttributes =
    (payload.note_attributes as Array<{ name?: string; value?: string }> | undefined) || []
  const attrText = noteAttributes.map((a) => `${a?.name ?? ""} ${a?.value ?? ""}`).join(" ")

  const code = extractAffiliateCode(discountText, note, attrText)
  if (!code) return

  const customer = payload.customer as Record<string, unknown> | undefined
  const customerEmail = (payload.email as string) || (customer?.email as string) || null
  const orderNumber = payload.order_number != null ? Number(payload.order_number) : null

  // Subtotal de productos (sin envío ni impuestos).
  const subtotalRaw =
    (payload.subtotal_price as string | undefined) ??
    (payload.current_subtotal_price as string | undefined) ??
    (payload.total_line_items_price as string | undefined)
  const subtotal = subtotalRaw != null ? Number(subtotalRaw) : null

  const result = await grantAffiliateOrderReward({
    code,
    shopifyOrderId: orderId,
    shopifyOrderNumber: orderNumber,
    customerEmail,
    orderSubtotal: subtotal,
  })
  console.log(
    `[shopify][afiliado] pedido ${orderNumber ?? orderId} código ${code} →`,
    JSON.stringify(result)
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

  // Comisión de afiliado por compra en la tienda (pedidos que no son de suscripción).
  // Se maneja aparte y no debe romper el flujo de suscripción si falla.
  try {
    await handleAffiliateOrderCommission(topic, payload)
  } catch (error) {
    console.error("Error procesando comisión de afiliado (Shopify):", error)
  }

  // El resto del handler solo aplica a órdenes de suscripción.
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

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: customer.email },
          { shopifyCustomerId: shopifyGid },
        ],
      },
      select: { id: true },
    })

    if (user) {
      // Actualizar suscripción del usuario existente
      await prisma.user.update({
        where: { id: user.id },
        data: {
          shopifyCustomerId: shopifyGid,
          subscriptionStatus: subscriptionStatus,
          subscriptionSyncedAt: new Date(),
        },
      })

      console.log(`Suscripción actualizada: ${customer.email} → ${subscriptionStatus}`)
    } else if (topic === "orders/paid") {
      // Crear usuario nuevo para suscriptores que no tienen cuenta
      const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.email
      const resetToken = randomBytes(32).toString("hex")
      const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas

      try {
        await prisma.user.create({
          data: {
            name,
            email: customer.email,
            role: "user",
            shopifyCustomerId: shopifyGid,
            subscriptionStatus: "active",
            subscriptionSyncedAt: new Date(),
            resetToken: resetToken,
            resetTokenExpires: resetTokenExpires,
          },
        })
        console.log(`Usuario creado: ${customer.email}`)
        await sendWelcomeEmail(customer.email, name, resetToken)
      } catch (createError) {
        console.error("Error creando usuario:", createError)
      }
    }
  } catch (error) {
    console.error("Error procesando webhook de Shopify:", error)
  }

  return NextResponse.json({ ok: true })
}
