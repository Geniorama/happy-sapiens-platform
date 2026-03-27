import { NextResponse } from "next/server"
import { registerShopifyWebhooks } from "@/lib/shopify"

// Endpoint de uso único para registrar los webhooks de suscripción en Shopify.
// Visita /api/shopify/setup-webhooks una vez después de obtener el SHOPIFY_ADMIN_API_TOKEN.
export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL!

  try {
    const results = await registerShopifyWebhooks(baseUrl)
    return NextResponse.json({ ok: true, results })
  } catch (error) {
    console.error("Error registrando webhooks:", error)
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    )
  }
}
