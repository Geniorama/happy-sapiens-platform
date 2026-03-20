"use client"

import { useState, useTransition } from "react"
import {
  Search, Users, Plus, X, ChevronDown, ChevronRight,
  Pencil, Shield, CreditCard, KeyRound, Trash2, Check, Loader2,
  ToggleLeft, ToggleRight,
} from "lucide-react"
import {
  createUser, updateUser, changeUserRole,
  setSubscription, resetPassword, deleteUser,
  bulkDeleteUsers, bulkSetSubscription,
} from "@/app/admin/users/actions"

interface User {
  id: string
  name: string | null
  email: string
  role: string
  phone: string | null
  birth_date: string | null
  gender: string | null
  subscription_status: string | null
  subscription_end_date: string | null
  image: string | null
  created_at: string
  coupons_count: number
  total_points: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLES = ["user", "coach", "admin"] as const
const GENDERS = ["masculino", "femenino", "no_binario", "prefiero_no_decir"]

function roleBadge(role: string) {
  if (role === "coach") return "bg-green-100 text-green-700"
  if (role === "admin") return "bg-amber-100 text-amber-700"
  return "bg-zinc-100 text-zinc-600"
}

function subBadge(status: string | null) {
  return status === "active"
    ? "bg-blue-100 text-blue-700"
    : "bg-zinc-100 text-zinc-400"
}

function ActionBtn({
  onClick, disabled, variant = "default", children,
}: {
  onClick: () => void
  disabled?: boolean
  variant?: "default" | "danger" | "success"
  children: React.ReactNode
}) {
  const base = "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer disabled:opacity-50"
  const variants = {
    default: "border-zinc-200 text-zinc-600 hover:bg-zinc-50",
    danger: "border-red-200 text-red-600 hover:bg-red-50",
    success: "border-green-200 text-green-700 hover:bg-green-50",
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  )
}

// ─── Create Form ──────────────────────────────────────────────────────────────

function CreateUserForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: "", email: "", password: "",
    role: "user" as "user" | "coach" | "admin",
    subscription_status: "active" as "active" | "inactive",
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = () => {
    setError(null)
    startTransition(async () => {
      const result = await createUser(form)
      if (result.error) setError(result.error)
      else onClose()
    })
  }

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-zinc-900 text-sm">Nuevo Usuario</h3>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Nombre *</label>
          <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
            placeholder="Juan Pérez"
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Email *</label>
          <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
            placeholder="juan@email.com"
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Contraseña *</label>
          <input type="password" value={form.password} onChange={e => set("password", e.target.value)}
            placeholder="mínimo 6 caracteres"
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Rol</label>
          <select value={form.role} onChange={e => set("role", e.target.value)}
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white">
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Suscripción</label>
          <select value={form.subscription_status} onChange={e => set("subscription_status", e.target.value)}
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white">
            <option value="active">Activa</option>
            <option value="inactive">Inactiva</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={onClose}
          className="px-4 py-2 text-sm text-zinc-600 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer">
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors cursor-pointer">
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          {isPending ? "Creando..." : "Crear Usuario"}
        </button>
      </div>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

type PanelTab = "datos" | "rol" | "suscripcion" | "password" | "eliminar"

function UserDetailPanel({
  user,
  onClose,
  onUpdated,
  onDeleted,
}: {
  user: User
  onClose: () => void
  onUpdated: (partial: Partial<User>) => void
  onDeleted: () => void
}) {
  const [tab, setTab] = useState<PanelTab>("datos")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Datos
  const [dataForm, setDataForm] = useState({
    name: user.name || "", email: user.email,
    phone: user.phone || "", birth_date: user.birth_date || "", gender: user.gender || "",
  })
  // Rol
  const [roleVal, setRoleVal] = useState(user.role)
  const [confirmRole, setConfirmRole] = useState(false)
  // Suscripción
  const [subStatus, setSubStatus] = useState<"active" | "inactive">(
    user.subscription_status === "active" ? "active" : "inactive"
  )
  const [subEndDate, setSubEndDate] = useState(
    user.subscription_end_date ? user.subscription_end_date.split("T")[0] : ""
  )
  // Password
  const [newPwd, setNewPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState(false)
  // Eliminar
  const [deleteConfirm, setDeleteConfirm] = useState("")

  const flash = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const tabs: { id: PanelTab; label: string; icon: React.ReactNode }[] = [
    { id: "datos", label: "Datos", icon: <Pencil className="w-3 h-3" /> },
    { id: "rol", label: "Rol", icon: <Shield className="w-3 h-3" /> },
    { id: "suscripcion", label: "Suscripción", icon: <CreditCard className="w-3 h-3" /> },
    { id: "password", label: "Contraseña", icon: <KeyRound className="w-3 h-3" /> },
    { id: "eliminar", label: "Eliminar", icon: <Trash2 className="w-3 h-3" /> },
  ]

  return (
    <div className="mt-1 border border-zinc-200 rounded-xl bg-white overflow-hidden">
      {/* Tabs */}
      <div className="flex gap-0 border-b border-zinc-100 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setError(null); setSuccessMsg(null) }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 -mb-px ${
              tab === t.id
                ? t.id === "eliminar"
                  ? "border-red-500 text-red-600"
                  : "border-amber-500 text-amber-700"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={onClose} className="px-3 text-zinc-400 hover:text-zinc-600 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4">
        {error && (
          <p className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}
        {successMsg && (
          <p className="mb-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <Check className="w-3 h-3" />{successMsg}
          </p>
        )}

        {/* ── Datos ── */}
        {tab === "datos" && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Nombre *</label>
                <input type="text" value={dataForm.name}
                  onChange={e => setDataForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Email *</label>
                <input type="email" value={dataForm.email}
                  onChange={e => setDataForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Teléfono</label>
                <input type="tel" value={dataForm.phone}
                  onChange={e => setDataForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+54 9 11..."
                  className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Fecha de nacimiento</label>
                <input type="date" value={dataForm.birth_date}
                  onChange={e => setDataForm(p => ({ ...p, birth_date: e.target.value }))}
                  className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Género</label>
                <select value={dataForm.gender}
                  onChange={e => setDataForm(p => ({ ...p, gender: e.target.value }))}
                  className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white">
                  <option value="">Sin especificar</option>
                  {GENDERS.map(g => <option key={g} value={g}>{g.replace("_", " ")}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => {
                setError(null)
                startTransition(async () => {
                  const r = await updateUser(user.id, dataForm)
                  if (r.error) setError(r.error)
                  else { onUpdated({ name: dataForm.name, email: dataForm.email, phone: dataForm.phone || null, birth_date: dataForm.birth_date || null, gender: dataForm.gender || null }); flash("Datos actualizados") }
                })
              }} disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors cursor-pointer">
                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Guardar cambios
              </button>
            </div>
          </div>
        )}

        {/* ── Rol ── */}
        {tab === "rol" && (
          <div className="space-y-3 max-w-sm">
            <p className="text-xs text-zinc-500">
              Rol actual: <span className={`font-semibold px-1.5 py-0.5 rounded ${roleBadge(user.role)}`}>{user.role}</span>
            </p>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Nuevo rol</label>
              <select value={roleVal} onChange={e => { setRoleVal(e.target.value); setConfirmRole(false) }}
                className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {roleVal !== user.role && !confirmRole && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ¿Confirmar cambio de rol a <strong>{roleVal}</strong>?
              </p>
            )}
            <button
              onClick={() => {
                if (!confirmRole) { setConfirmRole(true); return }
                setError(null)
                startTransition(async () => {
                  const r = await changeUserRole(user.id, roleVal as any)
                  if (r.error) setError(r.error)
                  else { onUpdated({ role: roleVal }); setConfirmRole(false); flash("Rol actualizado") }
                })
              }}
              disabled={isPending || roleVal === user.role}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors cursor-pointer">
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
              {confirmRole ? "Confirmar cambio" : "Cambiar rol"}
            </button>
          </div>
        )}

        {/* ── Suscripción ── */}
        {tab === "suscripcion" && (
          <div className="space-y-3 max-w-sm">
            <p className="text-xs text-zinc-500">
              Estado actual:{" "}
              <span className={`font-semibold px-1.5 py-0.5 rounded ${subBadge(user.subscription_status)}`}>
                {user.subscription_status || "inactiva"}
              </span>
              {user.subscription_end_date && (
                <span className="ml-2 text-zinc-400">
                  vence {new Date(user.subscription_end_date).toLocaleDateString("es-AR")}
                </span>
              )}
            </p>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Estado</label>
              <select value={subStatus} onChange={e => setSubStatus(e.target.value as any)}
                className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white">
                <option value="active">Activa</option>
                <option value="inactive">Inactiva</option>
              </select>
            </div>
            {subStatus === "active" && (
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Fecha de vencimiento <span className="font-normal text-zinc-400">(opcional)</span>
                </label>
                <input type="date" value={subEndDate} onChange={e => setSubEndDate(e.target.value)}
                  className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            )}
            <button onClick={() => {
              setError(null)
              startTransition(async () => {
                const r = await setSubscription(user.id, subStatus, subEndDate || undefined)
                if (r.error) setError(r.error)
                else { onUpdated({ subscription_status: subStatus, subscription_end_date: subStatus === "active" ? (subEndDate || null) : null }); flash("Suscripción actualizada") }
              })
            }} disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors cursor-pointer">
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Guardar suscripción
            </button>
          </div>
        )}

        {/* ── Contraseña ── */}
        {tab === "password" && (
          <div className="space-y-3 max-w-sm">
            <p className="text-xs text-zinc-500">Establece una nueva contraseña para este usuario.</p>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Nueva contraseña *</label>
              <input type="password" value={newPwd} onChange={e => { setNewPwd(e.target.value); setConfirmPwd(false) }}
                placeholder="mínimo 6 caracteres"
                className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <button onClick={() => {
              if (!confirmPwd) { setConfirmPwd(true); return }
              setError(null)
              startTransition(async () => {
                const r = await resetPassword(user.id, newPwd)
                if (r.error) setError(r.error)
                else { setNewPwd(""); setConfirmPwd(false); flash("Contraseña actualizada") }
              })
            }} disabled={isPending || newPwd.length < 6}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors cursor-pointer">
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3" />}
              {confirmPwd ? "Confirmar cambio" : "Cambiar contraseña"}
            </button>
          </div>
        )}

        {/* ── Eliminar ── */}
        {tab === "eliminar" && (
          <div className="space-y-3 max-w-sm">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-red-700">Zona de peligro</p>
              <p className="text-xs text-red-600 mt-1">
                Esta acción es irreversible. Se eliminarán todos los datos del usuario.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Escribe <span className="font-mono font-bold">{user.email}</span> para confirmar
              </label>
              <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                placeholder={user.email}
                className="w-full text-sm border border-red-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <button onClick={() => {
              setError(null)
              startTransition(async () => {
                const r = await deleteUser(user.id)
                if (r.error) setError(r.error)
                else onDeleted()
              })
            }} disabled={isPending || deleteConfirm !== user.email}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer">
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Eliminar usuario
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function UsersManager({ users: initial }: { users: User[] }) {
  const [users, setUsers] = useState(initial)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("todos")
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [bulkError, setBulkError] = useState<string | null>(null)

  // Bulk
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState<"delete" | null>(null)

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    const matchRole = roleFilter === "todos" || u.role === roleFilter
    return matchSearch && matchRole
  })

  const allSelected = selected.size > 0 && selected.size === filtered.length
  const toggleSelectAll = () => {
    if (allSelected) { setSelected(new Set()) } else { setSelected(new Set(filtered.map((u) => u.id))) }
    setBulkConfirm(null)
  }
  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    setBulkConfirm(null)
  }
  const clearSelection = () => { setSelected(new Set()); setBulkConfirm(null) }

  const handleBulkSubscription = (status: "active" | "inactive") => {
    setBulkError(null)
    const ids = [...selected]
    startTransition(async () => {
      const result = await bulkSetSubscription(ids, status)
      if (result.error) { setBulkError(result.error) } else {
        setUsers(prev => prev.map(u => selected.has(u.id)
          ? { ...u, subscription_status: status, subscription_end_date: status === "active"
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null }
          : u
        ))
        clearSelection()
      }
    })
  }

  const handleBulkDelete = () => {
    if (bulkConfirm !== "delete") { setBulkConfirm("delete"); return }
    setBulkError(null)
    const ids = [...selected]
    startTransition(async () => {
      const result = await bulkDeleteUsers(ids)
      if (result.error) { setBulkError(result.error) } else {
        setUsers(prev => prev.filter(u => !ids.includes(u.id)))
        clearSelection()
        setExpandedId(null)
      }
    })
  }

  const handleUpdated = (userId: string, partial: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...partial } : u))
  }

  const handleDeleted = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId))
    setExpandedId(null)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); clearSelection() }}
            placeholder="Buscar por nombre o email..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); clearSelection() }}
          className="text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white">
          <option value="todos">Todos los roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={() => { setShowCreate(!showCreate); setExpandedId(null) }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors cursor-pointer shrink-0">
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreate ? "Cancelar" : "Nuevo Usuario"}
        </button>
      </div>

      {showCreate && <CreateUserForm onClose={() => setShowCreate(false)} />}

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          <span className="text-sm font-medium text-amber-900">{selected.size} seleccionado(s)</span>
          {bulkError && <span className="text-xs text-red-600">{bulkError}</span>}
          <div className="flex-1" />
          <button onClick={() => handleBulkSubscription("active")} disabled={isPending}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-50">
            <ToggleRight className="w-3.5 h-3.5" /> Activar suscripción
          </button>
          <button onClick={() => handleBulkSubscription("inactive")} disabled={isPending}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-zinc-300 text-zinc-600 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer disabled:opacity-50">
            <ToggleLeft className="w-3.5 h-3.5" /> Desactivar suscripción
          </button>
          {bulkConfirm === "delete" ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-red-700 font-medium">¿Eliminar {selected.size} usuario(s)?</span>
              <button onClick={handleBulkDelete} disabled={isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer">
                <Trash2 className="w-3 h-3" /> Confirmar
              </button>
              <button onClick={() => setBulkConfirm(null)} className="p-1.5 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={handleBulkDelete} disabled={isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50">
              <Trash2 className="w-3.5 h-3.5" /> Eliminar
            </button>
          )}
          <button onClick={clearSelection} className="p-1.5 text-zinc-400 hover:text-zinc-600 cursor-pointer" title="Deseleccionar todo">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <p className="text-xs text-zinc-400">{filtered.length} de {users.length} usuario(s)</p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <Users className="w-10 h-10 mb-2" strokeWidth={1} />
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
              {filtered.map(user => {
                const isExpanded = expandedId === user.id
                return (
                  <div key={user.id} className={selected.has(user.id) ? "bg-amber-50/50" : ""}>
                    <div
                      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : user.id)}
                    >
                      {/* Checkbox */}
                      <input type="checkbox" checked={selected.has(user.id)}
                        onChange={() => toggleSelect(user.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded accent-amber-600 cursor-pointer shrink-0" />

                      {/* Chevron */}
                      <span className="text-zinc-300 shrink-0">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </span>

                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden shrink-0">
                        {user.image
                          ? <img src={user.image} alt="" className="w-full h-full object-cover" />
                          : <span className="text-xs font-semibold text-zinc-500">
                              {user.name?.charAt(0)?.toUpperCase() || "?"}
                            </span>}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{user.name || "Sin nombre"}</p>
                        <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                      </div>

                      {/* Role */}
                      <span className={`hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${roleBadge(user.role)}`}>
                        {user.role}
                      </span>

                      {/* Subscription */}
                      <span className={`hidden md:inline text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${subBadge(user.subscription_status)}`}>
                        {user.subscription_status === "active" ? "activa" : "inactiva"}
                      </span>

                      {/* Stats */}
                      <div className="hidden lg:flex items-center gap-3 text-xs text-zinc-400 shrink-0">
                        <span>{user.coupons_count} cupones</span>
                        <span>{user.total_points} pts</span>
                      </div>

                      {/* Date */}
                      <span className="hidden xl:inline text-xs text-zinc-400 shrink-0">
                        {new Date(user.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <UserDetailPanel
                          user={user}
                          onClose={() => setExpandedId(null)}
                          onUpdated={partial => handleUpdated(user.id, partial)}
                          onDeleted={() => handleDeleted(user.id)}
                        />
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
