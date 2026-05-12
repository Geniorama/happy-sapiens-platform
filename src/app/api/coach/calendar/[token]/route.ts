import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCalendarToken } from "@/lib/coach-utils"
import { combineAppointmentDateTime } from "@/lib/timezone"

function escapeIcal(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
}

function toIcalUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
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
    "X-WR-TIMEZONE:America/Bogota",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ]

  for (const apt of appointments) {
    // Momento real de la cita interpretando date+time como wall-clock Colombia.
    const start = combineAppointmentDateTime(apt.appointmentDate, apt.appointmentTime)
    const end = new Date(start.getTime() + (apt.durationMinutes || 60) * 60_000)

    const summary = escapeIcal(`HS - Cita con ${apt.user?.name || "Cliente"}`)
    const description = escapeIcal(apt.consultationReason || "")
    const location = escapeIcal(apt.meetingLink || "")

    lines.push(
      "BEGIN:VEVENT",
      `UID:appointment-${apt.id}@happy-sapiens`,
      `DTSTAMP:${toIcalUtc(new Date())}`,
      `DTSTART:${toIcalUtc(start)}`,
      `DTEND:${toIcalUtc(end)}`,
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
