"use client"

import { useState } from "react"
import Link from "next/link"
import { CalendarDays, Clock, ChevronRight, Search, List, Calendar } from "lucide-react"
import { AppointmentsCalendar } from "@/components/coach/appointments-calendar"

type Status = "all" | "scheduled" | "completed" | "cancelled" | "no_show"
type ViewMode = "list" | "calendar"

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Programada", className: "bg-blue-50 text-blue-700" },
  completed: { label: "Completada", className: "bg-green-50 text-green-700" },
  cancelled: { label: "Cancelada",  className: "bg-zinc-100 text-zinc-600" },
  no_show:   { label: "No asistió", className: "bg-red-50 text-red-700"   },
}

const TABS: { key: Status; label: string }[] = [
  { key: "all",       label: "Todas"       },
  { key: "scheduled", label: "Programadas" },
  { key: "completed", label: "Completadas" },
  { key: "cancelled", label: "Canceladas"  },
  { key: "no_show",   label: "No asistió"  },
]

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  consultation_reason: string
  meeting_link?: string | null
  user?: { id: string; name?: string; email?: string; image?: string } | null
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T12:00:00")
  return date.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function AppointmentsManager({ appointments }: { appointments: Appointment[] }) {
  const [view, setView] = useState<ViewMode>("list")
  const [activeTab, setActiveTab] = useState<Status>("all")
  const [search, setSearch] = useState("")

  const filtered = appointments.filter((apt) => {
    const matchesTab = activeTab === "all" || apt.status === activeTab
    const query = search.toLowerCase()
    const matchesSearch =
      !query ||
      apt.user?.name?.toLowerCase().includes(query) ||
      apt.user?.email?.toLowerCase().includes(query) ||
      apt.consultation_reason?.toLowerCase().includes(query)
    return matchesTab && matchesSearch
  })

  return (
    <div className="space-y-4">
      {/* Toolbar: search + view toggle */}
      <div className="flex items-center gap-3">
        {/* Search (only in list view) */}
        {view === "list" && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por cliente o motivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
        )}

        {/* View toggle */}
        <div className="flex items-center bg-white border border-zinc-200 rounded-lg p-0.5 shrink-0 ml-auto">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              view === "list"
                ? "bg-primary text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
            aria-label="Vista lista"
          >
            <List className="w-3.5 h-3.5" />
            Lista
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              view === "calendar"
                ? "bg-primary text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
            aria-label="Vista calendario"
          >
            <Calendar className="w-3.5 h-3.5" />
            Calendario
          </button>
        </div>
      </div>

      {/* Calendar view */}
      {view === "calendar" && (
        <AppointmentsCalendar appointments={appointments} />
      )}

      {/* List view */}
      {view === "list" && (
        <>
          {/* Status tabs */}
          <div className="flex gap-1 flex-wrap">
            {TABS.map((tab) => {
              const count =
                tab.key === "all"
                  ? appointments.length
                  : appointments.filter((a) => a.status === tab.key).length
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === tab.key
                      ? "bg-primary text-white"
                      : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={`ml-1.5 ${activeTab === tab.key ? "opacity-80" : "text-zinc-400"}`}>
                      ({count})
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* List */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-14 text-center text-zinc-400 text-sm">
                No hay citas que coincidan con los filtros
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {filtered.map((apt) => {
                  const statusInfo = STATUS_LABELS[apt.status] ?? {
                    label: apt.status,
                    className: "bg-zinc-100 text-zinc-600",
                  }
                  return (
                    <li key={apt.id}>
                      <Link
                        href={`/coach/appointments/${apt.id}`}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 transition-colors"
                      >
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {apt.user?.image ? (
                            <img
                              src={apt.user.image}
                              alt={apt.user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-primary font-semibold text-sm">
                              {apt.user?.name?.charAt(0)?.toUpperCase() || "?"}
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 truncate">
                            {apt.user?.name || "Cliente sin nombre"}
                          </p>
                          <p className="text-xs text-zinc-500 truncate mt-0.5">
                            {apt.consultation_reason}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-xs text-zinc-400">
                              <CalendarDays className="w-3 h-3" />
                              {formatDate(apt.appointment_date)}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-zinc-400">
                              <Clock className="w-3 h-3" />
                              {apt.appointment_time?.slice(0, 5)}
                            </span>
                          </div>
                        </div>

                        {/* Status + arrow */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                          <ChevronRight className="w-4 h-4 text-zinc-300" />
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
