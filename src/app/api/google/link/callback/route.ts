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
    return NextResponse.redirect(`${profileUrl}?google_error=access_denied`)
  }

  const cookieStore = await cookies()
  const storedCookie = cookieStore.get("google_link_state")?.value
  if (!storedCookie) {
    return NextResponse.redirect(`${profileUrl}?google_error=invalid_state`)
  }

  const [storedState, userId] = storedCookie.split(":")
  if (storedState !== state || !userId) {
    return NextResponse.redirect(`${profileUrl}?google_error=invalid_state`)
  }

  cookieStore.delete("google_link_state")

  const redirectUri = `${baseUrl}/api/google/link/callback`

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${profileUrl}?google_error=token_exchange`)
  }

  const tokenData = await tokenRes.json()
  const accessToken = tokenData?.access_token

  if (!accessToken) {
    return NextResponse.redirect(`${profileUrl}?google_error=token_exchange`)
  }

  const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!userinfoRes.ok) {
    return NextResponse.redirect(`${profileUrl}?google_error=userinfo`)
  }

  const profile = await userinfoRes.json()
  const googleId = profile?.id ? String(profile.id) : null

  if (!googleId) {
    return NextResponse.redirect(`${profileUrl}?google_error=no_google_id`)
  }

  const existing = await prisma.user.findFirst({
    where: { googleId, NOT: { id: userId } },
    select: { id: true },
  })

  if (existing) {
    return NextResponse.redirect(`${profileUrl}?google_error=already_linked`)
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { googleId },
    })
  } catch {
    return NextResponse.redirect(`${profileUrl}?google_error=db_save`)
  }

  revalidatePath("/dashboard/profile")
  return NextResponse.redirect(`${profileUrl}?google_connected=1`)
}
