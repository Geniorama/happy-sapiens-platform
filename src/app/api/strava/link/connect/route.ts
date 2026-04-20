import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { cookies } from "next/headers"
import { createHmac } from "crypto"

const SCOPES = ["read", "profile:read_all", "activity:read_all"].join(",")

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== "user" && role !== "coach") {
    return NextResponse.json({ error: "Rol no permitido" }, { status: 403 })
  }

  const state = createHmac("sha256", process.env.NEXTAUTH_SECRET!)
    .update(session.user.id + Date.now())
    .digest("hex")
    .slice(0, 24)

  const cookieStore = await cookies()
  cookieStore.set("strava_link_state", `${state}:${session.user.id}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  })

  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000"
  const redirectUri = `${baseUrl}/api/strava/link/callback`

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    approval_prompt: "auto",
    state,
  })

  return NextResponse.redirect(
    `https://www.strava.com/oauth/authorize?${params}`
  )
}
