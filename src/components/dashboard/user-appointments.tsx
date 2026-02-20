"use client"

import { useState } from "react"
import { Calendar, Clock, User, XCircle, CheckCircle, AlertCircle } from "lucide-react"
import { cancelAppointment } from "@/app/dashboard/coaches/actions"
import { useRouter } from "next/navigation"
import { AddToCalendarButton } from "@/components/dashboard/add-to-calendar-button"
import { JoinMeetingButton } from "@/components/dashboard/join-meeting-button"

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  duration_minutes: number
  status: string
  notes: string | null
  meeting_link?: string | null
  coach: {
    id: string
    name: string | null
    image: string | null
    specialization: string | null
    bio: string | null
  }
}

interface UserAppointmentsProps {
  scheduled: Appointment[]
  completed: Appointment[]
  cancelled: Appointment[]
}

export function UserAppointments({ scheduled, completed, cancelled }: UserAppointmentsProps) {
  const router = useRouter()
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const handleCancel = async (appointmentId: string) => {
    if (!confirm("¿Estás seguro de que deseas cancelar esta cita?")) {
      return
    }

    setCancellingId(appointmentId)
    const result = await cancelAppointment(appointmentId)
    
    if (!result.error) {
      router.refresh()
    } else {
      alert(result.error)
    }
    
    setCancellingId(null)
  }

  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => {
    const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
    const isPast = appointmentDate < new Date()
    const canCancel = appointment.status === "scheduled" && !isPast
    const showAddToCalendar = appointment.status !== "cancelled"

    return (
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-zinc-200">
        <div className="flex items-start gap-4">
          {/* Avatar del coach */}
          <div className="flex-shrink-0">
            {appointment.coach.image ? (
              <img
                src={appointment.coach.image}
                alt={appointment.coach.name || "Coach"}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
            )}
          </div>

          {/* Información */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-heading text-lg sm:text-xl text-zinc-900 mb-1">
                  {appointment.coach.name || "Coach"}
                </h3>
                {appointment.coach.specialization && (
                  <p className="text-xs sm:text-sm text-zinc-600 mb-2">
                    {appointment.coach.specialization}
                  </p>
                )}
              </div>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  appointment.status === "scheduled"
                    ? "bg-blue-100 text-blue-700"
                    : appointment.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {appointment.status === "scheduled"
                  ? "Programada"
                  : appointment.status === "completed"
                  ? "Completada"
                  : "Cancelada"}
              </span>
            </div>

            <div className="space-y-2 text-sm text-zinc-600 mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" strokeWidth={1.5} />
                <span>
                  {appointmentDate.toLocaleDateString("es-ES", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" strokeWidth={1.5} />
                <span>
                  {appointmentDate.toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })} ({appointment.duration_minutes} min)
                </span>
              </div>
            </div>

            {appointment.notes && (
              <div className="mb-3 p-3 bg-zinc-50 rounded-lg">
                <p className="text-xs sm:text-sm text-zinc-600">
                  <strong>Notas:</strong> {appointment.notes}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {appointment.meeting_link && appointment.status === "scheduled" && (
                <JoinMeetingButton
                  meetingLink={appointment.meeting_link}
                  appointmentDate={appointment.appointment_date}
                  appointmentTime={appointment.appointment_time}
                  durationMinutes={appointment.duration_minutes}
                />
              )}
              {showAddToCalendar && <AddToCalendarButton appointment={appointment} />}
              {canCancel && (
                <button
                  onClick={() => handleCancel(appointment.id)}
                  disabled={cancellingId === appointment.id}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <XCircle className="w-4 h-4" strokeWidth={1.5} />
                  {cancellingId === appointment.id ? "Cancelando..." : "Cancelar Cita"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Citas Programadas */}
      {scheduled.length > 0 && (
        <div>
          <h2 className="text-xl sm:text-2xl uppercase font-heading text-zinc-900 mb-3 sm:mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
            Citas Programadas ({scheduled.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {scheduled.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        </div>
      )}

      {/* Citas Completadas */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-xl sm:text-2xl uppercase font-heading text-zinc-900 mb-3 sm:mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
            Citas Completadas ({completed.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {completed.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        </div>
      )}

      {/* Citas Canceladas */}
      {cancelled.length > 0 && (
        <div>
          <h2 className="text-xl sm:text-2xl uppercase font-heading text-zinc-900 mb-3 sm:mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
            Citas Canceladas ({cancelled.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {cancelled.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        </div>
      )}

      {/* Sin citas */}
      {scheduled.length === 0 && completed.length === 0 && cancelled.length === 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-12 shadow-sm border border-zinc-200 text-center">
          <AlertCircle className="w-12 h-12 text-zinc-400 mx-auto mb-4" strokeWidth={1} />
          <p className="text-zinc-600 mb-2">No tienes citas agendadas</p>
          <p className="text-sm text-zinc-500">
            <a href="/dashboard/coaches" className="text-primary hover:text-primary/80 font-medium cursor-pointer">
              Explora nuestros coaches
            </a>{" "}
            y agenda tu primera cita
          </p>
        </div>
      )}
    </div>
  )
}
