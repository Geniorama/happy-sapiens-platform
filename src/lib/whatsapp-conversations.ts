import { prisma } from '@/lib/db'
import { supabaseSelect } from '@/lib/supabase'

// Lectura de las conversaciones del agente de WhatsApp (n8n + Supabase).
//
// Hay dos almacenes en ese Supabase y no cubren lo mismo:
//
//  - `messages` + `users`: el registro curado. Trae fecha/hora, nombre del
//    contacto, etapa del journey y qué sub-agente respondió. Es la fuente
//    principal.
//  - `n8n_chat_histories`: el buffer de memoria de LangChain. Guarda un turno por
//    cada invocación de agente (el enrutamiento multi-agente lo infla) y no tiene
//    ninguna columna de tiempo, así que solo se puede ordenar por `id`.
//
// Algunas conversaciones existen únicamente en `n8n_chat_histories` (un hueco del
// flujo de n8n). Para esas caemos al hilo crudo y lo marcamos como tal, en vez de
// esconder la conversación.

// Los tipos y `formatPhone` viven en el módulo compartido para que el visor
// (componente cliente) pueda usarlos sin importar este archivo, que trae Prisma
// y la service_role key.
export type {
  ConversationSource,
  ConversationMessage,
  PlatformUserMatch,
  ConversationSummary,
  ConversationDetail,
} from '@/lib/whatsapp-conversations-shared'
export { formatPhone, agentLabel, AGENT_LABELS } from '@/lib/whatsapp-conversations-shared'

import { countAgents } from '@/lib/whatsapp-conversations-shared'

import type {
  ConversationSource,
  ConversationMessage,
  PlatformUserMatch,
  ConversationSummary,
  ConversationDetail,
} from '@/lib/whatsapp-conversations-shared'

type SupabaseAgentUser = {
  id: string
  phone_number: string | null
  name: string | null
  journey_stage: string | null
  current_agent: string | null
  last_active_at: string | null
  created_at: string | null
}

type SupabaseMessage = {
  id: string
  user_id: string | null
  role: string | null
  agent: string | null
  content: string | null
  created_at: string | null
}

type N8nRow = {
  id: number
  session_id: string | null
  message: { type?: string; content?: string } | null
}

// Los teléfonos llegan en formatos distintos según el origen: el agente los
// guarda con indicativo pegado (573102627655) y la plataforma a veces con `+57`
// y a veces sin indicativo (3102627655). Los últimos 10 dígitos son la parte
// estable en Colombia, así que ese es el criterio de cruce.
export function phoneKey(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '').slice(-10)
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeRole(role: string | null): 'user' | 'assistant' {
  // `messages` usa user/assistant; el buffer de LangChain usa human/ai.
  return role === 'assistant' || role === 'ai' ? 'assistant' : 'user'
}

// n8n inserta la pregunta y la respuesta con el MISMO `created_at` — verificado
// sobre los datos: los 128 grupos de (user_id, created_at) son exactamente un par
// user+assistant. Ordenar solo por fecha deja la respuesta ANTES de la pregunta,
// así que dentro del mismo instante el turno del cliente va primero.
function compareMessages(a: ConversationMessage, b: ConversationMessage): number {
  const timeA = a.createdAt?.getTime() ?? 0
  const timeB = b.createdAt?.getTime() ?? 0
  if (timeA !== timeB) return timeA - timeB
  if (a.role === b.role) return 0
  return a.role === 'user' ? -1 : 1
}

// En el buffer crudo, la mitad de los turnos `ai` no son respuestas al cliente
// sino la salida del router del agente (intent, confidence, reasoning,
// escalate_to…). Se distinguen porque el contenido es un objeto JSON en vez de
// texto. No forman parte de la conversación, así que se ocultan del hilo.
function parseN8nContent(raw: string | undefined): { text: string; internal: boolean } {
  const content = raw ?? ''
  const trimmed = content.trim()
  if (!trimmed.startsWith('{')) return { text: content, internal: false }
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object') return { text: content, internal: true }
  } catch {
    // No era JSON: es texto que casualmente empieza con llave.
  }
  return { text: content, internal: false }
}

