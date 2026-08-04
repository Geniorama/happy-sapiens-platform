'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { updateTicket, type TicketUpdate, type Ticket } from '@/lib/whatsapp-tickets'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'admin') throw new Error('No autorizado')
  return session
}

export type UpdateTicketResult = { ok: true; ticket: Ticket } | { ok: false; error: string }

export async function updateTicketAction(
  id: string,
  changes: TicketUpdate
): Promise<UpdateTicketResult> {
  const session = await requireAdmin()

  try {
    const ticket = await updateTicket(id, changes)
    if (!ticket) return { ok: false, error: 'No se encontró el ticket' }

    // Los tickets viven en Supabase, fuera del alcance de los logs del panel.
    // Se registra aquí quién los tocó para que quede rastro del lado nuestro.
    await prisma.systemLog
      .create({
        data: {
          actorEmail: session.user.email ?? 'admin',
          action: 'admin.ticket.updated',
          entityType: 'whatsapp_ticket',
          entityId: id,
          metadata: changes as Prisma.InputJsonValue,
        },
      })
      .catch(() => undefined)

    revalidatePath('/admin/tickets')
    revalidatePath('/admin/conversaciones')
    return { ok: true, ticket }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al actualizar el ticket' }
  }
}
