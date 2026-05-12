import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendReminderFromRule } from "@/lib/appointment-emails"

const SECRET = process.env.WEBHOOK_TRIGGER_SECRET

function combineDateTime(date: Date, time: Date): Date {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  const hours = time.getUTCHours()
  const minutes = time.getUTCMinutes()
  const seconds = time.getUTCSeconds()
  // Misma convención que usa createAppointment al combinar @db.Date + @db.Time
  return new Date(year, month, day, hours, minutes, seconds)
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("x-cron-secret")
  if (!SECRET || authHeader !== SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const now = new Date()

  // Cargamos todas las reglas activas. Las reglas definen cuándo y a quién
  // se envía cada recordatorio. Si no hay reglas activas, no hay nada que hacer.
  const rules = await prisma.appointmentReminderRule.findMany({
    where: { isActive: true },
    orderBy: { hoursBefore: "desc" },
  })

  if (rules.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, sent: 0, rules: 0 })
  }

  // Rango amplio: tomamos citas en los próximos N días donde N cubra la regla
  // más anticipada. Sumamos un día de margen para no perder ninguna por borde.
  const maxHoursBefore = Math.max(...rules.map((r) => Number(r.hoursBefore)))
  const maxDaysAhead = Math.ceil(maxHoursBefore / 24) + 1

  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  const rangeEnd = new Date(todayStart)
  rangeEnd.setUTCDate(todayStart.getUTCDate() + maxDaysAhead)

  const candidates = await prisma.appointment.findMany({
    where: {
      status: "scheduled",
      appointmentDate: { gte: todayStart, lte: rangeEnd },
    },
    select: {
      id: true,
      appointmentDate: true,
      appointmentTime: true,
      remindersSent: { select: { ruleId: true } },
    },
  })

  let sent = 0
  const logs: string[] = []

  for (const appt of candidates) {
    const target = combineDateTime(appt.appointmentDate, appt.appointmentTime)
    const hoursUntil = (target.getTime() - now.getTime()) / (1000 * 60 * 60)
    const sentRuleIds = new Set(appt.remindersSent.map((r) => r.ruleId))

    for (const rule of rules) {
      // Ya enviada esta regla para esta cita: no repetir.
      if (sentRuleIds.has(rule.id)) continue

      const hoursBefore = Number(rule.hoursBefore)
      const halfWindowHours = rule.windowMinutes / 60 / 2

      // Ventana: [hoursBefore - half, hoursBefore + half]. Si hoursUntil cae
      // dentro, disparamos. hoursUntil <= 0 significa que ya pasó: no enviar.
      if (
        hoursUntil <= 0 ||
        hoursUntil < hoursBefore - halfWindowHours ||
        hoursUntil > hoursBefore + halfWindowHours
      ) {
        continue
      }

      try {
        await sendReminderFromRule(appt.id, {
          id: rule.id,
          name: rule.name,
          sendToUser: rule.sendToUser,
          sendToCoach: rule.sendToCoach,
          subjectUser: rule.subjectUser,
          bodyUser: rule.bodyUser,
          subjectCoach: rule.subjectCoach,
          bodyCoach: rule.bodyCoach,
        })

        await prisma.appointmentReminderSent.create({
          data: {
            appointmentId: appt.id,
            ruleId: rule.id,
            sentAt: new Date(),
          },
        })
        sent++
      } catch (err) {
        logs.push(
          `regla ${rule.key ?? rule.id} cita ${appt.id}: ${
            err instanceof Error ? err.message : String(err)
          }`
        )
      }
    }
  }

  return NextResponse.json({
    ok: true,
    checked: candidates.length,
    rules: rules.length,
    sent,
    logs,
  })
}
