import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { disconnectGoogleCalendar } from "@/lib/google-calendar"

export async function POST() {
  const session = await auth()
  if (!session || session.user.role !== "coach") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  await disconnectGoogleCalendar(session.user.id)
  return NextResponse.json({ success: true })
}
