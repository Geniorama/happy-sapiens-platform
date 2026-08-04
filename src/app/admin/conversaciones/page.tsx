import { ConversationsViewer } from '@/components/admin/conversations-viewer'
import { listConversations } from '@/lib/whatsapp-conversations'
import { isSupabaseConfigured } from '@/lib/supabase'

// Las conversaciones viven en el Supabase del agente de n8n, que se actualiza
// por fuera de la app: no tiene sentido cachear esta página.
export const dynamic = 'force-dynamic'

export default async function AdminConversacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>
}) {
  const { phone } = await searchParams

  if (!isSupabaseConfigured()) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Conversaciones</h1>
        <p className="text-sm text-zinc-600">
          Falta configurar <code className="bg-zinc-100 px-1.5 py-0.5 rounded">SUPABASE_URL</code> y{' '}
          <code className="bg-zinc-100 px-1.5 py-0.5 rounded">SUPABASE_SERVICE_ROLE_KEY</code> en el
          servidor para poder leer las conversaciones del agente de WhatsApp.
        </p>
      </div>
    )
  }

  let conversations: Awaited<ReturnType<typeof listConversations>> = []
  let loadError: string | null = null

  try {
    conversations = await listConversations()
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'error desconocido'
  }

  if (loadError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Conversaciones</h1>
        <p className="text-sm text-red-600">No se pudieron cargar las conversaciones: {loadError}</p>
      </div>
    )
  }

  return <ConversationsViewer conversations={conversations} initialPhone={phone} />
}
