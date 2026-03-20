"use client"

import { useState, useTransition } from "react"
import { UserCheck, UserMinus, UserPlus, ToggleLeft, ToggleRight, X, Trash2 } from "lucide-react"
import {
  promoteToCoach, removeCoachRole, toggleCoachActive,
  bulkToggleCoachesActive, bulkRemoveCoachRole,
} from "@/app/admin/coaches/actions"

interface Coach {
  id: string
  name: string | null
  email: string
  image: string | null
  specialization: string | null
  bio: string | null
  is_coach_active: boolean
  created_at: string
  appointments_count: number
}

export function CoachesManager({ coaches: initial }: { coaches: Coach[] }) {
  const [coaches, setCoaches] = useState(initial)
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Bulk
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState<"remove" | null>(null)

  const allSelected = selected.size > 0 && selected.size === coaches.length
  const toggleSelectAll = () => {
    if (allSelected) { setSelected(new Set()) } else { setSelected(new Set(coaches.map((c) => c.id))) }
    setBulkConfirm(null)
  }
  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    setBulkConfirm(null)
  }
  const clearSelection = () => { setSelected(new Set()); setBulkConfirm(null) }

  const handleBulkActivate = (isActive: boolean) => {
    setError(null)
    const ids = [...selected]
    startTransition(async () => {
      const result = await bulkToggleCoachesActive(ids, isActive)
      if (result.error) { setError(result.error) } else {
        setCoaches((prev) => prev.map((c) => selected.has(c.id) ? { ...c, is_coach_active: isActive } : c))
        clearSelection()
      }
    })
  }

  const handleBulkRemove = () => {
    if (bulkConfirm !== "remove") { setBulkConfirm("remove"); return }
    setError(null)
    const ids = [...selected]
    startTransition(async () => {
      const result = await bulkRemoveCoachRole(ids)
      if (result.error) { setError(result.error) } else {
        setCoaches((prev) => prev.filter((c) => !selected.has(c.id)))
        clearSelection()
      }
    })
  }

  const handlePromote = () => {
    setError(null)
    setSuccess(null)
    if (!email.trim()) return setError("Ingresa un email")
    startTransition(async () => {
      const result = await promoteToCoach(email.trim())
      if (result.error) { setError(result.error) } else {
        setSuccess(`${result.userName || email} fue promovido/a como coach`)
        setEmail("")
      }
    })
  }

  const handleRemove = (userId: string) => {
    if (confirmRemove !== userId) { setConfirmRemove(userId); return }
    setError(null)
    setConfirmRemove(null)
    startTransition(async () => {
      const result = await removeCoachRole(userId)
      if (result.error) { setError(result.error) } else {
        setCoaches((prev) => prev.filter((c) => c.id !== userId))
      }
    })
  }

  const handleToggle = (userId: string, current: boolean) => {
    setError(null)
    startTransition(async () => {
      const result = await toggleCoachActive(userId, !current)
      if (result.error) { setError(result.error) } else {
        setCoaches((prev) => prev.map((c) => c.id === userId ? { ...c, is_coach_active: !current } : c))
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Add Coach Form */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <h2 className="font-semibold text-zinc-900 text-sm mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-amber-600" /> Agregar Coach
        </h2>
        <div className="flex gap-2">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePromote()}
            placeholder="email del usuario existente..."
            className="flex-1 text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
          <button onClick={handlePromote} disabled={isPending || !email.trim()}
            className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0">
            {isPending ? "..." : "Promover"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        {success && <p className="mt-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">✓ {success}</p>}
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          <span className="text-sm font-medium text-amber-900">{selected.size} seleccionado(s)</span>
          <div className="flex-1" />
          <button onClick={() => handleBulkActivate(true)} disabled={isPending}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors cursor-pointer disabled:opacity-50">
            <ToggleRight className="w-3.5 h-3.5" /> Activar
          </button>
          <button onClick={() => handleBulkActivate(false)} disabled={isPending}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-zinc-300 text-zinc-600 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer disabled:opacity-50">
            <ToggleLeft className="w-3.5 h-3.5" /> Desactivar
          </button>
          {bulkConfirm === "remove" ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-red-700 font-medium">¿Quitar rol a {selected.size} coach(es)?</span>
              <button onClick={handleBulkRemove} disabled={isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer">
                <UserMinus className="w-3 h-3" /> Confirmar
              </button>
              <button onClick={() => setBulkConfirm(null)} className="p-1.5 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={handleBulkRemove} disabled={isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50">
              <UserMinus className="w-3.5 h-3.5" /> Quitar rol
            </button>
          )}
          <button onClick={clearSelection} className="p-1.5 text-zinc-400 hover:text-zinc-600 cursor-pointer" title="Deseleccionar todo">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Coaches Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900 text-sm">Coaches activos ({coaches.length})</h2>
        </div>

        {coaches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <UserCheck className="w-10 h-10 mb-2" strokeWidth={1} />
            <p className="text-sm">No hay coaches registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                      className="w-4 h-4 rounded accent-amber-600 cursor-pointer" />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Coach</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden md:table-cell">Especialización</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden sm:table-cell">Citas</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {coaches.map((coach) => {
                  const isConfirming = confirmRemove === coach.id
                  return (
                    <tr key={coach.id} className={`hover:bg-zinc-50 transition-colors ${selected.has(coach.id) ? "bg-amber-50/50" : ""}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(coach.id)} onChange={() => toggleSelect(coach.id)}
                          className="w-4 h-4 rounded accent-amber-600 cursor-pointer" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center overflow-hidden shrink-0">
                            {coach.image ? (
                              <img src={coach.image} alt={coach.name || "Coach"} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-green-700 font-semibold text-sm">
                                {coach.name?.charAt(0)?.toUpperCase() || "C"}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900">{coach.name || "Sin nombre"}</p>
                            <p className="text-xs text-zinc-500">{coach.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-zinc-600">{coach.specialization || <span className="text-zinc-300">—</span>}</span>
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <span className="font-semibold text-zinc-900">{coach.appointments_count}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleToggle(coach.id, coach.is_coach_active)} disabled={isPending}
                          className="inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                          {coach.is_coach_active ? (
                            <><ToggleRight className="w-5 h-5 text-green-500" /><span className="text-xs text-green-600 font-medium hidden sm:inline">Activo</span></>
                          ) : (
                            <><ToggleLeft className="w-5 h-5 text-zinc-400" /><span className="text-xs text-zinc-400 font-medium hidden sm:inline">Inactivo</span></>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleRemove(coach.id)} disabled={isPending}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
                            isConfirming
                              ? "bg-red-50 border-red-300 text-red-600"
                              : "text-zinc-500 border-zinc-200 hover:border-red-300 hover:text-red-500"
                          }`}>
                          <UserMinus className="w-3 h-3" />
                          {isConfirming ? "¿Confirmar?" : "Quitar rol"}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
