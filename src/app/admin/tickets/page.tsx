import { TicketsManager } from '@/components/admin/tickets-manager'
import { listTickets, listAssignableAdmins } from '@/lib/whatsapp-tickets'
import { isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function AdminTicketsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Tickets</h1>
        <p className="text-sm text-zinc-600">
          Falta configurar <code className="bg-zinc-100 px-1.5 py-0.5 rounded">SUPABASE_URL</code> y{' '}
          <code className="bg-zinc-100 px-1.5 py-0.5 rounded">SUPABASE_SERVICE_ROLE_KEY</code> en el
          servidor para poder leer los tickets del agente de WhatsApp.
        </p>
      </div>
    )
  }

  let tickets: Awaited<ReturnType<typeof listTickets>> = []
  let admins: Awaited<ReturnType<typeof listAssignableAdmins>> = []
  let loadError: string | null = null

  try {
    ;[tickets, admins] = await Promise.all([listTickets(), listAssignableAdmins()])
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'error desconocido'
  }

  if (loadError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Tickets</h1>
        <p className="text-sm text-red-600">No se pudieron cargar los tickets: {loadError}</p>
      </div>
    )
  }

  return <TicketsManager tickets={tickets} admins={admins} />
}
