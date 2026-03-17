import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getCalendarToken } from "@/lib/coach-utils"

function escapeIcal(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
}

function toIcalDate(date: string, time: string): string {
  // date: "YYYY-MM-DD", time: "HH:MM:SS"
  const dt = new Date(`${date}T${time}Z`)
  return dt.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // Buscar coach cuyo token coincida
  const { data: coaches, error } = await supabaseAdmin
    .from("users")
    .select("id, name")
    .eq("role", "coach")
    .eq("is_coach_active", true)

  if (error || !coaches) {
    return new NextResponse("Not found", { status: 404 })
  }

  const coach = coaches.find((c) => getCalendarToken(c.id) === token)

  if (!coach) {
    return new NextResponse("Not found", { status: 404 })
  }

  // Obtener citas del coach
  const { data: appointments } = await supabaseAdmin
    .from("appointments")
    .select(`*, user:users!user_id(id, name, email)`)
    .eq("coach_id", coach.id)
    .in("status", ["scheduled", "completed"])
    .order("appointment_date", { ascending: true })

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Happy Sapiens//Coach Calendar//ES",
    `X-WR-CALNAME:Citas - ${escapeIcal(coach.name || "Coach")}`,
    "X-WR-TIMEZONE:America/Argentina/Buenos_Aires",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ]

  for (const apt of appointments || []) {
    const startDt = toIcalDate(apt.appointment_date, apt.appointment_time || "00:00:00")
    // End = start + duration_minutes
    const startMs = new Date(`${apt.appointment_date}T${apt.appointment_time}Z`).getTime()
    const endMs = startMs + (apt.duration_minutes || 60) * 60 * 1000
    const endDt = new Date(endMs).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"

    const summary = escapeIcal(`Cita con ${apt.user?.name || "Cliente"}`)
    const description = escapeIcal(apt.consultation_reason || "")
    const location = escapeIcal(apt.meeting_link || "")

    lines.push(
      "BEGIN:VEVENT",
      `UID:appointment-${apt.id}@happy-sapiens`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART:${startDt}`,
      `DTEND:${endDt}`,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description}` : "",
      location ? `LOCATION:${location}` : "",
      "END:VEVENT"
    )
  }

  lines.push("END:VCALENDAR")

  const ical = lines.filter(Boolean).join("\r\n")

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="citas-coach.ics"`,
      "Cache-Control": "no-cache, no-store",
    },
  })
}
