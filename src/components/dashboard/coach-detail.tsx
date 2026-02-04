"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Clock, MapPin, User, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { createAppointment } from "@/app/dashboard/coaches/actions"
import { HealthProfileForm } from "./health-profile-form"

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
  diseases: string | null
  medications: string | null
  allergies: string | null
  objectives: string | null
  activity_level: string | null
  current_exercise_routine: string | null
  previous_injuries: string | null
  dietary_restrictions: string | null
  additional_notes: string | null
}

interface CoachDetailProps {
  coach: Coach
  availability: Availability[]
  existingAppointments: ExistingAppointment[]
  userId: string
  healthProfile: HealthProfile | null
}

const DAYS_OF_WEEK = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0")
  return [`${hour}:00`, `${hour}:30`]
}).flat()

export function CoachDetail({ coach, availability, existingAppointments, userId, healthProfile }: CoachDetailProps) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showHealthForm, setShowHealthForm] = useState(!healthProfile)

  // Generar próximos 30 días disponibles
  const availableDates = useMemo(() => {
    const dates: string[] = []
    const today = new Date()
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const dayOfWeek = date.getDay()
      
      // Verificar si el coach tiene disponibilidad ese día
      const hasAvailability = availability.some(av => av.day_of_week === dayOfWeek)
      
      if (hasAvailability) {
        dates.push(date.toISOString().split("T")[0])
      }
    }
    
    return dates
  }, [availability])

  // Obtener horarios disponibles para la fecha seleccionada
  const availableTimes = useMemo(() => {
    if (!selectedDate) return []

    const selectedDay = new Date(selectedDate).getDay()
    const dayAvailability = availability.filter(av => av.day_of_week === selectedDay)

    if (dayAvailability.length === 0) return []

    // Obtener todas las citas existentes para esa fecha
    const bookedTimes = existingAppointments
      .filter(apt => apt.appointment_date === selectedDate)
      .map(apt => apt.appointment_time)

    const times: string[] = []
    
    dayAvailability.forEach(av => {
      const start = av.start_time.split(":").map(Number)
      const end = av.end_time.split(":").map(Number)
      const startMinutes = start[0] * 60 + start[1]
      const endMinutes = end[0] * 60 + end[1]

      TIME_SLOTS.forEach(slot => {
        const [hour, minute] = slot.split(":").map(Number)
        const slotMinutes = hour * 60 + minute

        if (slotMinutes >= startMinutes && slotMinutes + 60 <= endMinutes) {
          const timeStr = slot
          if (!bookedTimes.includes(timeStr)) {
            times.push(timeStr)
          }
        }
      })
    })

    return times.sort()
  }, [selectedDate, availability, existingAppointments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedDate || !selectedTime) {
      setMessage({ type: "error", text: "Por favor selecciona una fecha y hora" })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    const result = await createAppointment({
      coachId: coach.id,
      appointmentDate: selectedDate,
      appointmentTime: selectedTime,
      notes: notes || null,
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
      setTimeout(() => {
        router.push("/dashboard/coaches/appointments")
        router.refresh()
      }, 2000)
    }

    setIsSubmitting(false)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Botón volver */}
      <Link
        href="/dashboard/coaches"
        className="inline-flex items-center gap-2 text-sm sm:text-base text-zinc-600 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        Volver a coaches
      </Link>

      {/* Información del coach */}
      <div className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm border border-zinc-200">
        <div className="md:flex">
          {/* Imagen */}
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

          {/* Información */}
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
              <p className="text-sm sm:text-base text-zinc-600 mb-4 leading-relaxed">
                {coach.bio}
              </p>
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

      {/* Formulario de perfil de salud (si no está completo) */}
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

      {/* Formulario de agendamiento */}
      {!showHealthForm && (
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
        <h2 className="text-xl sm:text-2xl font-heading text-zinc-900 mb-4 sm:mb-6">
          Agendar Cita
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Mensaje */}
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

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" strokeWidth={1.5} />
              Selecciona una fecha
            </label>
            <select
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setSelectedTime("")
              }}
              className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="">Selecciona una fecha</option>
              {availableDates.map((date) => {
                const dateObj = new Date(date)
                return (
                  <option key={date} value={date}>
                    {dateObj.toLocaleDateString("es-ES", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Hora */}
          {selectedDate && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2" strokeWidth={1.5} />
                Selecciona una hora
              </label>
              {availableTimes.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {availableTimes.map((time) => {
                    const [hour, minute] = time.split(":")
                    const timeObj = new Date(`2000-01-01T${time}`)
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedTime === time
                            ? "bg-primary text-white"
                            : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100 border border-zinc-200"
                        }`}
                      >
                        {timeObj.toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  No hay horarios disponibles para esta fecha
                </p>
              )}
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="Agrega alguna nota o información adicional para el coach..."
            />
          </div>

          {/* Botón enviar */}
          <button
            type="submit"
            disabled={isSubmitting || !selectedDate || !selectedTime}
            className="w-full sm:w-auto px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Agendando..." : "Confirmar Cita"}
          </button>
        </form>
      </div>
      )}
    </div>
  )
}
