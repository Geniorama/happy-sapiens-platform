import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { preApprovalClient } from '@/lib/mercadopago'

const SECRET = process.env.WEBHOOK_TRIGGER_SECRET

export async function POST(req: Request) {
  const authHeader = req.headers.get('x-cron-secret')
  if (!SECRET || authHeader !== SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, subscription_id, email')
    .eq('subscription_status', 'paused')
    .not('subscription_pause_ends_at', 'is', null)
    .lte('subscription_pause_ends_at', new Date().toISOString())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!users?.length) return NextResponse.json({ ok: true, reactivated: 0 })

  const results: { email: string; ok: boolean; error?: string }[] = []

  for (const user of users) {
    try {
      await preApprovalClient.update({
        id: user.subscription_id,
        body: { status: 'authorized' },
      })

      await supabaseAdmin
        .from('users')
        .update({
          subscription_status: 'active',
          subscription_synced_at: new Date().toISOString(),
          subscription_pause_ends_at: null,
        })
        .eq('id', user.id)

      results.push({ email: user.email, ok: true })
    } catch (err) {
      results.push({ email: user.email, ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return NextResponse.json({ ok: true, reactivated: results.filter(r => r.ok).length, results })
}
