'use server'

import { auth } from '@/lib/auth'
import { getConversation, type ConversationDetail } from '@/lib/whatsapp-conversations'

// El layout de /admin ya bloquea por rol, pero una server action es un endpoint
// propio: se valida aquí también, porque nada impide invocarla directamente.
async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    throw new Error('No autorizado')
  }
}

export type LoadConversationResult =
  | { ok: true; conversation: ConversationDetail }
  | { ok: false; error: string }

export async function loadConversation(phone: string): Promise<LoadConversationResult> {
  await requireAdmin()

  try {
    const conversation = await getConversation(phone)
    if (!conversation) return { ok: false, error: 'No se encontró la conversación' }
    return { ok: true, conversation }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al cargar la conversación' }
  }
}
