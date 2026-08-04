'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { TicketIcon, MessageSquare, Check, Loader2, ExternalLink } from 'lucide-react'
import { updateTicketAction } from '@/app/admin/tickets/actions'
import { formatPhone } from '@/lib/whatsapp-conversations-shared'
import {
  TICKET_STATUSES,
  statusLabel,
  priorityLabel,
  categoryLabel,
  isOpenStatus,
  type Ticket,
  type TicketAdmin,
} from '@/lib/whatsapp-tickets-shared'

function statusBadgeClass(status: string) {
  if (status === 'resolved' || status === 'closed') return 'bg-green-100 text-green-700'
  if (status === 'in_progress') return 'bg-blue-100 text-blue-700'
  return 'bg-amber-100 text-amber-700'
}

function priorityBadgeClass(priority: string) {
  if (priority === 'high') return 'bg-red-100 text-red-700'
  if (priority === 'low') return 'bg-zinc-100 text-zinc-600'
  return 'bg-orange-100 text-orange-700'
}

function formatDateTime(date: Date | null) {
  if (!date) return '—'
  return new Date(date).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TicketCard({
  ticket,
  admins,
  onChange,
}: {
  ticket: Ticket
  admins: TicketAdmin[]
  onChange: (ticket: Ticket) => void
}) {
  const [notes, setNotes] = useState(ticket.resolutionNotes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const apply = (changes: Parameters<typeof updateTicketAction>[1]) => {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateTicketAction(ticket.id, changes)
      if (result.ok) {
        onChange(result.ticket)
        setSaved(true)
      } else {
        setError(result.error)
      }
    })
  }

  const notesChanged = (ticket.resolutionNotes ?? '') !== notes

  return (
    <div className="border border-zinc-200 rounded-lg bg-white p-4">
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${priorityBadgeClass(ticket.priority)}`}>
          {priorityLabel(ticket.priority)}
        </span>
        <span className="text-[11px] px-1.5 py-0.5 rounded font-medium bg-zinc-100 text-zinc-600">
          {categoryLabel(ticket.category)}
        </span>
        <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${statusBadgeClass(ticket.status)}`}>
          {statusLabel(ticket.status)}
        </span>
        <span className="text-xs text-zinc-400 ml-auto">{formatDateTime(ticket.createdAt)}</span>
      </div>

      <div className="mb-3">
        <p className="font-semibold text-sm text-zinc-900">
          {ticket.contactName || (ticket.phone ? formatPhone(ticket.phone) : 'Contacto desconocido')}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500 mt-0.5">
          {ticket.phone && <span>{formatPhone(ticket.phone)}</span>}
          {ticket.platformUser && (
            <span className="text-purple-700 font-medium">
              Suscriptor: {ticket.platformUser.name || ticket.platformUser.email}
            </span>
          )}
          {ticket.phone && (
            <Link
              href={`/admin/conversaciones?phone=${encodeURIComponent(ticket.phone)}`}
              className="text-green-700 font-medium hover:underline inline-flex items-center gap-1"
            >
              <MessageSquare className="w-3 h-3" />
              Ver conversación
            </Link>
          )}
        </div>
      </div>

      {ticket.summary && <p className="text-sm text-zinc-700 mb-2">{ticket.summary}</p>}

      {ticket.lastMessage && (
        <p className="text-xs text-zinc-600 bg-zinc-50 border-l-2 border-zinc-300 pl-2 py-1.5 mb-3">
          Último mensaje del cliente: «{ticket.lastMessage}»
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-100">
        <select
          value={ticket.status}
          onChange={(e) => apply({ status: e.target.value })}
          disabled={isPending}
          className="text-xs border border-zinc-200 rounded-md px-2 py-1.5 bg-white cursor-pointer disabled:opacity-50"
        >
          {/* Un estado que venga del flujo y no esté en la lista se agrega para no perderlo. */}
          {[...new Set([...TICKET_STATUSES, ticket.status])].map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>

        <select
          value={ticket.assignedTo ?? ''}
          onChange={(e) => apply({ assignedTo: e.target.value })}
          disabled={isPending}
          className="text-xs border border-zinc-200 rounded-md px-2 py-1.5 bg-white cursor-pointer disabled:opacity-50"
        >
          <option value="">Sin asignar</option>
          {admins.map((admin) => (
            <option key={admin.email} value={admin.email}>
              {admin.name || admin.email}
            </option>
          ))}
          {/* Si quedó asignado a alguien que ya no es admin, se conserva la opción. */}
          {ticket.assignedTo && !admins.some((a) => a.email === ticket.assignedTo) && (
            <option value={ticket.assignedTo}>{ticket.assignedTo}</option>
          )}
        </select>

        {isPending && <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />}
        {saved && !isPending && (
          <span className="text-xs text-green-600 inline-flex items-center gap-1">
            <Check className="w-3 h-3" />
            Guardado
          </span>
        )}
        {error && <span className="text-xs text-red-600">{error}</span>}

        {ticket.resolvedAt && (
          <span className="text-xs text-zinc-400 ml-auto">
            Resuelto el {formatDateTime(ticket.resolvedAt)}
          </span>
        )}
      </div>

      <div className="mt-3">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas de resolución…"
          rows={2}
          className="w-full text-xs border border-zinc-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
        />
        {notesChanged && (
          <button
            onClick={() => apply({ resolutionNotes: notes })}
            disabled={isPending}
            className="mt-1.5 text-xs px-3 py-1.5 rounded-md bg-zinc-900 text-white font-medium hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
          >
            Guardar notas
          </button>
        )}
      </div>
    </div>
  )
}

export function TicketsManager({ tickets, admins }: { tickets: Ticket[]; admins: TicketAdmin[] }) {
  const [rows, setRows] = useState(tickets)
  const [showResolved, setShowResolved] = useState(false)

  const open = useMemo(() => rows.filter((t) => isOpenStatus(t.status)), [rows])
  const resolved = useMemo(() => rows.filter((t) => !isOpenStatus(t.status)), [rows])
  const visible = showResolved ? resolved : open

  const onChange = (updated: Ticket) => {
    setRows((current) => current.map((t) => (t.id === updated.id ? updated : t)))
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-zinc-900">Tickets</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Escalaciones que abrió el agente de WhatsApp cuando no pudo resolver por sí solo.
        </p>
      </div>

      <div className="flex gap-1.5 mb-4">
        <button
          onClick={() => setShowResolved(false)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
            !showResolved
              ? 'bg-zinc-900 text-white border-zinc-900'
              : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
          }`}
        >
          Sin resolver <span className={!showResolved ? 'text-zinc-300' : 'text-zinc-400'}>{open.length}</span>
        </button>
        <button
          onClick={() => setShowResolved(true)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
            showResolved
              ? 'bg-zinc-900 text-white border-zinc-900'
              : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
          }`}
        >
          Resueltos <span className={showResolved ? 'text-zinc-300' : 'text-zinc-400'}>{resolved.length}</span>
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400 border border-dashed border-zinc-200 rounded-lg">
          <TicketIcon className="w-8 h-8 mb-2" />
          <p className="text-sm">
            {showResolved ? 'Todavía no hay tickets resueltos.' : 'No hay tickets sin resolver.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {visible.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} admins={admins} onChange={onChange} />
          ))}
        </div>
      )}

      <p className="text-xs text-zinc-400 mt-6 flex items-center gap-1">
        <ExternalLink className="w-3 h-3" />
        Los tickets los crea el agente de n8n; los cambios de estado se guardan en su base de datos.
      </p>
    </div>
  )
}
