"use client"

import { useState, useTransition } from "react"
import { Star, Search, Plus, Minus, ChevronDown, ChevronRight, Loader2, X } from "lucide-react"
import { adminAdjustPoints, bulkAdjustPoints, getPointsHistory } from "@/app/admin/points/actions"

interface UserWithPoints {
  id: string
  name: string | null
  email: string
  role: string
  total_points: number
}

interface Transaction {
  id: string
  amount: number
  action_type: string
  description: string | null
  created_at: string
}

function AdjustForm({
  userId,
  onSuccess,
  onCancel,
}: {
  userId: string
  onSuccess: (newDelta: number) => void
  onCancel: () => void
}) {
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const parsedAmount = Number(amount)

  const handleSubmit = () => {
    setError(null)
    if (!amount || parsedAmount === 0) return setError("Ingresa un monto distinto de cero")
    if (!description.trim()) return setError("La descripción es requerida")

    startTransition(async () => {
      const result = await adminAdjustPoints(userId, parsedAmount, description)
      if (result.error) { setError(result.error) } else { onSuccess(parsedAmount) }
    })
  }

  return (
    <div className="mt-2 p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs font-medium text-zinc-600 mb-1">
            Monto <span className="font-normal text-zinc-400">(negativo para descontar)</span>
          </label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="Ej: 50 o -20"
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div className="flex-[2]">
          <label className="block text-xs font-medium text-zinc-600 mb-1">Descripción</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Motivo del ajuste..."
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel}
          className="px-3 py-1.5 text-xs text-zinc-600 border border-zinc-300 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer">
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={isPending}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
            parsedAmount < 0
              ? "bg-red-50 border border-red-300 text-red-600 hover:bg-red-100"
              : "bg-green-50 border border-green-300 text-green-700 hover:bg-green-100"
          }`}>
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : parsedAmount < 0 ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {isPending ? "Guardando..." : parsedAmount < 0 ? `Descontar ${Math.abs(parsedAmount)} pts` : `Otorgar ${parsedAmount || ""} pts`}
        </button>
      </div>
    </div>
  )
}

function HistoryRow({ userId }: { userId: string }) {
  const [history, setHistory] = useState<Transaction[] | null>(null)
  const [isPending, startTransition] = useTransition()

  if (history === null) {
    return (
      <button
        onClick={() => {
          startTransition(async () => {
            const result = await getPointsHistory(userId)
            setHistory(result.history as Transaction[])
          })
        }}
        disabled={isPending}
        className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer disabled:opacity-50">
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        Ver historial
      </button>
    )
  }

  return (
    <div className="mt-2 space-y-1">
      {history.length === 0 ? (
        <p className="text-xs text-zinc-400">Sin transacciones</p>
      ) : (
        history.map((t) => (
          <div key={t.id} className="flex items-center justify-between text-xs py-1 border-b border-zinc-100 last:border-0">
            <div>
              <span className="text-zinc-600">{t.description || t.action_type}</span>
              <span className="text-zinc-400 ml-2">
                {new Date(t.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
            <span className={`font-semibold ${t.amount > 0 ? "text-green-600" : "text-red-500"}`}>
              {t.amount > 0 ? "+" : ""}{t.amount} pts
            </span>
          </div>
        ))
      )}
      <button onClick={() => setHistory(null)} className="text-xs text-zinc-400 hover:text-zinc-600 cursor-pointer">
        Ocultar
      </button>
    </div>
  )
}

export function PointsManager({ users: initial }: { users: UserWithPoints[] }) {
  const [users, setUsers] = useState(initial)
  const [search, setSearch] = useState("")
  const [adjustingId, setAdjustingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Bulk
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAmount, setBulkAmount] = useState("")
  const [bulkDesc, setBulkDesc] = useState("")
  const [bulkError, setBulkError] = useState<string | null>(null)

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return !q || u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const allSelected = selected.size > 0 && selected.size === filtered.length
  const toggleSelectAll = () => {
    if (allSelected) { setSelected(new Set()) } else { setSelected(new Set(filtered.map((u) => u.id))) }
  }
  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const clearSelection = () => { setSelected(new Set()); setBulkAmount(""); setBulkDesc(""); setBulkError(null) }

  const parsedBulkAmount = Number(bulkAmount)

  const handleBulkAdjust = () => {
    setBulkError(null)
    if (!bulkAmount || parsedBulkAmount === 0) return setBulkError("Ingresa un monto distinto de cero")
    if (!bulkDesc.trim()) return setBulkError("La descripción es requerida")

    const ids = [...selected]
    startTransition(async () => {
      const result = await bulkAdjustPoints(ids, parsedBulkAmount, bulkDesc)
      if (result.error) {
        setBulkError(result.error)
      } else {
        setUsers((prev) =>
          prev.map((u) =>
            selected.has(u.id) ? { ...u, total_points: Math.max(0, u.total_points + parsedBulkAmount) } : u
          )
        )
        clearSelection()
      }
    })
  }

  const handleAdjustSuccess = (userId: string, delta: number) => {
    setUsers((prev) =>
      prev.map((u) => u.id === userId ? { ...u, total_points: Math.max(0, u.total_points + delta) } : u)
    )
    setAdjustingId(null)
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input type="text" value={search}
          onChange={(e) => { setSearch(e.target.value); clearSelection() }}
          placeholder="Buscar usuario por nombre o email..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
      </div>

      <p className="text-xs text-zinc-400">
        {filtered.length} usuario(s) — total{" "}
        <span className="font-semibold text-zinc-600">
          {filtered.reduce((s, u) => s + u.total_points, 0).toLocaleString()} pts
        </span>
      </p>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-amber-900">{selected.size} usuario(s) seleccionado(s)</span>
            <div className="flex-1" />
            <button onClick={clearSelection} className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer" title="Deseleccionar todo">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input type="number" value={bulkAmount} onChange={(e) => setBulkAmount(e.target.value)}
              placeholder="Monto (neg. para descontar)"
              className="flex-1 text-sm border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
            <input type="text" value={bulkDesc} onChange={(e) => setBulkDesc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBulkAdjust()}
              placeholder="Descripción del ajuste..."
              className="flex-[2] text-sm border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
            <button onClick={handleBulkAdjust} disabled={isPending || !bulkAmount || parsedBulkAmount === 0 || !bulkDesc.trim()}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${
                parsedBulkAmount < 0
                  ? "bg-red-50 border-red-300 text-red-600 hover:bg-red-100"
                  : "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
              }`}>
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : parsedBulkAmount < 0 ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {parsedBulkAmount < 0 ? `Descontar ${Math.abs(parsedBulkAmount) || ""} pts` : `Otorgar ${parsedBulkAmount || ""} pts`}
            </button>
          </div>

          {bulkError && <p className="text-xs text-red-600">{bulkError}</p>}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <Star className="w-10 h-10 mb-2" strokeWidth={1} />
            <p className="text-sm">No se encontraron usuarios</p>
          </div>
        ) : (
          <>
            {/* Select-all header */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-100 bg-zinc-50">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                className="w-4 h-4 rounded accent-amber-600 cursor-pointer" />
              <span className="text-xs text-zinc-400">Seleccionar todos ({filtered.length})</span>
            </div>

            <div className="divide-y divide-zinc-100">
              {filtered.map((user) => {
                const isAdjusting = adjustingId === user.id
                const isExpanded = expandedId === user.id

                return (
                  <div key={user.id} className={`px-4 py-3 hover:bg-zinc-50 transition-colors ${selected.has(user.id) ? "bg-amber-50/50" : ""}`}>
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <input type="checkbox" checked={selected.has(user.id)} onChange={() => toggleSelect(user.id)}
                        className="w-4 h-4 rounded accent-amber-600 cursor-pointer shrink-0" />

                      {/* Expand toggle */}
                      <button onClick={() => setExpandedId(isExpanded ? null : user.id)}
                        className="shrink-0 text-zinc-300 hover:text-zinc-500 cursor-pointer">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      {/* User info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{user.name || "Sin nombre"}</p>
                        <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                      </div>

                      {/* Role badge */}
                      <span className={`hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        user.role === "coach" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"
                      }`}>
                        {user.role}
                      </span>

                      {/* Points */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Star className="w-3.5 h-3.5 text-amber-500" fill="currentColor" />
                        <span className="text-sm font-semibold text-zinc-900 min-w-[3rem] text-right">
                          {user.total_points.toLocaleString()}
                        </span>
                      </div>

                      {/* Adjust button */}
                      <button
                        onClick={() => setAdjustingId(isAdjusting ? null : user.id)}
                        className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                          isAdjusting
                            ? "bg-zinc-100 border-zinc-300 text-zinc-600"
                            : "border-amber-300 text-amber-700 hover:bg-amber-50"
                        }`}>
                        {isAdjusting ? "Cancelar" : "Ajustar"}
                      </button>
                    </div>

                    {/* Adjust form */}
                    {isAdjusting && (
                      <AdjustForm
                        userId={user.id}
                        onSuccess={(delta) => handleAdjustSuccess(user.id, delta)}
                        onCancel={() => setAdjustingId(null)}
                      />
                    )}

                    {/* History */}
                    {isExpanded && !isAdjusting && (
                      <div className="mt-2 pl-14">
                        <HistoryRow userId={user.id} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
