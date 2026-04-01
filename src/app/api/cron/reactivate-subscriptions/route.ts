import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { preApprovalClient } from '@/lib/mercadopago'

const SECRET = process.env.WEBHOOK_TRIGGER_SECRET

export async function POST(req: Request) {
  const authHeader = req.headers.get('x-cron-secret')
  if (!SECRET || authHeader !== SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const logs: string[] = []

  // 1. Reactivar suscripciones cuya pausa ha vencido
  const { data: pausedUsers } = await supabaseAdmin
    .from('users')
    .select('id, subscription_id, email')
    .eq('subscription_status', 'paused')
    .not('subscription_pause_ends_at', 'is', null)
    .lte('subscription_pause_ends_at', new Date().toISOString())

  const reactivated: string[] = []
  for (const user of pausedUsers ?? []) {
    try {
      await preApprovalClient.update({ id: user.subscription_id, body: { status: 'authorized' } })
      await supabaseAdmin.from('users').update({
        subscription_status: 'active',
        subscription_synced_at: new Date().toISOString(),
        subscription_pause_ends_at: null,
      }).eq('id', user.id)
      reactivated.push(user.email)
    } catch (err) {
      logs.push(`Error reactivando ${user.email}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  logs.push(`Reactivadas por fin de pausa: ${reactivated.length}`)

  // 2. Marcar past_due si subscription_end_date venció hace más de 3 días sin pago
  const gracePeriod = new Date()
  gracePeriod.setDate(gracePeriod.getDate() - 3)

  const { data: overdueUsers } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('subscription_status', 'active')
    .not('subscription_end_date', 'is', null)
    .lte('subscription_end_date', gracePeriod.toISOString())

  const markedPastDue: string[] = []
  for (const user of overdueUsers ?? []) {
    await supabaseAdmin.from('users').update({
      subscription_status: 'past_due',
      subscription_synced_at: new Date().toISOString(),
    }).eq('id', user.id)
    markedPastDue.push(user.email)
  }
  logs.push(`Marcadas como past_due por fecha vencida: ${markedPastDue.length}`)

  return NextResponse.json({
    ok: true,
    reactivated: reactivated.length,
    past_due_marked: markedPastDue.length,
    logs,
  })
}
