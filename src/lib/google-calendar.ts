import { unstable_noStore as noStore } from "next/cache"
import { prisma } from "@/lib/db"

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

export interface BlockedSlot {
  date: string   // "YYYY-MM-DD"
  start: string  // "HH:MM"
  end: string    // "HH:MM"
  title?: string
}

// ─── Token helpers ────────────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/** Devuelve un access_token válido, refrescando si expiró */
async function getValidToken(coachId: string): Promise<string | null> {
  const row = await prisma.coachCalendarToken.findUnique({
    where: { coachId_provider: { coachId, provider: "google" } },
  })

  if (!row) return null

  const isExpired = row.expiresAt && row.expiresAt <= new Date(Date.now() + 60_000)

  if (!isExpired) return row.accessToken

  // Refrescar
  if (!row.refreshToken) return null
  const refreshed = await refreshAccessToken(row.refreshToken)
  if (!refreshed) return null

  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000)

  await prisma.coachCalendarToken.update({
    where: { coachId_provider: { coachId, provider: "google" } },
    data: {
      accessToken: refreshed.access_token,
      expiresAt,
    },
  })

  return refreshed.access_token
}

// ─── Parse Google event time ──────────────────────────────────────────────────

function parseGoogleEvent(event: any): BlockedSlot | null {
  // Ignorar eventos cancelados
  if (event.status === "cancelled") return null
  // Ignorar eventos donde el usuario declinó
  if (event.attendees?.some((a: any) => a.self && a.responseStatus === "declined")) return null

  if (event.start?.dateTime) {
    // Google devuelve "2026-03-17T10:00:00-03:00"
    // Extraemos la fecha y hora LOCAL directamente del string para evitar
    // que new Date() las convierta a UTC (el servidor corre en UTC)
    const startLocal = extractLocalDateTime(event.start.dateTime)
    const endLocal   = extractLocalDateTime(event.end.dateTime)
    if (!startLocal || !endLocal) return null
    return {
      date:  startLocal.date,
      start: startLocal.time,
      end:   endLocal.time,
      title: event.summary || "Ocupado",
    }
  }

  if (event.start?.date) {
    // Evento de día completo — bloquea todo el día (00:00–23:59)
    return {
      date:  event.start.date,
      start: "00:00",
      end:   "23:59",
      title: event.summary || "Día completo",
    }
  }

  return null
}

/**
 * Extrae fecha ("YYYY-MM-DD") y hora ("HH:MM") directamente del string ISO
 * sin pasar por UTC, preservando el horario local del calendario del coach.
 * Soporta: "2026-03-17T10:00:00-03:00", "2026-03-17T10:00:00Z", "2026-03-17T10:00:00"
 */
