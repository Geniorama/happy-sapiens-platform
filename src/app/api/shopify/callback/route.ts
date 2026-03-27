import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const shop = searchParams.get("shop")

  if (!code || !state || !shop) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 })
  }

  // Verificar state para prevenir CSRF
  const cookieStore = await cookies()
  const storedState = cookieStore.get("shopify_oauth_state")?.value

  if (state !== storedState) {
    return NextResponse.json({ error: "State inválido" }, { status: 403 })
  }

  // Intercambiar código por access token
  const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      code,
    }),
  })

  const tokenData = await tokenResponse.json()

  if (!tokenResponse.ok || !tokenData.access_token) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:2rem">
        <h2>❌ Error al obtener el token</h2>
        <pre>${JSON.stringify(tokenData, null, 2)}</pre>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    )
  }

  cookieStore.delete("shopify_oauth_state")

  return new NextResponse(
    `<html>
    <head><title>Shopify conectado</title></head>
    <body style="font-family:sans-serif;padding:2rem;max-width:600px;margin:0 auto">
      <h2>✅ Shopify conectado correctamente</h2>
      <p>Copia este valor y agrégalo a tus variables de entorno <code>.env.local</code> y en producción:</p>
      <pre style="background:#f4f4f4;padding:1rem;border-radius:6px;overflow-x:auto;font-size:14px">SHOPIFY_ADMIN_API_TOKEN=${tokenData.access_token}</pre>
      <p style="color:#e53e3e"><strong>⚠️ No compartas este token. Solo se muestra una vez.</strong></p>
      <p>Después de guardarlo, reinicia el servidor de desarrollo.</p>
    </body>
    </html>`,
    { headers: { "Content-Type": "text/html" } }
  )
}
