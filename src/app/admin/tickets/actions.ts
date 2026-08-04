'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getTicket, updateTicket, type TicketUpdate, type Ticket } from '@/lib/whatsapp-tickets'
import { notifyTicketAssigned, toTicketNotification } from '@/lib/admin-notifications'

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
    // Estado previo: hace falta para saber si la asignación realmente cambió y
    // no mandarle el mismo correo dos veces a quien ya tenía el ticket.
    const before = await getTicket(id)

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

    const assignedToSomeoneNew =
      !!ticket.assignedTo && ticket.assignedTo !== (before?.assignedTo ?? null)

    if (assignedToSomeoneNew) {
      const assignee = await prisma.user.findFirst({
        where: { email: ticket.assignedTo },
        select: { name: true, email: true },
      })

      // El correo no puede tumbar la asignación: si falla, queda en el log.
      const result = await notifyTicketAssigned(
        toTicketNotification(ticket),
        { email: ticket.assignedTo!, name: assignee?.name },
        session.user.name || session.user.email || null
      )

      await prisma.systemLog
        .create({
          data: {
            actorEmail: session.user.email ?? 'admin',
            action: 'admin.ticket.assigned_notified',
            entityType: 'whatsapp_ticket',
            entityId: id,
            metadata: {
              assignedTo: ticket.assignedTo,
              emailSent: result.success,
              error: result.error ?? null,
            } as Prisma.InputJsonValue,
          },
        })
        .catch(() => undefined)
    }

    revalidatePath('/admin/tickets')
    revalidatePath('/admin/conversaciones')
    return { ok: true, ticket }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al actualizar el ticket' }
  }
}
