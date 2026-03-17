"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  CalendarDays,
  Clock,
  User,
  Mail,
  FileText,
  Link2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  Loader2,
  Save,
  Heart,
  History,
} from "lucide-react"
import { updateAppointment } from "@/app/coach/actions"
import { formatHealthValue } from "@/lib/health-labels"

// ─── Health Snapshot ──────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  age: "Edad",
  gender: "Género",
  occupation: "Ocupación",
  weight: "Peso (kg)",
  height: "Talla (cm)",
  waist_circumference: "Circunferencia de cintura (cm)",
  body_fat_percent: "% grasa corporal",
  diseases: "Enfermedades",
  medications: "Medicamentos",
  supplements: "Suplementos",
  surgeries: "Cirugías",
  allergies: "Alergias",
  intolerances: "Intolerancias",
  family_history: "Antecedentes familiares",
  exercise_type: "Tipo de ejercicio",
  exercise_frequency: "Frecuencia de ejercicio",
  sleep_hours: "Horas de sueño",
  stress_level: "Nivel de estrés (1-5)",
  work_type: "Tipo de trabajo",
  energy_level: "Nivel de energía (1-5)",
  digestion: "Digestión",
  mood: "Estado de ánimo",
  concentration: "Concentración",
  objectives: "Objetivos",
  activity_level: "Nivel de actividad",
  current_exercise_routine: "Rutina de ejercicio actual",
  previous_injuries: "Lesiones previas",
  dietary_restrictions: "Restricciones alimentarias",
  additional_notes: "Notas adicionales",
}

const SECTIONS = [
  {
    title: "Datos básicos",
    fields: ["age", "gender", "occupation"],
  },
  {
    title: "Evaluación antropométrica",
    fields: ["weight", "height", "waist_circumference", "body_fat_percent"],
  },
  {
    title: "Antecedentes médicos",
    fields: ["diseases", "medications", "supplements", "surgeries", "allergies", "intolerances", "family_history"],
  },
  {
    title: "Estilo de vida",
    fields: ["exercise_type", "exercise_frequency", "sleep_hours", "stress_level", "work_type"],
  },
  {
    title: "Evaluación funcional",
    fields: ["energy_level", "digestion", "mood", "concentration"],
  },
  {
    title: "Objetivos y notas",
    fields: ["objectives", "activity_level", "current_exercise_routine", "previous_injuries", "dietary_restrictions", "additional_notes"],
  },
]

