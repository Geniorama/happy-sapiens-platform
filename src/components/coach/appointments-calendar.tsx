"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Clock } from "lucide-react"

const STATUS_DOT: Record<string, string> = {
  scheduled: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-zinc-400",
  no_show:   "bg-red-400",
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Programada", className: "bg-blue-50 text-blue-700" },
  completed: { label: "Completada", className: "bg-green-50 text-green-700" },
  cancelled: { label: "Cancelada",  className: "bg-zinc-100 text-zinc-600" },
  no_show:   { label: "No asistió", className: "bg-red-50 text-red-700"   },
}

interface Appointment {
  id: string
  appointment_date: string   // "YYYY-MM-DD"
  appointment_time: string   // "HH:MM:SS"
  status: string
  consultation_reason: string
  user?: { id: string; name?: string; email?: string; image?: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function buildCalendarGrid(year: number, month: number): (Date | null)[] {
  // month is 0-based
  const firstDay = new Date(year, month, 1)
  // Week starts on Monday: 0=Mon…6=Sun
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = Array(startOffset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const MONTH_NAMES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
]
const DAY_NAMES = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"]

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentsCalendar({ appointments }: { appointments: Appointment[] }) {
  const today = new Date()
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedKey, setSelectedKey] = useState<string | null>(toKey(today))

  // Group appointments by date key
  const byDate = appointments.reduce<Record<string, Appointment[]>>((acc, apt) => {
    const key = apt.appointment_date
    if (!acc[key]) acc[key] = []
    acc[key].push(apt)
    return acc
  }, {})

  const cells = buildCalendarGrid(current.year, current.month)

  function prevMonth() {
    setCurrent((c) => {
      if (c.month === 0) return { year: c.year - 1, month: 11 }
      return { year: c.year, month: c.month - 1 }
    })
    setSelectedKey(null)
  }

  function nextMonth() {
    setCurrent((c) => {
      if (c.month === 11) return { year: c.year + 1, month: 0 }
      return { year: c.year, month: c.month + 1 }
    })
    setSelectedKey(null)
  }

  const selectedApts = selectedKey ? (byDate[selectedKey] ?? []) : []

  return (
    <div className="space-y-4">
      {/* Calendar card */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4 text-zinc-600" />
          </button>
          <h2 className="font-heading text-base text-zinc-900">
            {MONTH_NAMES[current.month]} {current.year}
          </h2>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-zinc-100">
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
              return <div key={`empty-${idx}`} className="h-16 border-b border-r border-zinc-100 last:border-r-0" />
            }

            const key = toKey(date)
            const apts = byDate[key] ?? []
            const isToday = key === toKey(today)
            const isSelected = key === selectedKey
            const isCurrentMonth = date.getMonth() === current.month

            return (
              <button
                key={key}
                onClick={() => setSelectedKey(isSelected ? null : key)}
                className={`h-16 flex flex-col items-start p-1.5 border-b border-r border-zinc-100 last:border-r-0 transition-colors cursor-pointer text-left
                  ${isSelected ? "bg-primary/5" : "hover:bg-zinc-50"}
                  ${!isCurrentMonth ? "opacity-30" : ""}
                `}
              >
                {/* Day number */}
                <span
                  className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full
                    ${isToday ? "bg-primary text-white" : "text-zinc-700"}
                    ${isSelected && !isToday ? "ring-2 ring-primary/40" : ""}
                  `}
                >
                  {date.getDate()}
                </span>

                {/* Status dots */}
                {apts.length > 0 && (
                  <div className="mt-auto flex flex-wrap gap-0.5 px-0.5">
                    {apts.slice(0, 4).map((apt, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[apt.status] ?? "bg-zinc-400"}`}
                      />
                    ))}
                    {apts.length > 4 && (
                      <span className="text-[9px] text-zinc-400 leading-none">+{apts.length - 4}</span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-6 py-3 border-t border-zinc-100">
          {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${STATUS_DOT[key]}`} />
              <span className="text-xs text-zinc-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected day appointments */}
      {selectedKey && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-800">
              {selectedApts.length > 0
                ? `${selectedApts.length} cita${selectedApts.length > 1 ? "s" : ""} — ${formatSelectedDate(selectedKey)}`
                : `Sin citas — ${formatSelectedDate(selectedKey)}`}
            </h3>
          </div>

          {selectedApts.length === 0 ? (
            <p className="px-5 py-8 text-sm text-zinc-400 text-center">
              No hay citas agendadas para este día
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {[...selectedApts]
                .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
                .map((apt) => {
                  const statusInfo = STATUS_LABELS[apt.status] ?? { label: apt.status, className: "bg-zinc-100 text-zinc-600" }
                  return (
                    <li key={apt.id}>
                      <Link
                        href={`/coach/appointments/${apt.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 transition-colors"
                      >
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {apt.user?.image ? (
                            <img src={apt.user.image} alt={apt.user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-primary font-semibold text-sm">
                              {apt.user?.name?.charAt(0)?.toUpperCase() || "?"}
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 truncate">
                            {apt.user?.name || "Cliente"}
                          </p>
                          <p className="text-xs text-zinc-500 truncate">{apt.consultation_reason}</p>
                        </div>

                        {/* Time + status */}
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <Clock className="w-3 h-3" />
                            {apt.appointment_time?.slice(0, 5)}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </Link>
                    </li>
                  )
                })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function formatSelectedDate(key: string) {
  const date = new Date(key + "T12:00:00")
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}
