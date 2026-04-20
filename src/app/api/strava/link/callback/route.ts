import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000"
  const profileUrl = `${baseUrl}/dashboard/profile`

  if (error || !code || !state) {
    return NextResponse.redirect(`${profileUrl}?strava_error=access_denied`)
  }

  const cookieStore = await cookies()
  const storedCookie = cookieStore.get("strava_link_state")?.value
  if (!storedCookie) {
    return NextResponse.redirect(`${profileUrl}?strava_error=invalid_state`)
  }

  const [storedState, userId] = storedCookie.split(":")
  if (storedState !== state || !userId) {
    return NextResponse.redirect(`${profileUrl}?strava_error=invalid_state`)
  }

  cookieStore.delete("strava_link_state")

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID!,
      client_secret: process.env.STRAVA_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${profileUrl}?strava_error=token_exchange`)
  }

  const tokenData = await tokenRes.json()
  const athleteId = tokenData?.athlete?.id ? String(tokenData.athlete.id) : null

  if (!athleteId) {
    return NextResponse.redirect(`${profileUrl}?strava_error=no_athlete`)
  }

  const existing = await prisma.user.findFirst({
    where: { stravaAthleteId: athleteId, NOT: { id: userId } },
    select: { id: true },
  })

  if (existing) {
    return NextResponse.redirect(`${profileUrl}?strava_error=already_linked`)
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { stravaAthleteId: athleteId },
    })
  } catch {
    return NextResponse.redirect(`${profileUrl}?strava_error=db_save`)
  }

  revalidatePath("/dashboard/profile")
  return NextResponse.redirect(`${profileUrl}?strava_connected=1`)
}
