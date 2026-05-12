"use client"

import { useState, useTransition } from "react"
import { Bell, Save, Plus, Trash2, Check, X } from "lucide-react"
import {
  createReminderRule,
  updateReminderRule,
  toggleReminderRuleActive,
  deleteReminderRule,
  type ReminderRuleData,
} from "@/app/admin/reminders/actions"

interface Rule extends ReminderRuleData {
  id: string
}

const inputClass =
  "w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
const labelClass = "block text-xs font-medium text-zinc-600 mb-1"

const PLACEHOLDERS: { token: string; label: string }[] = [
  { token: "{coachName}", label: "Nombre del coach" },
  { token: "{userName}", label: "Nombre del usuario" },
  { token: "{date}", label: "Fecha (ej. lunes 12 de mayo de 2026)" },
  { token: "{time}", label: "Hora (ej. 10:30 AM)" },
  { token: "{duration}", label: "Duración en minutos" },
  { token: "{meetingLink}", label: "URL de Google Meet" },
  { token: "{reason}", label: "Motivo de consulta" },
]

function emptyRule(): Rule {
  return {
    id: "new",
    key: "",
    name: "",
    hoursBefore: 24,
    windowMinutes: 60,
    isActive: true,
    sendToUser: true,
    sendToCoach: true,
    subjectUser: "",
    bodyUser: "",
    subjectCoach: "",
    bodyCoach: "",
  }
}

export function RemindersManager({ initialRules }: { initialRules: Rule[] }) {
  const [isCreating, setIsCreating] = useState(false)

  return (
    <div className="space-y-4">
      <PlaceholdersHelp />

      {!isCreating && (
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          Nueva regla
        </button>
      )}

      {isCreating && (
        <RuleCard
          rule={emptyRule()}
          isNew
          onCancel={() => setIsCreating(false)}
          onSaved={() => setIsCreating(false)}
        />
      )}

      {initialRules.length === 0 && !isCreating && (
        <div className="p-6 bg-white border border-dashed border-zinc-300 rounded-xl text-center text-sm text-zinc-500">
          No hay reglas configuradas. Crea la primera para empezar a enviar recordatorios.
        </div>
      )}

      {initialRules.map((rule) => (
        <RuleCard key={rule.id} rule={rule} />
      ))}
    </div>
  )
}

