import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { saveGoogleTokens } from "@/lib/google-calendar"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000"

  if (error || !code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/coach/availability?calendar_error=access_denied`
    )
  }

  // Verificar state y recuperar coachId de la cookie
  const cookieStore = await cookies()
  const storedCookie = cookieStore.get("google_calendar_state")?.value
  if (!storedCookie) {
    return NextResponse.redirect(`${baseUrl}/coach/availability?calendar_error=invalid_state`)
  }

  const [storedState, coachId] = storedCookie.split(":")
  if (storedState !== state || !coachId) {
    return NextResponse.redirect(`${baseUrl}/coach/availability?calendar_error=invalid_state`)
  }

  // Limpiar cookie
  cookieStore.delete("google_calendar_state")

  // Intercambiar code por tokens
  const redirectUri = `${baseUrl}/api/coach/calendar/google/callback`
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${baseUrl}/coach/availability?calendar_error=token_exchange`)
  }

  const tokenData = await tokenRes.json()
  const { access_token, refresh_token, expires_in } = tokenData

  // Obtener email del calendario
  let calendarEmail = ""
  try {
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const userInfo = await userRes.json()
    calendarEmail = userInfo.email || ""
  } catch {}

  // Guardar en DB
  const saved = await saveGoogleTokens({
    coachId,
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresIn: expires_in,
    calendarEmail,
  })

  if (!saved.success) {
    return NextResponse.redirect(`${baseUrl}/coach/availability?calendar_error=db_save`)
  }

  revalidatePath("/coach/availability")
  return NextResponse.redirect(`${baseUrl}/coach/availability?calendar_connected=google`)
}
