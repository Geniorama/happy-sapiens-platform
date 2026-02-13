/**
 * Utilidades para añadir citas al calendario del usuario.
 * Genera enlaces para Google Calendar, Outlook y archivos .ics
 */

export interface CalendarEvent {
  title: string
  startDate: Date
  endDate: Date
  description?: string
  location?: string
}

function formatForGoogleCalendar(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

function escapeForUrl(str: string): string {
  return encodeURIComponent(str)
}

export function getGoogleCalendarUrl(event: CalendarEvent): string {
  const start = formatForGoogleCalendar(event.startDate)
  const end = formatForGoogleCalendar(event.endDate)
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
  })
  if (event.description) params.set("details", event.description)
  if (event.location) params.set("location", event.location)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function getOutlookCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.startDate.toISOString(),
    enddt: event.endDate.toISOString(),
  })
  if (event.description) params.set("body", event.description)
  if (event.location) params.set("location", event.location)
  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`
}

export function getICSBlob(event: CalendarEvent): Blob {
  const formatICSDate = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")

  const start = formatICSDate(event.startDate)
  const end = formatICSDate(event.endDate)
  const now = formatICSDate(new Date())

  const description = (event.description || "").replace(/\n/g, "\\n")
  const location = event.location || ""

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Happy Sapiens//Calendar//ES",
    "BEGIN:VEVENT",
    `UID:${event.startDate.getTime()}@happy-sapiens`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title}`,
    description ? `DESCRIPTION:${description}` : "",
    location ? `LOCATION:${location}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n")

  return new Blob([icsContent], { type: "text/calendar;charset=utf-8" })
}

export function downloadICS(event: CalendarEvent, filename = "cita.ics") {
  const blob = getICSBlob(event)
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
