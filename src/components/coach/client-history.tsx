"use client"

import { ChevronLeft, CalendarDays, Clock, Heart, FileText, User } from "lucide-react"
import { formatHealthValue } from "@/lib/health-labels"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  created_at?: string | null
}

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  duration_minutes: number
  status: string
  consultation_reason: string
  notes?: string | null
  coach_id: string
  coach?: { id: string; name?: string | null; image?: string | null; specialization?: string | null } | null
}

interface HealthProfile {
  age?: number | null
  gender?: string | null
  occupation?: string | null
  weight?: number | null
  height?: number | null
  waist_circumference?: number | null
  body_fat_percent?: number | null
  diseases?: string | null
  medications?: string | null
  supplements?: string | null
  surgeries?: string | null
  allergies?: string | null
  intolerances?: string | null
  family_history?: string | null
  exercise_type?: string | null
  exercise_frequency?: string | null
  sleep_hours?: number | null
  stress_level?: number | null
  work_type?: string | null
  energy_level?: number | null
  digestion?: string | null
  mood?: string | null
  concentration?: string | null
  objectives?: string | null
  activity_level?: string | null
  current_exercise_routine?: string | null
  previous_injuries?: string | null
  dietary_restrictions?: string | null
  additional_notes?: string | null
}

interface ClientHistoryProps {
  client: Client
  healthProfile: HealthProfile | null
  appointments: Appointment[]
  currentCoachId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Programada", className: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "Completada", className: "bg-green-50 text-green-700 border-green-200" },
  cancelled: { label: "Cancelada", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  no_show: { label: "No asistió", className: "bg-red-50 text-red-700 border-red-200" },
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// ─── Health profile sections ──────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  age: "Edad",
  gender: "Género",
  occupation: "Ocupación",
  weight: "Peso (kg)",
  height: "Talla (cm)",
  waist_circumference: "Cintura (cm)",
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

const HEALTH_SECTIONS = [
  { title: "Datos básicos", fields: ["age", "gender", "occupation"] },
  { title: "Antropometría", fields: ["weight", "height", "waist_circumference", "body_fat_percent"] },
  { title: "Antecedentes médicos", fields: ["diseases", "medications", "supplements", "surgeries", "allergies", "intolerances", "family_history"] },
  { title: "Estilo de vida", fields: ["exercise_type", "exercise_frequency", "sleep_hours", "stress_level", "work_type"] },
  { title: "Evaluación funcional", fields: ["energy_level", "digestion", "mood", "concentration"] },
  { title: "Objetivos y notas", fields: ["objectives", "activity_level", "current_exercise_routine", "previous_injuries", "dietary_restrictions", "additional_notes"] },
]

function HealthProfilePanel({ profile }: { profile: HealthProfile }) {
  const profileAsRecord = profile as Record<string, unknown>

  return (
    <div className="space-y-5">
      {HEALTH_SECTIONS.map((section) => {
        const entries = section.fields
          .map((f) => ({ key: f, label: FIELD_LABELS[f] ?? f, value: profileAsRecord[f] }))
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

// ─── Main component ───────────────────────────────────────────────────────────

export function ClientHistory({ client, healthProfile, appointments, currentCoachId }: ClientHistoryProps) {
  const router = useRouter()

  const totalAppointments = appointments.length
  const completedAppointments = appointments.filter((a) => a.status === "completed").length

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        Volver
      </button>

      {/* Header del cliente */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {client.image ? (
              <img src={client.image} alt={client.name ?? ""} className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary text-xl font-semibold">
                {client.name?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-xl text-zinc-900">{client.name ?? "Sin nombre"}</h1>
            <p className="text-sm text-zinc-500">{client.email}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-zinc-900">{totalAppointments}</p>
            <p className="text-xs text-zinc-400">citas totales</p>
            <p className="text-sm text-green-600 font-medium mt-0.5">{completedAppointments} completadas</p>
          </div>
        </div>
      </div>

      {/* Perfil nutricional actual */}
      {healthProfile && (
        <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" />
            Perfil nutricional actual
          </h2>
          <HealthProfilePanel profile={healthProfile} />
        </div>
      )}

      {/* Historial de citas */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-zinc-400" />
          Historial de citas ({totalAppointments})
        </h2>

        {appointments.length === 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center text-sm text-zinc-400">
            Sin citas registradas
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt) => {
              const statusInfo = STATUS_LABELS[appt.status] ?? {
                label: appt.status,
                className: "bg-zinc-100 text-zinc-600 border-zinc-200",
              }
              const isOwn = appt.coach_id === currentCoachId

              return (
                <div
                  key={appt.id}
                  className={`bg-white rounded-xl border p-5 space-y-3 ${
                    isOwn ? "border-primary/30 ring-1 ring-primary/10" : "border-zinc-200"
                  }`}
                >
                  {/* Row: fecha + estado + coach */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-zinc-900 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-zinc-400" />
                        {formatDate(appt.appointment_date)}
                        <span className="text-zinc-400 font-normal flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {appt.appointment_time?.slice(0, 5)} ({appt.duration_minutes} min)
                        </span>
                      </p>
                      <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                        <User className="w-3 h-3" />
                        {isOwn ? (
                          <span className="text-primary font-medium">Tu consulta</span>
                        ) : (
                          <span>{appt.coach?.name ?? "Otro coach"}{appt.coach?.specialization ? ` · ${appt.coach.specialization}` : ""}</span>
                        )}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusInfo.className} shrink-0`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Motivo */}
                  {appt.consultation_reason && (
                    <div>
                      <p className="text-xs text-zinc-400 mb-0.5 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Motivo de consulta
                      </p>
                      <p className="text-sm text-zinc-700 bg-zinc-50 rounded-lg px-3 py-2">
                        {appt.consultation_reason}
                      </p>
                    </div>
                  )}

                  {/* Notas del coach */}
                  {appt.notes && (
                    <div>
                      <p className="text-xs text-zinc-400 mb-0.5">
                        Notas {isOwn ? "tuyas" : `de ${appt.coach?.name ?? "coach"}`}
                      </p>
                      <p className="text-sm text-zinc-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 whitespace-pre-wrap">
                        {appt.notes}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