// Convierte las filas crudas del buffer en mensajes, descartando los pasos
// internos del router.
function n8nRowsToMessages(rows: N8nRow[]): { messages: ConversationMessage[]; internalHidden: number } {
  const messages: ConversationMessage[] = []
  let internalHidden = 0

  for (const row of rows) {
    const { text, internal } = parseN8nContent(row.message?.content)
    if (internal) {
      internalHidden++
      continue
    }
    messages.push({
      id: String(row.id),
      role: normalizeRole(row.message?.type ?? null),
      content: text,
      agent: null,
      createdAt: null,
    })
  }

  return { messages, internalHidden }
}

// Busca en la plataforma al usuario dueño de cada teléfono. Una sola consulta
// para todos los teléfonos: se traen los que tienen algún teléfono cargado y se
// cruzan en memoria, porque la normalización (quitar `+57`, espacios y guiones)
// no se puede expresar en un `where` de Prisma sin SQL crudo.
export async function matchPlatformUsers(phones: string[]): Promise<Map<string, PlatformUserMatch>> {
  const wanted = new Set(phones.map(phoneKey).filter(Boolean))
  if (wanted.size === 0) return new Map()

  const candidates = await prisma.user.findMany({
    where: {
      OR: [{ billingPhone: { not: null } }, { shippingPhone: { not: null } }],
    },
    select: {
      id: true,
      name: true,
      email: true,
      subscriptionStatus: true,
      billingPhone: true,
      shippingPhone: true,
    },
  })

  const matches = new Map<string, PlatformUserMatch>()
  for (const candidate of candidates) {
    for (const phone of [candidate.billingPhone, candidate.shippingPhone]) {
      const key = phoneKey(phone)
      if (key && wanted.has(key) && !matches.has(key)) {
        matches.set(key, {
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          subscriptionStatus: candidate.subscriptionStatus,
        })
      }
    }
  }

  return matches
}

// Lista todas las conversaciones, más recientes primero.
//
// Las que solo existen en `n8n_chat_histories` no tienen fecha, así que se
// ordenan al final por su último `id` — es el único orden disponible ahí.
export async function listConversations(): Promise<ConversationSummary[]> {
  const [agentUsers, messages, n8nRows] = await Promise.all([
    supabaseSelect<SupabaseAgentUser>(
      'users?select=id,phone_number,name,journey_stage,current_agent,last_active_at,created_at'
    ),
    supabaseSelect<SupabaseMessage>(
      'messages?select=id,user_id,role,agent,content,created_at&order=created_at.asc'
    ),
    supabaseSelect<N8nRow>('n8n_chat_histories?select=id,session_id,message&order=id.asc'),
  ])

  const usersById = new Map(agentUsers.map((u) => [u.id, u]))
  const byPhone = new Map<string, ConversationSummary>()

  // Fuente principal: `messages`, agrupados por el teléfono de su usuario. Se
  // acumulan primero y se ordenan después, porque el último mensaje del hilo
  // depende del desempate de compareMessages, no del orden que devuelve la API.
  const threadsByPhone = new Map<string, ConversationMessage[]>()
  for (const message of messages) {
    const agentUser = message.user_id ? usersById.get(message.user_id) : null
    const phone = agentUser?.phone_number
    if (!phone) continue

    const thread = threadsByPhone.get(phone) ?? []
    thread.push({
      id: message.id,
      role: normalizeRole(message.role),
      content: message.content ?? '',
      agent: message.agent,
      createdAt: toDate(message.created_at),
    })
    threadsByPhone.set(phone, thread)
  }

  for (const [phone, thread] of threadsByPhone) {
    const agentUser = agentUsers.find((u) => u.phone_number === phone)
    thread.sort(compareMessages)
    const lastWithDate = [...thread].reverse().find((m) => m.createdAt)

    byPhone.set(phone, {
      phone,
      contactName: agentUser?.name ?? null,
      journeyStage: agentUser?.journey_stage ?? null,
      currentAgent: agentUser?.current_agent ?? null,
      lastActiveAt: toDate(agentUser?.last_active_at) ?? lastWithDate?.createdAt ?? null,
      messageCount: thread.length,
      lastMessage: thread[thread.length - 1]?.content ?? null,
      source: 'messages',
      platformUser: null,
      agentCounts: countAgents(thread),
      // Se completa más abajo, cuando ya están todas las conversaciones armadas.
      openTickets: 0,
    })
  }

  // Respaldo: sesiones del buffer que no dejaron nada en `messages`.
  const n8nBySession = new Map<string, N8nRow[]>()
  for (const row of n8nRows) {
    if (!row.session_id) continue
    const list = n8nBySession.get(row.session_id) ?? []
    list.push(row)
    n8nBySession.set(row.session_id, list)
  }

  for (const [phone, rows] of n8nBySession) {
    if (byPhone.has(phone)) continue
    const agentUser = agentUsers.find((u) => u.phone_number === phone) ?? null
    const { messages: thread } = n8nRowsToMessages(rows)
    byPhone.set(phone, {
      phone,
      contactName: agentUser?.name ?? null,
      journeyStage: agentUser?.journey_stage ?? null,
      currentAgent: agentUser?.current_agent ?? null,
      lastActiveAt: toDate(agentUser?.last_active_at),
      messageCount: thread.length,
      lastMessage: thread[thread.length - 1]?.content ?? null,
      source: 'n8n_fallback',
      platformUser: null,
      // El buffer crudo no guarda qué agente respondió.
      agentCounts: {},
      openTickets: 0,
    })
  }

  const conversations = [...byPhone.values()]

  // countOpenTicketsByPhone se importa aquí adentro a propósito: whatsapp-tickets
  // importa este módulo (matchPlatformUsers), y hacerlo arriba cerraría el ciclo.
  const { countOpenTicketsByPhone } = await import('@/lib/whatsapp-tickets')
  const [platformUsers, openTickets] = await Promise.all([
    matchPlatformUsers(conversations.map((c) => c.phone)),
    countOpenTicketsByPhone().catch(() => new Map<string, number>()),
  ])

  for (const conversation of conversations) {
    conversation.platformUser = platformUsers.get(phoneKey(conversation.phone)) ?? null
    conversation.openTickets = openTickets.get(conversation.phone) ?? 0
  }

  return conversations.sort((a, b) => {
    if (a.lastActiveAt && b.lastActiveAt) return b.lastActiveAt.getTime() - a.lastActiveAt.getTime()
    if (a.lastActiveAt) return -1
    if (b.lastActiveAt) return 1
    return 0
  })
}

