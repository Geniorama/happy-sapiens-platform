import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
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

// Formatea un Prisma Date (@db.Date) a "YYYY-MM-DD" en UTC
function dateToYmd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Formatea un Prisma Time (@db.Time) a "HH:MM:SS" en UTC
function timeToHms(d: Date): string {
  return d.toISOString().slice(11, 19)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // Buscar coach cuyo token coincida
  let coaches
  try {
    coaches = await prisma.user.findMany({
      where: { role: "coach", isCoachActive: true },
      select: { id: true, name: true },
    })
  } catch {
    return new NextResponse("Not found", { status: 404 })
  }

  const coach = coaches.find((c) => getCalendarToken(c.id) === token)

  if (!coach) {
    return new NextResponse("Not found", { status: 404 })
  }

  // Obtener citas del coach
  const appointments = await prisma.appointment.findMany({
    where: {
      coachId: coach.id,
      status: { in: ["scheduled", "completed"] },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { appointmentDate: "asc" },
  })

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Happy Sapiens//Coach Calendar//ES",
    `X-WR-CALNAME:Citas - ${escapeIcal(coach.name || "Coach")}`,
    "X-WR-TIMEZONE:America/Argentina/Buenos_Aires",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ]

  for (const apt of appointments) {
    const dateStr = dateToYmd(apt.appointmentDate)
    const timeStr = timeToHms(apt.appointmentTime) || "00:00:00"
    const startDt = toIcalDate(dateStr, timeStr)
    // End = start + duration_minutes
    const startMs = new Date(`${dateStr}T${timeStr}Z`).getTime()
    const endMs = startMs + (apt.durationMinutes || 60) * 60 * 1000
    const endDt = new Date(endMs).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"

    const summary = escapeIcal(`Cita con ${apt.user?.name || "Cliente"}`)
    const description = escapeIcal(apt.consultationReason || "")
    const location = escapeIcal(apt.meetingLink || "")

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