function PlaceholdersHelp() {
  return (
    <details className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
      <summary className="font-medium text-amber-900 cursor-pointer">
        Placeholders disponibles (haz click para ver)
      </summary>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {PLACEHOLDERS.map((p) => (
          <div key={p.token} className="flex items-baseline gap-2">
            <code className="font-mono text-xs px-1.5 py-0.5 bg-white border border-amber-200 rounded text-amber-900">
              {p.token}
            </code>
            <span className="text-xs text-zinc-600">{p.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-600">
        Los placeholders se reemplazan automáticamente en el asunto y cuerpo al enviarse. El cuerpo
        se renderiza dentro de la plantilla HTML estándar (logo, botón de Meet, datos de la cita).
      </p>
    </details>
  )
}

interface RuleCardProps {
  rule: Rule
  isNew?: boolean
  onCancel?: () => void
  onSaved?: () => void
}

function RuleCard({ rule, isNew, onCancel, onSaved }: RuleCardProps) {
  const [form, setForm] = useState<Rule>(rule)
  const [committedActive, setCommittedActive] = useState<boolean>(rule.isActive)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isToggling, startToggle] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  const handleSave = () => {
    setError(null)
    setSavedAt(null)
    startTransition(async () => {
      const payload: ReminderRuleData = {
        key: form.key,
        name: form.name,
        hoursBefore: form.hoursBefore,
        windowMinutes: form.windowMinutes,
        isActive: isNew ? form.isActive : committedActive,
        sendToUser: form.sendToUser,
        sendToCoach: form.sendToCoach,
        subjectUser: form.subjectUser,
        bodyUser: form.bodyUser,
        subjectCoach: form.subjectCoach,
        bodyCoach: form.bodyCoach,
      }
      const result = isNew
        ? await createReminderRule(payload)
        : await updateReminderRule(rule.id, payload)
      if (result.error) {
        setError(result.error)
      } else {
        setSavedAt(Date.now())
        if (isNew) onSaved?.()
      }
    })
  }

  const handleToggleActive = () => {
    if (isNew) {
      setForm({ ...form, isActive: !form.isActive })
      return
    }
    const next = !committedActive
    setError(null)
    startToggle(async () => {
      const result = await toggleReminderRuleActive(rule.id, next)
      if (result.error) {
        setError(result.error)
      } else {
        setCommittedActive(next)
      }
    })
  }

  const handleDelete = () => {
    if (isNew) {
      onCancel?.()
      return
    }
    if (!confirm(`¿Eliminar la regla "${rule.name}"? Esta acción no se puede deshacer.`)) return
    setError(null)
    startDelete(async () => {
      const result = await deleteReminderRule(rule.id)
      if (result.error) setError(result.error)
    })
  }

  const activeNow = isNew ? form.isActive : committedActive

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
        activeNow ? "border-zinc-200" : "border-zinc-300 bg-zinc-50/50"
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 bg-zinc-50">
        <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Bell className="w-4 h-4 text-amber-700" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-zinc-900">{form.name || (isNew ? "Nueva regla" : rule.name)}</p>
          <p className="text-xs font-mono text-zinc-500 truncate">
            {form.hoursBefore}h antes · clave: {form.key || "—"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={isToggling}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
              activeNow
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300"
            }`}
          >
            {activeNow ? "Activa" : "Inactiva"}
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Datos de la regla */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Recordatorio del día anterior"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Clave (única, sin espacios)</label>
            <input
              type="text"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              placeholder="reminder-24h"
              className={inputClass + " font-mono"}
            />
          </div>
          <div>
            <label className={labelClass}>Antelación (horas antes de la cita)</label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              value={form.hoursBefore}
              onChange={(e) =>
                setForm({ ...form, hoursBefore: Number(e.target.value) })
              }
              className={inputClass}
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Acepta decimales. Ej: 0.5 = 30 min, 24 = 1 día, 48 = 2 días.
            </p>
          </div>
          <div>
            <label className={labelClass}>Tolerancia (minutos, ventana total)</label>
            <input
              type="number"
              step="5"
              min="5"
              max="360"
              value={form.windowMinutes}
              onChange={(e) =>
                setForm({ ...form, windowMinutes: Number(e.target.value) })
              }
              className={inputClass}
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Margen ± mitad de este valor alrededor del momento. Mínimo recomendado: cadencia del
              cron × 2.
            </p>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-4">
          <ToggleLabel
            checked={form.sendToUser}
            onChange={(v) => setForm({ ...form, sendToUser: v })}
            label="Enviar al usuario"
          />
          <ToggleLabel
            checked={form.sendToCoach}
            onChange={(v) => setForm({ ...form, sendToCoach: v })}
            label="Enviar al coach"
          />
        </div>

        {/* Contenido usuario */}
        {form.sendToUser && (
          <div className="space-y-3 p-4 bg-blue-50/40 border border-blue-100 rounded-lg">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-900">
              Correo al usuario
            </p>
            <div>
              <label className={labelClass}>Asunto</label>
              <input
                type="text"
                value={form.subjectUser}
                onChange={(e) => setForm({ ...form, subjectUser: e.target.value })}
                placeholder="Recordatorio: tu cita con {coachName} es mañana"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Cuerpo (texto plano, los saltos de línea se respetan)</label>
              <textarea
                rows={4}
                value={form.bodyUser}
                onChange={(e) => setForm({ ...form, bodyUser: e.target.value })}
                placeholder="Te recordamos que tienes una cita con {coachName} mañana..."
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* Contenido coach */}
        {form.sendToCoach && (
          <div className="space-y-3 p-4 bg-emerald-50/40 border border-emerald-100 rounded-lg">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
              Correo al coach
            </p>
            <div>
              <label className={labelClass}>Asunto</label>
              <input
                type="text"
                value={form.subjectCoach}
                onChange={(e) => setForm({ ...form, subjectCoach: e.target.value })}
                placeholder="Recordatorio: cita con {userName} mañana"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Cuerpo</label>
              <textarea
                rows={4}
                value={form.bodyCoach}
                onChange={(e) => setForm({ ...form, bodyCoach: e.target.value })}
                placeholder="Te recordamos que tienes una cita con {userName} mañana..."
                className={inputClass}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
          {isNew && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {savedAt && Date.now() - savedAt < 2500 ? (
              <>
                <Check className="w-4 h-4" />
                Guardado
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isPending ? "Guardando…" : isNew ? "Crear regla" : "Guardar cambios"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function ToggleLabel({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
      />
      <span className="text-sm text-zinc-700">{label}</span>
    </label>
  )
}