// Trae el hilo completo de una conversación. Se resuelve por sí sola (no
// depende de listConversations) para no releer toda la tabla al abrir un hilo.
export async function getConversation(phone: string): Promise<ConversationDetail | null> {
  const eq = encodeURIComponent(phone)

  const agentUsers = await supabaseSelect<SupabaseAgentUser>(
    `users?select=id,phone_number,name,journey_stage,current_agent,last_active_at,created_at&phone_number=eq.${eq}`
  )
  const agentUser = agentUsers[0] ?? null

  let source: ConversationSource = 'n8n_fallback'
  let messages: ConversationMessage[] = []
  let internalStepsHidden = 0

  if (agentUser) {
    const rows = await supabaseSelect<SupabaseMessage>(
      `messages?select=id,role,agent,content,created_at&user_id=eq.${encodeURIComponent(agentUser.id)}&order=created_at.asc`
    )
    if (rows.length > 0) {
      source = 'messages'
      messages = rows
        .map((row) => ({
          id: row.id,
          role: normalizeRole(row.role),
          content: row.content ?? '',
          agent: row.agent,
          createdAt: toDate(row.created_at),
        }))
        .sort(compareMessages)
    }
  }

  if (source === 'n8n_fallback') {
    const rows = await supabaseSelect<N8nRow>(
      `n8n_chat_histories?select=id,message&session_id=eq.${eq}&order=id.asc`
    )
    if (rows.length === 0 && !agentUser) return null
    const parsed = n8nRowsToMessages(rows)
    messages = parsed.messages
    internalStepsHidden = parsed.internalHidden
  }

  const { countOpenTicketsByPhone } = await import('@/lib/whatsapp-tickets')
  const [platformUsers, openTickets] = await Promise.all([
    matchPlatformUsers([phone]),
    countOpenTicketsByPhone().catch(() => new Map<string, number>()),
  ])
  const lastWithDate = [...messages].reverse().find((m) => m.createdAt)

  return {
    phone,
    contactName: agentUser?.name ?? null,
    journeyStage: agentUser?.journey_stage ?? null,
    currentAgent: agentUser?.current_agent ?? null,
    lastActiveAt: toDate(agentUser?.last_active_at) ?? lastWithDate?.createdAt ?? null,
    messageCount: messages.length,
    lastMessage: messages[messages.length - 1]?.content ?? null,
    source,
    platformUser: platformUsers.get(phoneKey(phone)) ?? null,
    agentCounts: countAgents(messages),
    openTickets: openTickets.get(phone) ?? 0,
    messages,
    internalStepsHidden,
  }
}
