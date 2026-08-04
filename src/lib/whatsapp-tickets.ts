import { prisma } from '@/lib/db'
import { supabaseSelect, supabasePatch } from '@/lib/supabase'
import { matchPlatformUsers, phoneKey } from '@/lib/whatsapp-conversations'
import {
  isOpenStatus,
  isResolvedStatus,
  type Ticket,
  type TicketAdmin,
} from '@/lib/whatsapp-tickets-shared'

// Tickets de escalación que crea el agente de WhatsApp cuando no puede resolver
// (cliente molesto, pide hablar con un humano, etc.). Viven en el mismo Supabase
// que las conversaciones.
//
// Las columnas son todas texto libre: `status` no tiene enum ni CHECK, y n8n
// crea los tickets con 'open'. El panel maneja open/in_progress/resolved, pero un
// valor distinto que llegue desde el flujo se muestra tal cual.

export type { Ticket, TicketAdmin } from '@/lib/whatsapp-tickets-shared'

type SupabaseTicket = {
  id: string
  user_id: string | null
  priority: string | null
  category: string | null
  status: string | null
  summary: string | null
  context: Record<string, unknown> | null
  assigned_to: string | null
  resolution_notes: string | null
  created_at: string | null
  updated_at: string | null
  resolved_at: string | null
}

type SupabaseAgentUser = {
  id: string
  phone_number: string | null
  name: string | null
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const TICKET_FIELDS =
  'id,user_id,priority,category,status,summary,context,assigned_to,resolution_notes,created_at,updated_at,resolved_at'

async function enrich(rows: SupabaseTicket[]): Promise<Ticket[]> {
  if (rows.length === 0) return []

  const agentUsers = await supabaseSelect<SupabaseAgentUser>('users?select=id,phone_number,name')
  const usersById = new Map(agentUsers.map((u) => [u.id, u]))
  const phones = rows
    .map((row) => (row.user_id ? usersById.get(row.user_id)?.phone_number : null))
    .filter((phone): phone is string => !!phone)
  const platformUsers = await matchPlatformUsers(phones)

  return rows.map((row) => {
    const agentUser = row.user_id ? usersById.get(row.user_id) : null
    const phone = agentUser?.phone_number ?? null
    const lastMessage = row.context?.last_message

    return {
      id: row.id,
      priority: row.priority ?? 'medium',
      category: row.category ?? 'escalation',
      status: row.status ?? 'open',
      summary: row.summary,
      lastMessage: typeof lastMessage === 'string' ? lastMessage : null,
      assignedTo: row.assigned_to,
      resolutionNotes: row.resolution_notes,
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
      resolvedAt: toDate(row.resolved_at),
      phone,
      contactName: agentUser?.name ?? null,
      platformUser: phone ? (platformUsers.get(phoneKey(phone)) ?? null) : null,
    }
  })
}

export async function listTickets(): Promise<Ticket[]> {
  const rows = await supabaseSelect<SupabaseTicket>(
    `tickets?select=${TICKET_FIELDS}&order=created_at.desc`
  )
  return enrich(rows)
}

export async function getTicket(id: string): Promise<Ticket | null> {
  const rows = await supabaseSelect<SupabaseTicket>(
    `tickets?select=${TICKET_FIELDS}&id=eq.${encodeURIComponent(id)}`
  )
  const [ticket] = await enrich(rows)
  return ticket ?? null
}

// Tickets creados después de un instante dado. Lo usa el cron que avisa de las
// escalaciones nuevas.
export async function listTicketsCreatedSince(since: Date): Promise<Ticket[]> {
  const rows = await supabaseSelect<SupabaseTicket>(
    `tickets?select=${TICKET_FIELDS}&created_at=gte.${encodeURIComponent(since.toISOString())}&order=created_at.asc`
  )
  return enrich(rows)
}

// Cuántos tickets sin resolver tiene cada teléfono. Lo usa el módulo de
// conversaciones para marcar los hilos escalados.
export async function countOpenTicketsByPhone(): Promise<Map<string, number>> {
  const [rows, agentUsers] = await Promise.all([
    supabaseSelect<{ user_id: string | null; status: string | null }>('tickets?select=user_id,status'),
    supabaseSelect<SupabaseAgentUser>('users?select=id,phone_number'),
  ])

  const usersById = new Map(agentUsers.map((u) => [u.id, u]))
  const counts = new Map<string, number>()

  for (const row of rows) {
    if (!isOpenStatus(row.status ?? 'open')) continue
    const phone = row.user_id ? usersById.get(row.user_id)?.phone_number : null
    if (!phone) continue
    counts.set(phone, (counts.get(phone) ?? 0) + 1)
  }

  return counts
}

// Admins de la plataforma, para el desplegable de asignación. `assigned_to` es
// texto: se guarda el email, que es el identificador estable entre ambos sistemas.
export async function listAssignableAdmins(): Promise<TicketAdmin[]> {
  const admins = await prisma.user.findMany({
    where: { role: 'admin', email: { not: null } },
    select: { name: true, email: true },
    orderBy: { name: 'asc' },
  })

  return admins
    .filter((admin): admin is { name: string | null; email: string } => !!admin.email)
    .map((admin) => ({ name: admin.name, email: admin.email }))
}

export type TicketUpdate = {
  status?: string
  assignedTo?: string | null
  resolutionNotes?: string | null
}

// Aplica cambios sobre un ticket. `resolved_at` se deriva del estado en vez de
// pedirlo, para que la fecha nunca contradiga al estado.
//
// Solo `resolved` sella `resolved_at`. Un ticket cerrado sin resolver deja esa
// columna vacía a propósito: no se resolvió nada, y estamparla lo haría contar
// como atendido en cualquier reporte que mire esa fecha. El momento del cierre
// queda igual en `updated_at`.
export async function updateTicket(id: string, changes: TicketUpdate): Promise<Ticket | null> {
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (changes.status !== undefined) {
    body.status = changes.status
    body.resolved_at = isResolvedStatus(changes.status) ? new Date().toISOString() : null
  }
  if (changes.assignedTo !== undefined) {
    body.assigned_to = changes.assignedTo || null
  }
  if (changes.resolutionNotes !== undefined) {
    body.resolution_notes = changes.resolutionNotes || null
  }

  const updated = await supabasePatch<SupabaseTicket>(`tickets?id=eq.${encodeURIComponent(id)}`, body)
  if (updated.length === 0) return null

  const [ticket] = await enrich(updated)
  return ticket ?? null
}
