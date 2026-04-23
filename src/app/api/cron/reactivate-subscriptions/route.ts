import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { preApprovalClient } from '@/lib/mercadopago'

const SECRET = process.env.WEBHOOK_TRIGGER_SECRET

export async function POST(req: Request) {
  const authHeader = req.headers.get('x-cron-secret')
  if (!SECRET || authHeader !== SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const logs: string[] = []

  // 1. Reactivar suscripciones cuya pausa ha vencido
  const pausedUsers = await prisma.user.findMany({
    where: {
      subscriptionStatus: 'paused',
      subscriptionPauseEndsAt: { not: null, lte: new Date() },
    },
    select: { id: true, subscriptionId: true, email: true },
  })

  const reactivated: string[] = []
  for (const user of pausedUsers) {
    try {
      if (!user.subscriptionId) continue
      await preApprovalClient.update({ id: user.subscriptionId, body: { status: 'authorized' } })
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: 'active',
          subscriptionSyncedAt: new Date(),
          subscriptionPauseEndsAt: null,
        },
      })
      if (user.email) reactivated.push(user.email)
    } catch (err) {
      logs.push(`Error reactivando ${user.email}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  logs.push(`Reactivadas por fin de pausa: ${reactivated.length}`)

  // 2. Marcar past_due si subscription_end_date venció hace más de 3 días sin pago
  const gracePeriod = new Date()
  gracePeriod.setDate(gracePeriod.getDate() - 3)

  const overdueUsers = await prisma.user.findMany({
    where: {
      subscriptionStatus: 'active',
      subscriptionEndDate: { not: null, lte: gracePeriod },
    },
    select: { id: true, email: true },
  })

  const markedPastDue: string[] = []
  for (const user of overdueUsers) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: 'past_due',
          subscriptionSyncedAt: new Date(),
        },
      })
      if (user.email) markedPastDue.push(user.email)
    } catch (err) {
      logs.push(`Error marcando past_due ${user.email}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  logs.push(`Marcadas como past_due por fecha vencida: ${markedPastDue.length}`)

  return NextResponse.json({
    ok: true,
    reactivated: reactivated.length,
    past_due_marked: markedPastDue.length,
    logs,
  })
}
