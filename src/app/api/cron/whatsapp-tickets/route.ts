import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { isSupabaseConfigured } from '@/lib/supabase'
import { listTicketsCreatedSince } from '@/lib/whatsapp-tickets'
import { notifyAdminsNewTicket, toTicketNotification } from '@/lib/admin-notifications'

// Avisa al equipo de las escalaciones nuevas del agente de WhatsApp.
//
// Los tickets los crea n8n directo en Supabase, así que la plataforma no se
// entera por sí sola: no hay webhook de por medio. Este endpoint se llama desde
// cron-job.org igual que los recordatorios de citas.
//
// Idempotencia: no se toca la tabla de Supabase (es del agente). Se lleva el
// registro de lo ya avisado en `system_logs`, con entity_id = id del ticket. Así
// no hace falta migrar la base ni escribir en datos que no son nuestros; si el
// cron se ejecuta dos veces seguidas, el segundo no reenvía nada.

const SECRET = process.env.WEBHOOK_TRIGGER_SECRET

const NOTIFIED_ACTION = 'cron.ticket.notified'

// Ventana de búsqueda. Se mira más atrás que la frecuencia del cron para que una
// ejecución fallida o un retraso no dejen tickets sin avisar: la deduplicación
// por system_logs se encarga de que no se repitan.
//
// Se puede ampliar con WHATSAPP_TICKETS_LOOKBACK_HOURS para arrastrar escalaciones
// viejas en la primera corrida (una sola vez: después quedan marcadas como
// avisadas y el valor se puede devolver a su default).
const LOOKBACK_HOURS = Number(process.env.WHATSAPP_TICKETS_LOOKBACK_HOURS) || 48

export async function POST(req: Request) {
  const authHeader = req.headers.get('x-cron-secret')
  if (!SECRET || authHeader !== SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase no está configurado' }, { status: 503 })
  }

  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000)

  let tickets
  try {
    tickets = await listTicketsCreatedSince(since)
  } catch (err) {
    console.error('[cron/whatsapp-tickets] error leyendo Supabase:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error leyendo Supabase' },
      { status: 502 }
    )
  }

  if (tickets.length === 0) {
    return NextResponse.json({ ok: true, found: 0, notified: 0 })
  }

  const alreadyNotified = await prisma.systemLog.findMany({
    where: {
      action: NOTIFIED_ACTION,
      entityId: { in: tickets.map((ticket) => ticket.id) },
    },
    select: { entityId: true },
  })
  const notifiedIds = new Set(alreadyNotified.map((log) => log.entityId))

  const pending = tickets.filter((ticket) => !notifiedIds.has(ticket.id))

  let sent = 0
  const failures: { id: string; error: string }[] = []

  for (const ticket of pending) {
    const result = await notifyAdminsNewTicket(toTicketNotification(ticket))

    if (result.success) {
      sent++
    } else {
      failures.push({ id: ticket.id, error: result.error ?? 'error desconocido' })
    }

    // Solo se marca como avisado si el correo salió. Si falló, se reintenta en la
    // próxima corrida mientras el ticket siga dentro de la ventana.
    if (result.success) {
      await prisma.systemLog
        .create({
          data: {
            actorEmail: 'system',
            action: NOTIFIED_ACTION,
            entityType: 'whatsapp_ticket',
            entityId: ticket.id,
            metadata: {
              phone: ticket.phone,
              priority: ticket.priority,
              category: ticket.category,
              createdAt: ticket.createdAt?.toISOString() ?? null,
            } as Prisma.InputJsonValue,
          },
        })
        .catch(() => undefined)
    }
  }

  return NextResponse.json({
    ok: true,
    found: tickets.length,
    pending: pending.length,
    notified: sent,
    ...(failures.length > 0 && { failures }),
  })
}
