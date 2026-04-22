import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendAppointmentReminder } from "@/lib/appointment-emails"

const SECRET = process.env.WEBHOOK_TRIGGER_SECRET

// Ventanas (en horas desde ahora) en las que debemos disparar cada reminder.
// El cron corre cada 15 min; las ventanas cubren ese lapso para no perder citas
// entre ejecuciones.
const WINDOW_24H_MIN = 22.75
const WINDOW_24H_MAX = 25.25
const WINDOW_1H_MIN = 0.25 // no enviar el de 1h si ya está en curso o muy pegado
const WINDOW_1H_MAX = 1.5

function combineDateTime(date: Date, time: Date): Date {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  const hours = time.getUTCHours()
  const minutes = time.getUTCMinutes()
  const seconds = time.getUTCSeconds()
  // Coincide con new Date(`YYYY-MM-DDTHH:MM:SS`) en zona local del servidor,
  // misma convención que usa createAppointment.
  return new Date(year, month, day, hours, minutes, seconds)
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("x-cron-secret")
  if (!SECRET || authHeader !== SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const now = new Date()
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const inTwoDays = new Date(todayStart)
  inTwoDays.setUTCDate(todayStart.getUTCDate() + 2)

  const candidates = await prisma.appointment.findMany({
    where: {
      status: "scheduled",
      appointmentDate: { gte: todayStart, lte: inTwoDays },
      OR: [
        { reminder24hSentAt: null },
        { reminder1hSentAt: null },
      ],
    },
    select: {
      id: true,
      appointmentDate: true,
      appointmentTime: true,
      reminder24hSentAt: true,
      reminder1hSentAt: true,
    },
  })

  let sent24 = 0
  let sent1 = 0
  const logs: string[] = []

  for (const appt of candidates) {
    const target = combineDateTime(appt.appointmentDate, appt.appointmentTime)
    const hoursUntil = (target.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (!appt.reminder24hSentAt && hoursUntil >= WINDOW_24H_MIN && hoursUntil <= WINDOW_24H_MAX) {
      try {
        await sendAppointmentReminder(appt.id, "reminder-24h")
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { reminder24hSentAt: new Date() },
        })
        sent24++
      } catch (err) {
        logs.push(`24h fallo ${appt.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
      continue
    }

    if (!appt.reminder1hSentAt && hoursUntil >= WINDOW_1H_MIN && hoursUntil <= WINDOW_1H_MAX) {
      try {
        await sendAppointmentReminder(appt.id, "reminder-1h")
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { reminder1hSentAt: new Date() },
        })
        sent1++
      } catch (err) {
        logs.push(`1h fallo ${appt.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    checked: candidates.length,
    sent_24h: sent24,
    sent_1h: sent1,
    logs,
  })
}
