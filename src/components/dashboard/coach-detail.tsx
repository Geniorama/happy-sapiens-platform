"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Clock, MapPin, User, ArrowLeft, ChevronLeft, ChevronRight, CalendarX } from "lucide-react"
import Link from "next/link"
import { createAppointment } from "@/app/dashboard/coaches/actions"
import { HealthProfileForm } from "./health-profile-form"
import { PointsBanner } from "@/components/dashboard/points-banner"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Coach {
  id: string
  name: string | null
  email: string | null
  bio: string | null
  specialization: string | null
  image: string | null
  phone: string | null
}

interface Availability {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration?: number
}

interface ExistingAppointment {
  appointment_date: string
  appointment_time: string
}

interface HealthProfile {
  weight: number | null
  height: number | null
  age: number | null
  gender: string | null
  occupation: string | null
  diseases: string | null
  medications: string | null
  supplements: string | null
  surgeries: string | null
  allergies: string | null
  intolerances: string | null
  family_history: string | null
  waist_circumference: number | null
  body_fat_percent: number | null
  exercise_type: string | null
  exercise_frequency: string | null
  sleep_hours: number | null
  stress_level: number | null
  work_type: string | null
  energy_level: number | null
  digestion: string | null
  mood: string | null
  concentration: string | null
  objectives: string | null
  activity_level: string | null
  current_exercise_routine: string | null
  previous_injuries: string | null
  dietary_restrictions: string | null
  additional_notes: string | null
}

interface ExternalBlocked {
  date: string   // "YYYY-MM-DD"
  start: string  // "HH:MM"
  end: string    // "HH:MM"
}

interface CoachDetailProps {
  coach: Coach
  availability: Availability[]
  existingAppointments: ExistingAppointment[]
  externalBlocked?: ExternalBlocked[]
  userId: string
  healthProfile: HealthProfile | null
}

// ─── Date helpers (timezone-safe) ─────────────────────────────────────────────

/** "YYYY-MM-DD" usando la hora local (evita el bug UTC-X) */
function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** getDay() a partir de un string "YYYY-MM-DD" sin bug de timezone */
function dayOfWeekFromStr(dateStr: string): number {
  return new Date(dateStr + "T12:00:00").getDay()
}

// ─── Calendar constants ───────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
]
const DAY_NAMES = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"]

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, "0")
  return [`${h}:00`, `${h}:30`]
}).flat()

// ─── Mini calendar ────────────────────────────────────────────────────────────

function buildGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7 // 0=Mon … 6=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = Array(startOffset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

interface MiniCalendarProps {
  availability: Availability[]
  existingAppointments: ExistingAppointment[]
  selectedDate: string
  onSelect: (dateStr: string) => void
}

