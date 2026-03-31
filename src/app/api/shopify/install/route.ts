import { NextResponse } from "next/server"
import crypto from "crypto"
import { cookies } from "next/headers"

export async function GET() {
  const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN!
  const clientId = process.env.SHOPIFY_CLIENT_ID!
  const baseUrl = process.env.NEXTAUTH_URL!

  const state = crypto.randomBytes(16).toString("hex")

  const cookieStore = await cookies()
  cookieStore.set("shopify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  })

  const redirectUri = `${baseUrl}/api/shopify/callback`
  const scopes = "read_customers,read_orders,write_orders"

  const authUrl =
    `https://${shopDomain}/admin/oauth/authorize` +
    `?client_id=${clientId}` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`

  return NextResponse.redirect(authUrl)
}