function extractLocalDateTime(isoString: string): { date: string; time: string } | null {
  const tIdx = isoString.indexOf("T")
  if (tIdx === -1) return null
  const date = isoString.slice(0, tIdx)
  const timePart = isoString.slice(tIdx + 1)
  const time = timePart.slice(0, 5)
  return { date, time }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Retorna true si el coach tiene Google Calendar conectado */
export async function isGoogleCalendarConnected(coachId: string): Promise<{ connected: boolean; email?: string }> {
  noStore()
  const data = await prisma.coachCalendarToken.findUnique({
    where: { coachId_provider: { coachId, provider: "google" } },
    select: { calendarEmail: true },
  })

  console.log("[isGoogleCalendarConnected] coachId:", coachId, "data:", data)
  return { connected: !!data, email: data?.calendarEmail ?? undefined }
}

/** Obtiene los eventos del Google Calendar del coach para un rango de fechas */
export async function getGoogleCalendarBlocked(
  coachId: string,
  startDate: string,
  endDate: string
): Promise<BlockedSlot[]> {
  const token = await getValidToken(coachId)
  if (!token) return []

  try {
    const params = new URLSearchParams({
      timeMin: `${startDate}T00:00:00Z`,
      timeMax: `${endDate}T23:59:59Z`,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    })

    const res = await fetch(`${GOOGLE_EVENTS_URL}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 }, // cache 5 min
    })

    if (!res.ok) return []

    const data = await res.json()
    const slots: BlockedSlot[] = []

    for (const event of data.items ?? []) {
      const slot = parseGoogleEvent(event)
      if (slot) slots.push(slot)
    }

    return slots
  } catch {
    return []
  }
}

// ─── Write API ────────────────────────────────────────────────────────────────

export interface CalendarEventInput {
  coachId: string
  appointmentId: string
  title: string         // Ej: "Cita con Juan Pérez"
  date: string          // "YYYY-MM-DD"
  startTime: string     // "HH:MM"
  durationMinutes: number
  description?: string
  meetingLink?: string
}

/** Crea un evento en el Google Calendar del coach con Google Meet incluido */
export async function createCalendarEvent(
  input: CalendarEventInput
): Promise<{ eventId: string | null; meetLink: string | null }> {
  const token = await getValidToken(input.coachId)
  if (!token) return { eventId: null, meetLink: null }

  try {
    const startDt = new Date(`${input.date}T${input.startTime}:00`)
    const endDt = new Date(startDt.getTime() + input.durationMinutes * 60_000)

    const body: Record<string, unknown> = {
      summary: input.title,
      description: input.description ?? "",
      start: { dateTime: startDt.toISOString() },
      end: { dateTime: endDt.toISOString() },
      conferenceData: {
        createRequest: {
          requestId: input.appointmentId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    }

    const url = `${GOOGLE_EVENTS_URL}?conferenceDataVersion=1`

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    })

    if (!res.ok) {
      console.error("Google Calendar createEvent error:", await res.text())
      return { eventId: null, meetLink: null }
    }

    const data = await res.json()
    const eventId: string | null = data.id ?? null
    const meetLink: string | null =
      data.conferenceData?.entryPoints?.find((e: { entryPointType: string }) => e.entryPointType === "video")?.uri ?? null

    return { eventId, meetLink }
  } catch (err) {
    console.error("Google Calendar createEvent exception:", err)
    return { eventId: null, meetLink: null }
  }
}

/** Actualiza el resumen/descripción de un evento existente */
export async function updateCalendarEvent(
  coachId: string,
  googleEventId: string,
  patch: { summary?: string; description?: string; status?: "confirmed" | "cancelled" }
): Promise<boolean> {
  const token = await getValidToken(coachId)
  if (!token) return false

  try {
    const res = await fetch(`${GOOGLE_EVENTS_URL}/${googleEventId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    })

    return res.ok
  } catch {
    return false
  }
}

/** Elimina un evento del Google Calendar del coach */
export async function deleteCalendarEvent(
  coachId: string,
  googleEventId: string
): Promise<boolean> {
  const token = await getValidToken(coachId)
  if (!token) return false

  try {
    const res = await fetch(`${GOOGLE_EVENTS_URL}/${googleEventId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })

    // 204 = borrado, 410 = ya no existe (ambos son OK)
    return res.status === 204 || res.status === 410
  } catch {
    return false
  }
}

/** Guarda tokens en la DB después del OAuth callback */
export async function saveGoogleTokens({
  coachId,
  accessToken,
  refreshToken,
  expiresIn,
  calendarEmail,
}: {
  coachId: string
  accessToken: string
  refreshToken?: string
  expiresIn: number
  calendarEmail: string
}): Promise<{ success: boolean; error?: string }> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  console.log("[saveGoogleTokens] coachId:", coachId, "email:", calendarEmail)

  try {
    await prisma.coachCalendarToken.upsert({
      where: { coachId_provider: { coachId, provider: "google" } },
      create: {
        coachId,
        provider: "google",
        accessToken,
        refreshToken: refreshToken ?? null,
        expiresAt,
        calendarEmail,
      },
      update: {
        accessToken,
        refreshToken: refreshToken ?? null,
        expiresAt,
        calendarEmail,
      },
    })
    console.log("[saveGoogleTokens] saved OK for coachId:", coachId)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al guardar tokens"
    console.error("[saveGoogleTokens] upsert error:", message)
    return { success: false, error: message }
  }
}

/** Elimina la conexión con Google Calendar */
export async function disconnectGoogleCalendar(coachId: string) {
  try {
    await prisma.coachCalendarToken.delete({
      where: { coachId_provider: { coachId, provider: "google" } },
    })
  } catch {
    // Si no existe, ignoramos
  }
}
