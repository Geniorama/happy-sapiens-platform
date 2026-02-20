"use client"

import { useState } from "react"
import { Calendar, Clock, MapPin, User, CheckCircle } from "lucide-react"
import Link from "next/link"
import { AddToCalendarButton } from "@/components/dashboard/add-to-calendar-button"
import { JoinMeetingButton } from "@/components/dashboard/join-meeting-button"

interface Coach {
  id: string
  name: string | null
  email: string | null
  bio: string | null
  specialization: string | null
  image: string | null
  phone: string | null
}

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  duration_minutes?: number
  notes?: string | null
  consultation_reason?: string | null
  meeting_link?: string | null
  coach: {
    id: string
    name: string | null
    image: string | null
    specialization: string | null
  }
}

interface CoachesListProps {
  coaches: Coach[]
  userAppointments: Appointment[]
  userId: string
}

export function CoachesList({ coaches, userAppointments, userId }: CoachesListProps) {
  const [selectedSpecialization, setSelectedSpecialization] = useState<string | null>(null)

  // Obtener especializaciones únicas
  const specializations = Array.from(
    new Set(coaches.map(c => c.specialization).filter(Boolean))
  ) as string[]

  // Filtrar coaches por especialización
  const filteredCoaches = selectedSpecialization
    ? coaches.filter(c => c.specialization === selectedSpecialization)
    : coaches

  // Obtener próximas citas (máximo 3)
  const upcomingAppointments = userAppointments
    .filter(apt => {
      const aptDate = new Date(`${apt.appointment_date}T${apt.appointment_time}`)
      return aptDate >= new Date() && apt.status === 'scheduled'
    })
    .slice(0, 3)

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Próximas citas */}
      {upcomingAppointments.length > 0 && (
        <div>
          <h2 className="text-xl sm:text-2xl uppercase font-heading text-zinc-900 mb-3 sm:mb-4">
            Mis Próximas Citas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-zinc-200 hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="flex items-start gap-3 mb-3">
                  {appointment.coach.image ? (
                    <img
                      src={appointment.coach.image}
                      alt={appointment.coach.name || "Coach"}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading text-base sm:text-lg text-zinc-900 truncate">
                      {appointment.coach.name || "Coach"}
                    </h3>
                    {appointment.coach.specialization && (
                      <p className="text-xs sm:text-sm text-zinc-600">
                        {appointment.coach.specialization}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2 text-xs sm:text-sm text-zinc-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" strokeWidth={1.5} />
                    <span>
                      {new Date(appointment.appointment_date).toLocaleDateString("es-ES", {
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
                      {new Date(`2000-01-01T${appointment.appointment_time}`).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {appointment.consultation_reason && (
                    <p className="text-xs text-zinc-500 line-clamp-2 mt-1">
                      {appointment.consultation_reason}
                    </p>
                  )}
                </div>
                <div className="mt-auto space-y-2">
                  {appointment.meeting_link && (
                    <JoinMeetingButton
                      meetingLink={appointment.meeting_link}
                      appointmentDate={appointment.appointment_date}
                      appointmentTime={appointment.appointment_time}
                      durationMinutes={appointment.duration_minutes ?? 60}
                      size="sm"
                    />
                  )}
                  <AddToCalendarButton appointment={appointment} size="sm" />
                  <Link
                    href="/dashboard/coaches/appointments"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80"
                  >
                    <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Ver mis citas
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Link
              href="/dashboard/coaches/appointments"
              className="inline-flex items-center gap-2 text-sm sm:text-base text-primary hover:text-primary/80 font-medium"
            >
              Ver todas mis citas
              <CheckCircle className="w-4 h-4" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      )}

      {/* Filtro de especialización */}
      {specializations.length > 0 && (
        <div>
          <h2 className="text-xl sm:text-2xl uppercase font-heading text-zinc-900 mb-3 sm:mb-4">
            Coaches Disponibles
          </h2>
          <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
            <button
              onClick={() => setSelectedSpecialization(null)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                selectedSpecialization === null
                  ? "bg-primary text-white"
                  : "bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              Todos
            </button>
            {specializations.map((spec) => (
              <button
                key={spec}
                onClick={() => setSelectedSpecialization(spec)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                  selectedSpecialization === spec
                    ? "bg-primary text-white"
                    : "bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de coaches */}
      {filteredCoaches.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {filteredCoaches.map((coach) => (
            <Link
              key={coach.id}
              href={`/dashboard/coaches/${coach.id}`}
              className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm border border-zinc-200 hover:shadow-md transition-shadow flex flex-col"
            >
              {/* Imagen del coach */}
              <div className="relative w-full h-48 bg-zinc-100">
                {coach.image ? (
                  <img
                    src={coach.image}
                    alt={coach.name || "Coach"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/20">
                    <User className="w-16 h-16 text-primary/40" strokeWidth={1} />
                  </div>
                )}
                {coach.specialization && (
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur-sm text-zinc-700">
                      {coach.specialization}
                    </span>
                  </div>
                )}
              </div>

              {/* Información del coach */}
              <div className="p-4 sm:p-6 flex flex-col flex-grow">
                <h3 className="font-heading text-lg sm:text-xl text-zinc-900 mb-2">
                  {coach.name || "Coach"}
                </h3>
                {coach.bio && (
                  <p className="text-sm text-zinc-600 mb-4 line-clamp-3 flex-grow">
                    {coach.bio}
                  </p>
                )}
                <div className="mt-auto pt-4 border-t border-zinc-200">
                  <span className="text-sm font-medium text-primary">
                    Ver perfil y agendar →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-12 shadow-sm border border-zinc-200 text-center">
          <p className="text-zinc-600">
            No hay coaches disponibles en este momento.
          </p>
        </div>
      )}
    </div>
  )
}
