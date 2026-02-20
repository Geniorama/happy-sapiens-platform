"use client"

import { useState, useRef, useEffect } from "react"
import { CalendarPlus, ChevronDown } from "lucide-react"
import {
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  downloadICS,
  type CalendarEvent,
} from "@/lib/calendar-utils"
import { GoogleCalendarIcon, OutlookIcon, AppleIcon } from "@/components/icons/calendar-providers"

export interface AddToCalendarAppointment {
  appointment_date: string
  appointment_time: string
  duration_minutes?: number
  notes?: string | null
  coach: {
    name: string | null
    specialization: string | null
  }
}

interface AddToCalendarButtonProps {
  appointment: AddToCalendarAppointment
  size?: "sm" | "md"
  onClickWrapper?: (e: React.MouseEvent) => void
}

export function AddToCalendarButton({
  appointment,
  size = "md",
  onClickWrapper,
}: AddToCalendarButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const startDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
  const duration = appointment.duration_minutes ?? 60
  const endDate = new Date(startDate.getTime() + duration * 60 * 1000)

  const event: CalendarEvent = {
    title: `Sesión con ${appointment.coach.name || "Coach"} - Happy Sapiens`,
    startDate,
    endDate,
    description: appointment.coach.specialization
      ? `Coach: ${appointment.coach.name}\nEspecialización: ${appointment.coach.specialization}${appointment.notes ? `\n\nNotas: ${appointment.notes}` : ""}`
      : appointment.notes || undefined,
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDropdown(!showDropdown)
    onClickWrapper?.(e)
  }

  const buttonSize = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center gap-2 font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer ${buttonSize}`}
      >
        <CalendarPlus className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={1.5} />
        Añadir a mi calendario
        <ChevronDown
          className={`w-4 h-4 transition-transform ${showDropdown ? "rotate-180" : ""}`}
          strokeWidth={1.5}
        />
      </button>
      {showDropdown && (
        <div
          className="absolute top-full left-0 mt-1 z-20 w-56 bg-white rounded-lg shadow-lg border border-zinc-200 py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <a
            href={getGoogleCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
            onClick={() => setShowDropdown(false)}
          >
            <GoogleCalendarIcon />
            Google Calendar
          </a>
          <a
            href={getOutlookCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
            onClick={() => setShowDropdown(false)}
          >
            <OutlookIcon />
            Outlook / Hotmail
          </a>
          <button
            type="button"
            onClick={() => {
              const dateStr = startDate.toISOString().slice(0, 10)
              downloadICS(event, `cita-coach-${dateStr}.ics`)
              setShowDropdown(false)
            }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors text-left cursor-pointer"
          >
            <AppleIcon className="w-5 h-5 text-zinc-900" />
            Apple Calendar / Descargar
          </button>
        </div>
      )}
    </div>
  )
}