function MiniCalendar({ availability, existingAppointments, selectedDate, onSelect }: MiniCalendarProps) {
  const today = new Date()
  const todayStr = toLocalDateStr(today)
  const [cur, setCur] = useState({ year: today.getFullYear(), month: today.getMonth() })

  const availableDays = new Set(availability.map((av) => av.day_of_week))

  function prevMonth() {
    setCur((c) => c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 })
  }
  function nextMonth() {
    setCur((c) => c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 })
  }

  const cells = buildGrid(cur.year, cur.month)

  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-zinc-600" />
        </button>
        <span className="text-sm font-semibold text-zinc-800">
          {MONTH_NAMES[cur.month]} {cur.year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4 text-zinc-600" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 bg-zinc-50 border-b border-zinc-100">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-zinc-400">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {cells.map((date, idx) => {
          if (!date) {
            return (
              <div
                key={`e-${idx}`}
                className="h-10 border-b border-r border-zinc-100 last:border-r-0"
              />
            )
          }

          const dateStr = toLocalDateStr(date)
          const dow = date.getDay() // local day of week
          const isPast = dateStr < todayStr
          const isAvailable = availableDays.has(dow)
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === todayStr
          const isCurrentMonth = date.getMonth() === cur.month

          const disabled = isPast || !isAvailable || !isCurrentMonth

          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(dateStr)}
              className={`
                h-11 flex flex-col items-center justify-center gap-0.5 text-sm transition-colors
                border-b border-r border-zinc-100 last:border-r-0
                ${disabled ? "text-zinc-300 cursor-not-allowed bg-white" : "cursor-pointer"}
                ${!disabled && !isSelected ? "bg-green-50 hover:bg-primary hover:text-white text-green-800 font-medium" : ""}
                ${isSelected ? "bg-primary text-white font-semibold" : ""}
                ${isToday && !isSelected && !disabled ? "ring-2 ring-inset ring-primary/40" : ""}
                ${!isCurrentMonth ? "opacity-0 pointer-events-none" : ""}
              `}
            >
              <span>{date.getDate()}</span>
              {!disabled && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-green-500" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-zinc-100 bg-zinc-50">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-50 border border-green-300" />
          <span className="text-xs text-zinc-500">Disponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-zinc-100 border border-zinc-200" />
          <span className="text-xs text-zinc-500">No disponible</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CoachDetail({
  coach,
  availability,
  existingAppointments,
  externalBlocked = [],
  userId,
  healthProfile,
}: CoachDetailProps) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [selectedDuration, setSelectedDuration] = useState<number>(60)
  const [consultationReason, setConsultationReason] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [pointsEarned, setPointsEarned] = useState<number | undefined>()
  const [showHealthForm, setShowHealthForm] = useState(!healthProfile)

  // Horarios disponibles para la fecha seleccionada
  const availableTimes = useMemo(() => {
    if (!selectedDate) return []

    const dow = dayOfWeekFromStr(selectedDate)
    const daySlots = availability.filter((av) => av.day_of_week === dow)
    if (daySlots.length === 0) return []

    const bookedTimes = new Set(
      existingAppointments
        .filter((apt) => apt.appointment_date === selectedDate)
        .map((apt) => apt.appointment_time.slice(0, 5))
    )

    // Eventos externos (Google Calendar) para este día en minutos
    const externalBlocksToday = externalBlocked
      .filter((b) => b.date === selectedDate)
      .map((b) => {
        const [bsh, bsm] = b.start.split(":").map(Number)
        const [beh, bem] = b.end.split(":").map(Number)
        return { start: bsh * 60 + bsm, end: beh * 60 + bem }
      })

    function isBlockedExternally(slotStart: number, slotEnd: number) {
      return externalBlocksToday.some((b) => slotStart < b.end && slotEnd > b.start)
    }

    const slots: { time: string; duration: number }[] = []

    daySlots.forEach((av) => {
      const duration = av.slot_duration ?? 60
      const [sh, sm] = av.start_time.split(":").map(Number)
      const [eh, em] = av.end_time.split(":").map(Number)
      const startMin = sh * 60 + sm
      const endMin = eh * 60 + em

      for (let min = startMin; min + duration <= endMin; min += duration) {
        const h = String(Math.floor(min / 60)).padStart(2, "0")
        const m = String(min % 60).padStart(2, "0")
        const time = `${h}:${m}`
        if (!bookedTimes.has(time) && !isBlockedExternally(min, min + duration)) {
          slots.push({ time, duration })
        }
      }
    })

    return slots.sort((a, b) => a.time.localeCompare(b.time))
  }, [selectedDate, availability, existingAppointments, externalBlocked])

  function handleDateSelect(dateStr: string) {
    setSelectedDate(dateStr)
    setSelectedTime("")
    setSelectedDuration(60)
    setMessage(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDate || !selectedTime) {
      setMessage({ type: "error", text: "Por favor selecciona una fecha y hora" })
      return
    }
    if (!consultationReason.trim()) {
      setMessage({ type: "error", text: "Por favor indica el motivo de consulta" })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    const result = await createAppointment({
      coachId: coach.id,
      appointmentDate: selectedDate,
      appointmentTime: selectedTime,
      durationMinutes: selectedDuration,
      consultation_reason: consultationReason.trim(),
      notes: notes || null,
      consultation_snapshot: healthProfile ? (healthProfile as unknown as Record<string, unknown>) : null,
    })

    if (result.error) {
      if (result.error === "COMPLETE_PROFILE") {
        setShowHealthForm(true)
        setMessage({ type: "error", text: "Debes completar tu perfil de salud antes de agendar una cita" })
      } else {
        setMessage({ type: "error", text: result.error })
      }
    } else {
      setMessage({ type: "success", text: "¡Cita agendada exitosamente!" })
      if (result.pointsEarned) setPointsEarned(result.pointsEarned)
      setTimeout(() => {
        router.push("/dashboard/coaches/appointments")
        router.refresh()
      }, 2500)
    }

    setIsSubmitting(false)
  }

  const selectedDateFormatted = selectedDate
    ? new Date(selectedDate + "T12:00:00").toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Volver */}
      <Link
        href="/dashboard/coaches"
        className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        Volver a coaches
      </Link>

      {/* Info del coach */}
      <div className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm border border-zinc-200">
        <div className="md:flex">
          <div className="w-full md:w-64 h-64 md:h-auto bg-zinc-100 flex-shrink-0">
            {coach.image ? (
              <img
                src={coach.image}
                alt={coach.name || "Coach"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/20">
                <User className="w-24 h-24 text-primary/40" strokeWidth={1} />
              </div>
            )}
          </div>
          <div className="p-4 sm:p-6 lg:p-8 flex-1">
            {coach.specialization && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-primary/10 text-primary mb-3">
                {coach.specialization}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading text-zinc-900 mb-3">
              {coach.name || "Coach"}
            </h1>
            {coach.bio && (
              <p className="text-sm sm:text-base text-zinc-600 mb-4 leading-relaxed">{coach.bio}</p>
            )}
            {coach.phone && (
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <MapPin className="w-4 h-4" strokeWidth={1.5} />
                <span>{coach.phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Health profile form */}
      {showHealthForm && (
        <div className="mb-4 sm:mb-6">
          <HealthProfileForm
            userId={userId}
            existingProfile={healthProfile || undefined}
            onComplete={() => {
              setShowHealthForm(false)
              router.refresh()
            }}
          />
        </div>
      )}

      {/* Booking form */}
      {!showHealthForm && (
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
          <h2 className="text-xl sm:text-2xl font-heading text-zinc-900 mb-6">Agendar Cita</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Feedback */}
            {message && (
              <div
                className={`p-3 sm:p-4 rounded-lg border ${
                  message.type === "success"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                {message.text}
              </div>
            )}
            {pointsEarned && <PointsBanner points={pointsEarned} />}

            {/* Calendar picker */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-3">
                Selecciona una fecha
              </label>

              {availability.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                  Este coach aún no tiene horarios de disponibilidad configurados.
                </div>
              ) : (
                <MiniCalendar
                  availability={availability}
                  existingAppointments={existingAppointments}
                  selectedDate={selectedDate}
                  onSelect={handleDateSelect}
                />
              )}
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-3">
                  <Clock className="w-4 h-4 inline mr-1.5" strokeWidth={1.5} />
                  Horarios disponibles —{" "}
                  <span className="text-primary capitalize">{selectedDateFormatted}</span>
                </label>

                {availableTimes.length === 0 ? (
                  <p className="text-sm text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3">
                    No hay horarios disponibles para este día
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {availableTimes.map(({ time, duration }) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => { setSelectedTime(time); setSelectedDuration(duration) }}
                        className={`flex flex-col items-center py-2 px-1 rounded-lg text-sm font-medium transition-colors cursor-pointer border ${
                          selectedTime === time
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-zinc-700 border-zinc-200 hover:border-primary hover:text-primary"
                        }`}
                      >
                        <span>{time}</span>
                        <span className={`text-[10px] mt-0.5 ${selectedTime === time ? "text-white/80" : "text-zinc-400"}`}>
                          {duration} min
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Motivo de consulta <span className="text-red-500">*</span>
              </label>
              <textarea
                value={consultationReason}
                onChange={(e) => setConsultationReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
                placeholder="¿Por qué deseas esta consulta? (obligatorio)"
                required
              />
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
                placeholder="Información adicional para el coach..."
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !selectedDate || !selectedTime || !consultationReason.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? "Agendando..." : "Confirmar Cita"}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