function HealthSnapshot({ snapshot }: { snapshot: Record<string, unknown> }) {
  const hasData = SECTIONS.some((section) =>
    section.fields.some((f) => snapshot[f] != null && snapshot[f] !== "")
  )

  if (!hasData) return null

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-5">
      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide flex items-center gap-2">
        <Heart className="w-4 h-4 text-primary" />
        Perfil nutricional del cliente
      </h2>

      {SECTIONS.map((section) => {
        const entries = section.fields
          .map((f) => ({ key: f, label: FIELD_LABELS[f] ?? f, value: snapshot[f] }))
          .filter((e) => e.value != null && e.value !== "")

        if (entries.length === 0) return null

        return (
          <div key={section.title} className="space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide border-b border-zinc-100 pb-1">
              {section.title}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {entries.map(({ key, label, value }) => (
                <div key={key} className="text-sm">
                  <span className="text-zinc-400 text-xs">{label}: </span>
                  <span className="text-zinc-800 font-medium">{formatHealthValue(key, value)}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Status labels ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Programada", className: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "Completada", className: "bg-green-50 text-green-700 border-green-200" },
  cancelled: { label: "Cancelada", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  no_show: { label: "No asistió", className: "bg-red-50 text-red-700 border-red-200" },
}

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  duration_minutes: number
  status: string
  consultation_reason: string
  notes?: string | null
  meeting_link?: string | null
  consultation_snapshot?: Record<string, unknown> | null
  user?: { id: string; name?: string; email?: string; image?: string } | null
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T12:00:00")
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function AppointmentDetail({ appointment }: { appointment: Appointment }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState(appointment.notes || "")
  const [meetingLink, setMeetingLink] = useState(appointment.meeting_link || "")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const statusInfo = STATUS_LABELS[appointment.status] ?? {
    label: appointment.status,
    className: "bg-zinc-100 text-zinc-600 border-zinc-200",
  }

  const isEditable = appointment.status === "scheduled" || appointment.status === "completed"

  const appointmentEnd = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
  appointmentEnd.setMinutes(appointmentEnd.getMinutes() + (appointment.duration_minutes ?? 60))
  const isAppointmentEnded = Date.now() >= appointmentEnd.getTime()

  function handleSave() {
    startTransition(async () => {
      setMessage(null)
      const result = await updateAppointment({
        id: appointment.id,
        notes,
        meetingLink,
      })
      if (result.error) {
        setMessage({ type: "error", text: result.error })
      } else {
        setMessage({ type: "success", text: "Cambios guardados correctamente" })
      }
    })
  }

  function handleStatusChange(newStatus: string) {
    if (!confirm(`¿Confirmas cambiar el estado a "${STATUS_LABELS[newStatus]?.label}"?`)) return
    startTransition(async () => {
      setMessage(null)
      const result = await updateAppointment({ id: appointment.id, status: newStatus, notes, meetingLink })
      if (result.error) {
        setMessage({ type: "error", text: result.error })
      } else {
        setMessage({ type: "success", text: "Estado actualizado" })
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver a citas
        </button>
        <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </div>

      <div>
        <h1 className="font-heading text-xl text-zinc-900">Detalle de cita</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {formatDate(appointment.appointment_date)} — {appointment.appointment_time?.slice(0, 5)}
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* LEFT — info del cliente + detalles + perfil nutricional */}
        <div className="space-y-5">
          {/* Cliente */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Cliente</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                {appointment.user?.image ? (
                  <img
                    src={appointment.user.image}
                    alt={appointment.user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-primary font-semibold">
                    {appointment.user?.name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-zinc-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-zinc-400" />
                  {appointment.user?.name || "Sin nombre"}
                </p>
                <p className="text-sm text-zinc-500 flex items-center gap-2 mt-0.5">
                  <Mail className="w-4 h-4 text-zinc-400" />
                  {appointment.user?.email}
                </p>
              </div>
              {appointment.user?.id && (
                <Link
                  href={`/coach/clients/${appointment.user.id}`}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 border border-primary/30 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <History className="w-3.5 h-3.5" />
                  Ver historial
                </Link>
              )}
            </div>
          </div>

          {/* Detalles de la cita */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Detalles</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" /> Fecha
                </p>
                <p className="text-sm font-medium text-zinc-900">
                  {formatDate(appointment.appointment_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Hora
                </p>
                <p className="text-sm font-medium text-zinc-900">
                  {appointment.appointment_time?.slice(0, 5)} ({appointment.duration_minutes} min)
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Motivo de consulta
              </p>
              <p className="text-sm text-zinc-800 bg-zinc-50 rounded-lg p-3">
                {appointment.consultation_reason}
              </p>
            </div>
          </div>

          {/* Perfil nutricional */}
          {appointment.consultation_snapshot && Object.keys(appointment.consultation_snapshot).length > 0 && (
            <HealthSnapshot snapshot={appointment.consultation_snapshot} />
          )}
        </div>

        {/* RIGHT — gestión de la cita (sticky) */}
        <div className="space-y-5 lg:sticky lg:top-6">
          {/* Link de reunión + Notas */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
              Gestión de la cita
            </h2>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" /> Link de reunión (Google Meet, Zoom, etc.)
              </label>
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                disabled={!isEditable}
                placeholder="https://meet.google.com/..."
                className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                Notas del coach
              </label>
              <textarea
                rows={8}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!isEditable}
                placeholder="Observaciones, diagnóstico, recomendaciones..."
                className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed resize-none"
              />
            </div>

            {isEditable && (
              <button
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Guardar cambios
              </button>
            )}
          </div>

          {/* Cambiar estado */}
          {appointment.status === "scheduled" && (
            <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
                Cambiar estado
              </h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleStatusChange("completed")}
                  disabled={isPending || !isAppointmentEnded}
                  title={!isAppointmentEnded ? "Disponible una vez finalizado el horario de la cita" : undefined}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  Marcar completada
                </button>
                <button
                  onClick={() => handleStatusChange("no_show")}
                  disabled={isPending || !isAppointmentEnded}
                  title={!isAppointmentEnded ? "Disponible una vez finalizado el horario de la cita" : undefined}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  <AlertCircle className="w-4 h-4" />
                  No asistió
                </button>
                <button
                  onClick={() => handleStatusChange("cancelled")}
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-300 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Feedback message */}
          {message && (
            <div
              className={`p-3 rounded-lg text-sm border ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
