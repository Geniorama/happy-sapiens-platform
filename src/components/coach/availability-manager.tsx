"use client"

import { useState, useTransition } from "react"
import { Save, Loader2, Copy, Check, ChevronDown, ChevronUp, Plus, Trash2, Timer, ArrowRight, AlertTriangle } from "lucide-react"
import { saveCoachAvailability, type AvailabilitySlot, type TimeBlock } from "@/app/coach/actions"

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = [
  { key: 1, label: "Lunes" },
  { key: 2, label: "Martes" },
  { key: 3, label: "Miércoles" },
  { key: 4, label: "Jueves" },
  { key: 5, label: "Viernes" },
  { key: 6, label: "Sábado" },
  { key: 0, label: "Domingo" },
]

const INTEGRATIONS = [
  {
    id: "google",
    name: "Google Calendar",
    logo: "🗓️",
    steps: [
      "Copia la URL de tu calendario (botón de arriba).",
      "Abre Google Calendar en tu navegador.",
      'En el menú lateral izquierdo, haz clic en el símbolo "+" junto a «Otros calendarios».',
      "Selecciona «Desde URL».",
      "Pega la URL en el campo y haz clic en «Añadir calendario».",
      "Google sincronizará tus citas automáticamente (puede tardar unos minutos).",
    ],
  },
  {
    id: "outlook",
    name: "Outlook Calendar",
    logo: "📅",
    steps: [
      "Copia la URL de tu calendario (botón de arriba).",
      "Abre Outlook Calendar (outlook.com o la app de escritorio).",
      "Haz clic en «Agregar calendario» → «Suscribirse desde web».",
      "Pega la URL en el campo correspondiente.",
      "Dale un nombre y haz clic en «Importar».",
      "Outlook actualizará las citas periódicamente.",
    ],
  },
  {
    id: "zoho",
    name: "Zoho Calendar",
    logo: "📆",
    steps: [
      "Copia la URL de tu calendario (botón de arriba).",
      'Abre Zoho Calendar y haz clic en el ícono "+" junto a «Mis calendarios».',
      "Selecciona «Suscribirse a un calendario externo».",
      "Pega la URL en el campo de URL del calendario.",
      "Dale un nombre y haz clic en «Guardar».",
      "Zoho sincronizará tus citas automáticamente.",
    ],
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayState {
  day_of_week: number
  is_available: boolean
  blocks: TimeBlock[]
}

// ─── Build initial state from DB rows ────────────────────────────────────────

const DURATION_OPTIONS = [
  { value: 30,  label: "30 min" },
  { value: 45,  label: "45 min" },
  { value: 60,  label: "1 hora" },
  { value: 90,  label: "1 h 30 min" },
  { value: 120, label: "2 horas" },
]

function buildInitialState(dbRows: { day_of_week: number; start_time: string; end_time: string; is_available: boolean; slot_duration?: number }[]): DayState[] {
  return DAYS.map((d) => {
    const rows = dbRows.filter((r) => r.day_of_week === d.key && r.is_available)
    return {
      day_of_week: d.key,
      is_available: rows.length > 0,
      blocks:
        rows.length > 0
          ? rows.map((r) => ({
              start_time: r.start_time.slice(0, 5),
              end_time: r.end_time.slice(0, 5),
              slot_duration: r.slot_duration ?? 60,
            }))
          : [{ start_time: "09:00", end_time: "18:00", slot_duration: 60 }],
    }
  })
}

// ─── Sub-component: single time block row ────────────────────────────────────

function TimeBlockRow({
  block,
  canDelete,
  onChange,
  onDelete,
}: {
  block: TimeBlock
  canDelete: boolean
  onChange: (b: TimeBlock) => void
  onDelete: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Rango horario */}
      <input
        type="time"
        value={block.start_time}
        onChange={(e) => onChange({ ...block, start_time: e.target.value })}
        className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
      />
      <span className="text-zinc-400 text-sm">–</span>
      <input
        type="time"
        value={block.end_time}
        onChange={(e) => onChange({ ...block, end_time: e.target.value })}
        className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
      />

      {/* Duración del turno */}
      <div className="flex items-center gap-1.5 border border-zinc-200 rounded-lg px-2 py-1.5 bg-white">
        <Timer className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        <select
          value={block.slot_duration ?? 60}
          onChange={(e) => onChange({ ...block, slot_duration: Number(e.target.value) })}
          className="text-sm text-zinc-700 bg-transparent focus:outline-none cursor-pointer"
          aria-label="Duración del turno"
        >
          {DURATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Eliminar bloque */}
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          aria-label="Eliminar bloque"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AvailabilityManager({
  initialSlots,
  calendarUrl,
}: {
  initialSlots: { day_of_week: number; start_time: string; end_time: string; is_available: boolean }[]
  calendarUrl: string
}) {
  const [days, setDays] = useState<DayState[]>(buildInitialState(initialSlots))
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [openIntegration, setOpenIntegration] = useState<string | null>(null)

  // ── Day helpers ──────────────────────────────────────────────────────────────

  function toggleDay(dayOfWeek: number) {
    setDays((prev) =>
      prev.map((d) => (d.day_of_week === dayOfWeek ? { ...d, is_available: !d.is_available } : d))
    )
  }

  function updateBlock(dayOfWeek: number, blockIndex: number, updated: TimeBlock) {
    setDays((prev) =>
      prev.map((d) => {
        if (d.day_of_week !== dayOfWeek) return d
        const blocks = d.blocks.map((b, i) => (i === blockIndex ? updated : b))
        return { ...d, blocks }
      })
    )
  }

  function addBlock(dayOfWeek: number) {
    setDays((prev) =>
      prev.map((d) => {
        if (d.day_of_week !== dayOfWeek) return d
        // Start next block after the last one ends
        const last = d.blocks[d.blocks.length - 1]
        const [h] = last.end_time.split(":").map(Number)
        const newStart = `${String(Math.min(h, 22)).padStart(2, "0")}:00`
        const newEnd = `${String(Math.min(h + 1, 23)).padStart(2, "0")}:00`
        const lastDuration = last.slot_duration ?? 60
        return { ...d, blocks: [...d.blocks, { start_time: newStart, end_time: newEnd, slot_duration: lastDuration }] }
      })
    )
  }

  function removeBlock(dayOfWeek: number, blockIndex: number) {
    setDays((prev) =>
      prev.map((d) => {
        if (d.day_of_week !== dayOfWeek) return d
        return { ...d, blocks: d.blocks.filter((_, i) => i !== blockIndex) }
      })
    )
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  function handleSave() {
    startTransition(async () => {
      setMessage(null)
      const payload: AvailabilitySlot[] = days.map((d) => ({
        day_of_week: d.day_of_week,
        is_available: d.is_available,
        blocks: d.blocks,
      }))
      const result = await saveCoachAvailability(payload)
      if (result.error) {
        setMessage({ type: "error", text: result.error })
      } else {
        setMessage({ type: "success", text: "Disponibilidad guardada correctamente" })
      }
    })
  }

  // ── Copy URL ─────────────────────────────────────────────────────────────────

  async function handleCopy() {
    await navigator.clipboard.writeText(calendarUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Disponibilidad semanal ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="font-heading text-base text-zinc-900">Horario de atención semanal</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Activa cada día y añade uno o más bloques horarios de disponibilidad
          </p>
        </div>

        <div className="divide-y divide-zinc-100">
          {DAYS.map((day) => {
            const dayState = days.find((d) => d.day_of_week === day.key)!
            return (
              <div
                key={day.key}
                className={`px-6 py-4 transition-colors ${
                  dayState.is_available ? "bg-white" : "bg-zinc-50/50"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleDay(day.key)}
                    className={`relative mt-0.5 w-10 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                      dayState.is_available ? "bg-primary" : "bg-zinc-200"
                    }`}
                    aria-label={dayState.is_available ? "Deshabilitar" : "Habilitar"}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        dayState.is_available ? "left-5" : "left-1"
                      }`}
                    />
                  </button>

                  {/* Day name */}
                  <span
                    className={`w-24 text-sm font-medium pt-0.5 shrink-0 ${
                      dayState.is_available ? "text-zinc-900" : "text-zinc-400"
                    }`}
                  >
                    {day.label}
                  </span>

                  {/* Blocks */}
                  {dayState.is_available ? (
                    <div className="flex-1 space-y-2">
                      {dayState.blocks.map((block, idx) => (
                        <TimeBlockRow
                          key={idx}
                          block={block}
                          canDelete={dayState.blocks.length > 1}
                          onChange={(updated) => updateBlock(day.key, idx, updated)}
                          onDelete={() => removeBlock(day.key, idx)}
                        />
                      ))}

                      {/* Add block */}
                      <button
                        type="button"
                        onClick={() => addBlock(day.key)}
                        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer mt-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar bloque
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400 pt-0.5">No disponible</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-6 py-4 border-t border-zinc-100 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar disponibilidad
          </button>

          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>

      {/* ── Integración unidireccional (iCal) ────────────────────────── */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2 mb-1">
            <ArrowRight className="w-4 h-4 text-zinc-400" strokeWidth={2} />
            <h2 className="font-heading text-base text-zinc-900">Sincronización unidireccional</h2>
            <span className="px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-500 rounded-full">Solo lectura</span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Suscríbete a tu URL iCal para ver las citas de la app en tu calendario. Tus otros eventos <strong>no</strong> bloquean horarios en la app.
          </p>
        </div>

        {/* Aviso de limitación */}
        <div className="mx-6 mt-4 flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="text-xs text-amber-800 space-y-1">
            <p><strong>Limitación:</strong> Esta integración solo muestra citas de la app en tu calendario externo.</p>
            <p>Para que tus reuniones, vacaciones u otros compromisos bloqueen automáticamente tu disponibilidad en la app, usa la <strong>sincronización bidireccional con Google Calendar</strong> (sección de arriba).</p>
          </div>
        </div>

        {/* iCal URL */}
        <div className="px-6 py-5 border-b border-zinc-100 mt-4">
          <p className="text-xs font-medium text-zinc-600 mb-2">Tu URL de calendario (iCal)</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={calendarUrl}
              className="flex-1 px-3 py-2 text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-lg font-mono truncate focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-green-600">Copiada</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar URL
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Esta URL es privada. Úsala para suscribir tu calendario externo y ver tus citas en tiempo real.
          </p>
        </div>

        {/* Instructions accordion */}
        <div className="divide-y divide-zinc-100">
          {INTEGRATIONS.map((integration) => {
            const isOpen = openIntegration === integration.id
            return (
              <div key={integration.id}>
                <button
                  onClick={() => setOpenIntegration(isOpen ? null : integration.id)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{integration.logo}</span>
                    <span className="text-sm font-medium text-zinc-900">{integration.name}</span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-6 pb-5">
                    <ol className="space-y-2.5">
                      {integration.steps.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-zinc-600">{step}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                      <p className="text-xs text-amber-700">
                        La sincronización puede tardar hasta 24 horas en reflejarse según el calendario. Las nuevas citas y cambios de estado se actualizarán automáticamente.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
