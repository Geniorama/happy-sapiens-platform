'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import Link from 'next/link'
import {
  MessageSquare,
  Search,
  ArrowLeft,
  Bot,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Ticket as TicketIcon,
} from 'lucide-react'
import { loadConversation } from '@/app/admin/conversaciones/actions'
import { formatDateCO, formatDateTimeCO } from '@/lib/format-date-co'
import {
  formatPhone,
  agentLabel,
  type ConversationSummary,
  type ConversationDetail,
} from '@/lib/whatsapp-conversations-shared'

const STAGE_LABELS: Record<string, string> = {
  discovery: 'Descubrimiento',
  considering: 'Considerando',
  customer: 'Cliente',
  churned: 'Inactivo',
}

function stageBadgeClass(stage: string) {
  if (stage === 'customer') return 'bg-green-100 text-green-700'
  if (stage === 'considering') return 'bg-amber-100 text-amber-700'
  if (stage === 'churned') return 'bg-zinc-200 text-zinc-600'
  return 'bg-blue-100 text-blue-700'
}

// Las fechas se formatean con los helpers deterministas de format-date-co: el
// formateo por locale de Intl difiere entre Node y el navegador y rompe la
// hidratación. Por lo mismo la lista muestra siempre la fecha completa en vez de
// un «hoy/ayer» relativo, que dependería de la hora actual de cada lado.

