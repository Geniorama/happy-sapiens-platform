// Tipos y etiquetas de los tickets de escalación del agente de WhatsApp.
//
// Igual que en las conversaciones, va aparte del módulo de datos para que el
// componente cliente no arrastre Prisma ni la service_role key al navegador.

import type { PlatformUserMatch } from '@/lib/whatsapp-conversations-shared'

// `status` en Supabase es texto libre (sin enum ni CHECK), y n8n crea los tickets
// con 'open'. Estos son los valores que maneja el panel; cualquier otro que
// aparezca se muestra tal cual en vez de descartarse.
//
// `closed` es para tickets que se sacan de la bandeja SIN haberse atendido
// (duplicados, falsas alarmas, escalaciones que ya no aplican). Se distingue de
// `resolved` a propósito: mezclarlos haría que las escalaciones descartadas
// cuenten como atendidas.
export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En proceso',
  resolved: 'Resuelto',
  closed: 'Cerrado sin resolver',
}

export const PRIORITY_LABELS: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

export const CATEGORY_LABELS: Record<string, string> = {
  escalation: 'Escalación',
  support: 'Soporte',
  sales: 'Ventas',
  billing: 'Facturación',
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

export function priorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority] ?? priority
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

// Sigue pendiente de atención (aparece en la bandeja y cuenta como escalación
// sin resolver en el módulo de conversaciones).
export function isOpenStatus(status: string): boolean {
  return status !== 'resolved' && status !== 'closed'
}

// Se atendió de verdad. `closed` NO cuenta: se cerró sin resolver.
export function isResolvedStatus(status: string): boolean {
  return status === 'resolved'
}

export type Ticket = {
  id: string
  priority: string
  category: string
  status: string
  summary: string | null
  // Contexto que dejó el agente al escalar (p.ej. el último mensaje del cliente).
  lastMessage: string | null
  assignedTo: string | null
  resolutionNotes: string | null
  createdAt: Date | null
  updatedAt: Date | null
  resolvedAt: Date | null
  // Contacto de WhatsApp que originó el ticket.
  phone: string | null
  contactName: string | null
  // Usuario de la plataforma, si el teléfono cruza.
  platformUser: PlatformUserMatch | null
}

export type TicketAdmin = { name: string | null; email: string }
