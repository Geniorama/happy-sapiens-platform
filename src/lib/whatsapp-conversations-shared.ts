// Tipos y helpers de presentación de las conversaciones de WhatsApp.
//
// Va aparte de `whatsapp-conversations.ts` a propósito: ese módulo importa Prisma
// y la service_role key de Supabase, así que no puede tocarlo un componente
// cliente. Aquí no hay ninguna dependencia de servidor, así que el visor puede
// importarlo sin arrastrar nada al bundle del navegador.

export type ConversationSource = 'messages' | 'n8n_fallback'

export type ConversationMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  // Qué sub-agente respondió (discovery, sales, support, escalate). Solo en la
  // fuente principal.
  agent: string | null
  createdAt: Date | null
}

export type PlatformUserMatch = {
  id: string
  name: string | null
  email: string | null
  subscriptionStatus: string | null
}

export type ConversationSummary = {
  phone: string
  contactName: string | null
  journeyStage: string | null
  currentAgent: string | null
  lastActiveAt: Date | null
  messageCount: number
  lastMessage: string | null
  source: ConversationSource
  platformUser: PlatformUserMatch | null
  // Cuántas respuestas aportó cada sub-agente. Vacío en la fuente de respaldo:
  // el buffer crudo no registra qué agente respondió.
  agentCounts: Record<string, number>
  // Tickets de escalación sin resolver de este contacto.
  openTickets: number
}

export type ConversationDetail = ConversationSummary & {
  messages: ConversationMessage[]
  // Turnos internos del router que se ocultaron (solo en la fuente de respaldo).
  internalStepsHidden: number
}

export const AGENT_LABELS: Record<string, string> = {
  discovery: 'Descubrimiento',
  sales: 'Ventas',
  support: 'Soporte',
  escalate: 'Escalado',
}

export function agentLabel(agent: string): string {
  return AGENT_LABELS[agent] ?? agent
}

export function countAgents(messages: ConversationMessage[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const message of messages) {
    if (!message.agent) continue
    counts[message.agent] = (counts[message.agent] ?? 0) + 1
  }
  return counts
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const local = digits.slice(-10)
  if (local.length !== 10) return phone
  return `+57 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
}