export function ConversationsViewer({
  conversations,
  initialPhone,
}: {
  conversations: ConversationSummary[]
  // Llega desde /admin/tickets con ?phone=… para abrir directo esa conversación.
  initialPhone?: string
}) {
  const [search, setSearch] = useState('')
  const [agentFilter, setAgentFilter] = useState<string | null>(null)
  const [selectedPhone, setSelectedPhone] = useState<string | null>(initialPhone ?? null)
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Los agentes disponibles salen de los datos, no de una lista fija: si el flujo
  // de n8n agrega un sub-agente nuevo, aparece solo.
  const agents = useMemo(() => {
    const totals = new Map<string, number>()
    for (const conversation of conversations) {
      for (const [agent, count] of Object.entries(conversation.agentCounts)) {
        totals.set(agent, (totals.get(agent) ?? 0) + count)
      }
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1])
  }, [conversations])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const digits = term.replace(/\D/g, '')
    return conversations.filter((c) => {
      // Con filtro de agente activo, solo las conversaciones donde ese agente
      // respondió. Las de la fuente de respaldo nunca pasan: el buffer crudo no
      // registra qué agente respondió.
      if (agentFilter && !c.agentCounts[agentFilter]) return false
      if (!term) return true
      const haystack = [c.contactName, c.phone, c.lastMessage, c.platformUser?.name, c.platformUser?.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (haystack.includes(term)) return true
      return digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits)
    })
  }, [conversations, search, agentFilter])

  // Con filtro activo se muestran las respuestas de ese agente y, con cada una,
  // el mensaje del cliente que la provocó: una respuesta suelta sin la pregunta
  // no se entiende.
  const visibleMessages = useMemo(() => {
    if (!detail) return []
    if (!agentFilter) return detail.messages
    const keep = new Set<string>()
    detail.messages.forEach((message, index) => {
      if (message.agent !== agentFilter) return
      keep.add(message.id)
      for (let i = index - 1; i >= 0; i--) {
        if (detail.messages[i].role === 'user') {
          keep.add(detail.messages[i].id)
          break
        }
      }
    })
    return detail.messages.filter((message) => keep.has(message.id))
  }, [detail, agentFilter])

  const select = (phone: string) => {
    setSelectedPhone(phone)
    setDetail(null)
    setError(null)
    startTransition(async () => {
      const result = await loadConversation(phone)
      if (result.ok) setDetail(result.conversation)
      else setError(result.error)
    })
  }

  // Carga el hilo cuando se entra con ?phone=… (enlace desde un ticket).
  // `selectedPhone` ya arranca con ese valor, así que aquí solo falta traer los
  // mensajes; va dentro de la transición para no llamar a setState de forma
  // síncrona durante el efecto.
  useEffect(() => {
    if (!initialPhone) return
    startTransition(async () => {
      const result = await loadConversation(initialPhone)
      if (result.ok) setDetail(result.conversation)
      else setError(result.error)
    })
  }, [initialPhone])

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-zinc-900">Conversaciones</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Historial del agente de WhatsApp. {conversations.length}{' '}
          {conversations.length === 1 ? 'conversación' : 'conversaciones'}. Solo lectura.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 lg:gap-6">
        {/* Lista */}
        <div className={`${selectedPhone ? 'hidden lg:block' : 'block'}`}>
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, teléfono o texto…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
            />
          </div>

          {agents.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button
                onClick={() => setAgentFilter(null)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                  agentFilter === null
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                Todos
              </button>
              {agents.map(([agent, total]) => (
                <button
                  key={agent}
                  onClick={() => setAgentFilter(agentFilter === agent ? null : agent)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                    agentFilter === agent
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  {agentLabel(agent)}
                  <span className={agentFilter === agent ? 'text-green-100' : 'text-zinc-400'}> {total}</span>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2 lg:max-h-[calc(100vh-17rem)] lg:overflow-y-auto lg:pr-1">
            {filtered.length === 0 && (
              <p className="text-sm text-zinc-500 py-8 text-center">
                {agentFilter
                  ? `Ninguna conversación tiene respuestas de ${agentLabel(agentFilter)}.`
                  : 'Sin resultados.'}
              </p>
            )}

            {filtered.map((conversation) => {
              const isSelected = conversation.phone === selectedPhone
              return (
                <button
                  key={conversation.phone}
                  onClick={() => select(conversation.phone)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-green-500 bg-green-50'
                      : 'border-zinc-200 bg-white hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-sm text-zinc-900 truncate">
                      {conversation.contactName || formatPhone(conversation.phone)}
                    </span>
                    <span className="text-xs text-zinc-400 shrink-0">
                      {formatDateCO(conversation.lastActiveAt)}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500 mt-0.5">{formatPhone(conversation.phone)}</p>

                  {conversation.lastMessage && (
                    <p className="text-xs text-zinc-600 mt-1.5 line-clamp-2">{conversation.lastMessage}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {conversation.journeyStage && (
                      <span
                        className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${stageBadgeClass(conversation.journeyStage)}`}
                      >
                        {STAGE_LABELS[conversation.journeyStage] ?? conversation.journeyStage}
                      </span>
                    )}
                    {conversation.platformUser && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded font-medium bg-purple-100 text-purple-700">
                        Suscriptor
                      </span>
                    )}
                    {conversation.openTickets > 0 && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded font-medium bg-red-100 text-red-700">
                        {conversation.openTickets === 1
                          ? 'Ticket abierto'
                          : `${conversation.openTickets} tickets abiertos`}
                      </span>
                    )}
                    {conversation.source === 'n8n_fallback' && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded font-medium bg-orange-100 text-orange-700">
                        Sin registro detallado
                      </span>
                    )}
                    <span className="text-[11px] text-zinc-400 ml-auto">
                      {agentFilter
                        ? `${conversation.agentCounts[agentFilter]} de ${agentLabel(agentFilter)}`
                        : `${conversation.messageCount} msj`}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Hilo */}
        <div className={`${selectedPhone ? 'block' : 'hidden lg:block'}`}>
          {!selectedPhone && (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-zinc-400 border border-dashed border-zinc-200 rounded-lg">
              <MessageSquare className="w-8 h-8 mb-2" />
              <p className="text-sm">Selecciona una conversación</p>
            </div>
          )}

          {selectedPhone && (
            <div className="border border-zinc-200 rounded-lg bg-white">
              <div className="p-4 border-b border-zinc-100">
                <button
                  onClick={() => setSelectedPhone(null)}
                  className="lg:hidden flex items-center gap-1 text-sm text-zinc-600 mb-3 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver
                </button>

                <h2 className="font-semibold text-zinc-900">
                  {detail?.contactName || formatPhone(selectedPhone)}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">{formatPhone(selectedPhone)}</p>

                {detail?.platformUser && (
                  <div className="mt-2 text-xs text-zinc-600">
                    Suscriptor:{' '}
                    <Link
                      href={`/admin/users?q=${encodeURIComponent(detail.platformUser.email ?? '')}`}
                      className="text-green-700 font-medium hover:underline inline-flex items-center gap-1"
                    >
                      {detail.platformUser.name || detail.platformUser.email}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    {detail.platformUser.subscriptionStatus && (
                      <span className="text-zinc-400"> · {detail.platformUser.subscriptionStatus}</span>
                    )}
                  </div>
                )}
              </div>

              {detail && detail.openTickets > 0 && (
                <div className="flex gap-2 items-center px-4 py-2.5 bg-red-50 border-b border-red-100 text-xs text-red-800">
                  <TicketIcon className="w-4 h-4 shrink-0" />
                  <span>
                    Este contacto tiene{' '}
                    {detail.openTickets === 1
                      ? 'un ticket de escalación sin resolver'
                      : `${detail.openTickets} tickets de escalación sin resolver`}
                    .
                  </span>
                  <Link href="/admin/tickets" className="ml-auto font-medium hover:underline shrink-0">
                    Ver tickets
                  </Link>
                </div>
              )}

              {detail?.source === 'n8n_fallback' && (
                <div className="flex gap-2 items-start px-4 py-3 bg-orange-50 border-b border-orange-100 text-xs text-orange-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    Esta conversación solo existe en la memoria cruda del agente: no quedó registrada en
                    la tabla <code>messages</code>. Se muestra el hilo sin fechas ni el agente que
                    respondió
                    {detail.internalStepsHidden > 0 && (
                      <>
                        , y se ocultaron {detail.internalStepsHidden}{' '}
                        {detail.internalStepsHidden === 1 ? 'paso interno' : 'pasos internos'} del router
                        que no son mensajes al cliente
                      </>
                    )}
                    .
                  </p>
                </div>
              )}

              {agentFilter && detail && visibleMessages.length > 0 && (
                <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-100 text-xs text-zinc-600 flex items-center justify-between gap-2">
                  <span>
                    Mostrando {detail.agentCounts[agentFilter] ?? 0}{' '}
                    {(detail.agentCounts[agentFilter] ?? 0) === 1 ? 'respuesta' : 'respuestas'} de{' '}
                    {agentLabel(agentFilter)}, con el mensaje del cliente que precede a cada una.
                  </span>
                  <button
                    onClick={() => setAgentFilter(null)}
                    className="shrink-0 font-medium text-green-700 hover:underline cursor-pointer"
                  >
                    Ver todo
                  </button>
                </div>
              )}

              <div className="p-4 space-y-3 max-h-[calc(100vh-20rem)] overflow-y-auto">
                {isPending && (
                  <div className="flex items-center justify-center py-10 text-zinc-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}

                {error && <p className="text-sm text-red-600 py-6 text-center">{error}</p>}

                {detail && visibleMessages.length === 0 && !isPending && (
                  <p className="text-sm text-zinc-500 py-6 text-center">
                    {agentFilter
                      ? `Sin respuestas de ${agentLabel(agentFilter)} en esta conversación.`
                      : 'Sin mensajes.'}
                  </p>
                )}

                {visibleMessages.map((message) => {
                  const isAssistant = message.role === 'assistant'
                  const timestamp = message.createdAt ? formatDateTimeCO(message.createdAt) : null
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isAssistant ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] sm:max-w-[75%]`}>
                        <div
                          className={`px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words ${
                            isAssistant
                              ? 'bg-green-600 text-white rounded-br-sm'
                              : 'bg-zinc-100 text-zinc-900 rounded-bl-sm'
                          }`}
                        >
                          {message.content}
                        </div>
                        <div
                          className={`flex items-center gap-1.5 mt-1 text-[11px] text-zinc-400 ${
                            isAssistant ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {isAssistant && message.agent && (
                            <span className="inline-flex items-center gap-1">
                              <Bot className="w-3 h-3" />
                              {agentLabel(message.agent)}
                            </span>
                          )}
                          {timestamp && <span>{timestamp}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
