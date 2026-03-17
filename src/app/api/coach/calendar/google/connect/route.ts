import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { cookies } from "next/headers"
import { createHmac } from "crypto"

const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ")

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== "coach") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Generar state con HMAC para protección CSRF
  const state = createHmac("sha256", process.env.NEXTAUTH_SECRET!)
    .update(session.user.id + Date.now())
    .digest("hex")
    .slice(0, 24)

  // Guardar state + coachId en cookie (HttpOnly, 10 min)
  const cookieStore = await cookies()
  cookieStore.set("google_calendar_state", `${state}:${session.user.id}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  })

  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000"
  const redirectUri = `${baseUrl}/api/coach/calendar/google/callback`

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",    // para obtener refresh_token
    prompt: "consent",          // fuerza nuevo refresh_token
    state,
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )
}
