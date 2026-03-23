"use client"

import { useState, useTransition } from "react"
import { Plus, X, Tag, Trash2, ChevronDown, ChevronRight, Pencil, Check, CheckCircle2, Clock } from "lucide-react"
import {
  createCouponBatch, deleteCouponCampaign, deleteAllCampaignCoupons, bulkDeleteCampaigns, updateCouponCampaign, markCouponUsed,
} from "@/app/admin/coupons/actions"

interface Partner {
  id: string
  name: string
  logo_url: string | null
}

interface AssignedCoupon {
  id: string
  coupon_code: string
  user_id: string
  user_email: string
  assigned_at: string | null
  used_at: string | null
}

interface Campaign {
  partner_id: string
  partner_name: string
  title: string | null
  description: string | null
  expires_at: string | null
  cover_image_url: string | null
  terms_and_conditions: string | null
  max_per_user: number | null
  discount_percentage: number | null
  discount_description: string | null
  total: number
  available: number
  assigned: number
  used: number
  assignedCoupons: AssignedCoupon[]
}

function campaignKey(c: Campaign) {
  return `${c.partner_id}||${c.title ?? ""}||${c.description ?? ""}`
}

function campaignId(c: Campaign) {
  return { partnerId: c.partner_id, title: c.title, description: c.description }
}

function CreateCouponForm({
  partners,
  onSuccess,
  onCancel,
}: {
  partners: Partner[]
  onSuccess: () => void
  onCancel: () => void
}) {
  const [partnerId, setPartnerId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [codesText, setCodesText] = useState("")
  const [maxPerUser, setMaxPerUser] = useState("")
  const [coverImageUrl, setCoverImageUrl] = useState("")
  const [termsAndConditions, setTermsAndConditions] = useState("")
  const [discountPercentage, setDiscountPercentage] = useState("")
  const [discountDescription, setDiscountDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const codes = codesText.split("\n").map((c) => c.trim()).filter(Boolean)

  const handleSubmit = () => {
    setError(null)
    if (!partnerId) return setError("Selecciona una marca")
    if (codes.length === 0) return setError("Ingresa al menos un código")

    startTransition(async () => {
      const result = await createCouponBatch({
        partner_id: partnerId,
        title: title || undefined,
        description: description || undefined,
        expires_at: expiresAt || undefined,
        codes,
        max_per_user: maxPerUser ? Number(maxPerUser) : null,
        cover_image_url: coverImageUrl || undefined,
        terms_and_conditions: termsAndConditions || undefined,
        discount_percentage: discountPercentage ? Number(discountPercentage) : null,
        discount_description: discountDescription || undefined,
      })

      if (result.error) { setError(result.error) } else { onSuccess() }
    })
  }

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-zinc-900 text-sm">Cargar Cupones</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Marca <span className="text-red-500">*</span></label>
          <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white">
            <option value="">Selecciona una marca...</option>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Título de la campaña</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Promo Verano 2025"
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Descripción</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: 30% OFF en la primera compra"
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Fecha de expiración</label>
          <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Máx. por usuario</label>
          <input type="number" min={1} value={maxPerUser} onChange={(e) => setMaxPerUser(e.target.value)}
            placeholder="Sin límite"
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">% Descuento del cupón</label>
          <input type="number" min={0} max={100} value={discountPercentage} onChange={(e) => setDiscountPercentage(e.target.value)}
            placeholder="Ej: 20 (opcional)"
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Descripción del descuento</label>
          <input type="text" value={discountDescription} onChange={(e) => setDiscountDescription(e.target.value)}
            placeholder="Ej: 20% OFF en toda la tienda"
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-zinc-700 mb-1">URL Imagen portada</label>
          <input type="url" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://..."
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-zinc-700 mb-1">
            Términos y condiciones
            <span className="font-normal text-zinc-400 ml-1">— si no se especifican, se usan los de la marca</span>
          </label>
          <textarea value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)}
            rows={3} placeholder="Condiciones específicas de esta campaña..."
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1">
          Códigos <span className="text-red-500">*</span>
          <span className="font-normal text-zinc-400 ml-1">— uno por línea</span>
        </label>
        <textarea value={codesText} onChange={(e) => setCodesText(e.target.value)} rows={6}
          placeholder={"BRAND2025001\nBRAND2025002\nBRAND2025003"}
          className="w-full text-sm font-mono border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
        {codes.length > 0 && <p className="text-xs text-zinc-500 mt-1">{codes.length} código(s) detectado(s)</p>}
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-zinc-600 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer">
          Cancelar
        </button>
        <button type="button" onClick={handleSubmit} disabled={isPending}
          className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">
          {isPending ? "Cargando..." : `Cargar ${codes.length > 0 ? codes.length : ""} Cupones`}
        </button>
      </div>
    </div>
  )
}

export function CouponsManager({
  campaigns: initial,
  partners,
}: {
  campaigns: Campaign[]
  partners: Partner[]
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    title: string; description: string; expires_at: string
    cover_image_url: string; terms_and_conditions: string; max_per_user: string
    discount_percentage: string; discount_description: string
  } | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [deletingAllKey, setDeletingAllKey] = useState<string | null>(null)
  const [togglingCouponId, setTogglingCouponId] = useState<string | null>(null)
  const [localUsedAt, setLocalUsedAt] = useState<Record<string, string | null>>({})
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Bulk
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState<"available" | "all" | null>(null)

  const allSelected = selected.size > 0 && selected.size === initial.length
  const toggleSelectAll = () => {
    if (allSelected) { setSelected(new Set()) } else { setSelected(new Set(initial.map(campaignKey))) }
    setBulkConfirm(null)
  }
  const toggleSelect = (key: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
    setBulkConfirm(null)
  }
  const clearSelection = () => { setSelected(new Set()); setBulkConfirm(null) }

  const handleBulkDelete = (mode: "available" | "all") => {
    if (bulkConfirm !== mode) { setBulkConfirm(mode); return }
    setError(null)
    const campaigns = initial
      .filter((c) => selected.has(campaignKey(c)))
      .map(campaignId)
    startTransition(async () => {
      const result = await bulkDeleteCampaigns(campaigns, mode)
      if (result.error) { setError(result.error) } else { clearSelection() }
    })
  }

  const startEdit = (c: Campaign) => {
    const key = campaignKey(c)
    setEditingKey(key)
    setExpanded(key)
    setEditForm({
      title: c.title ?? "",
      description: c.description ?? "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
      cover_image_url: c.cover_image_url ?? "",
      terms_and_conditions: c.terms_and_conditions ?? "",
      max_per_user: c.max_per_user != null ? String(c.max_per_user) : "",
      discount_percentage: c.discount_percentage != null ? String(c.discount_percentage) : "",
      discount_description: c.discount_description ?? "",
    })
  }

  const cancelEdit = () => { setEditingKey(null); setEditForm(null) }

  const handleSaveEdit = (c: Campaign) => {
    if (!editForm) return
    setError(null)
    startTransition(async () => {
      const result = await updateCouponCampaign(c.partner_id, c.title, c.description, {
        title: editForm.title || null,
        description: editForm.description || null,
        expires_at: editForm.expires_at || null,
        cover_image_url: editForm.cover_image_url || null,
        terms_and_conditions: editForm.terms_and_conditions || null,
        max_per_user: editForm.max_per_user ? Number(editForm.max_per_user) : null,
        discount_percentage: editForm.discount_percentage ? Number(editForm.discount_percentage) : null,
        discount_description: editForm.discount_description || null,
      })
      if (result.error) { setError(result.error) } else { cancelEdit() }
    })
  }

  const handleDeleteAvailable = (c: Campaign) => {
    const key = campaignKey(c)
    if (deletingKey !== key) { setDeletingKey(key); return }
    setError(null)
    startTransition(async () => {
      const result = await deleteCouponCampaign(c.partner_id, c.title, c.description)
      if (result.error) setError(result.error)
      setDeletingKey(null)
    })
  }

  const handleDeleteAll = (c: Campaign) => {
    const key = campaignKey(c)
    if (deletingAllKey !== key) { setDeletingAllKey(key); return }
    setError(null)
    startTransition(async () => {
      const result = await deleteAllCampaignCoupons(c.partner_id, c.title, c.description)
      if (result.error) setError(result.error)
      setDeletingAllKey(null)
    })
  }

  const handleToggleUsed = (couponId: string, currentUsedAt: string | null) => {
    const nowUsed = currentUsedAt === null
    setTogglingCouponId(couponId)
    startTransition(async () => {
      const result = await markCouponUsed(couponId, nowUsed)
      if (result.error) {
        setError(result.error)
      } else {
        setLocalUsedAt((prev) => ({ ...prev, [couponId]: nowUsed ? new Date().toISOString() : null }))
      }
      setTogglingCouponId(null)
    })
  }

  // Selected campaigns stats for bulk bar label
  const selectedHaveAvailable = initial.some((c) => selected.has(campaignKey(c)) && c.available > 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{initial.length} campaña(s)</p>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors cursor-pointer">
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreate ? "Cancelar" : "Cargar Cupones"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {showCreate && (
        <CreateCouponForm partners={partners} onSuccess={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
      )}

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          <span className="text-sm font-medium text-amber-900">{selected.size} campaña(s) seleccionada(s)</span>
          <div className="flex-1" />

          {/* Eliminar disponibles */}
          {bulkConfirm === "available" ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-red-700 font-medium">¿Eliminar cupones disponibles de {selected.size} campaña(s)?</span>
              <button onClick={() => handleBulkDelete("available")} disabled={isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer">
                <Trash2 className="w-3 h-3" /> Confirmar
              </button>
              <button onClick={() => setBulkConfirm(null)} className="p-1.5 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => handleBulkDelete("available")} disabled={isPending || !selectedHaveAvailable}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-zinc-300 text-zinc-600 rounded-lg hover:bg-zinc-50 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed">
              <Trash2 className="w-3.5 h-3.5" /> Eliminar disponibles
            </button>
          )}

          {/* Eliminar todo */}
          {bulkConfirm === "all" ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-red-700 font-medium">¿Eliminar TODOS los cupones de {selected.size} campaña(s)?</span>
              <button onClick={() => handleBulkDelete("all")} disabled={isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer">
                <Trash2 className="w-3 h-3" /> Confirmar
              </button>
              <button onClick={() => setBulkConfirm(null)} className="p-1.5 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => handleBulkDelete("all")} disabled={isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50">
              <Trash2 className="w-3.5 h-3.5" /> Eliminar todo
            </button>
          )}

          <button onClick={clearSelection} className="p-1.5 text-zinc-400 hover:text-zinc-600 cursor-pointer" title="Deseleccionar todo">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Campaigns List */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {initial.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <Tag className="w-10 h-10 mb-2" strokeWidth={1} />
            <p className="text-sm">No hay cupones cargados</p>
          </div>
        ) : (
          <>
            {/* Select-all header */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-100 bg-zinc-50">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                className="w-4 h-4 rounded accent-amber-600 cursor-pointer" />
              <span className="text-xs text-zinc-400">Seleccionar todas ({initial.length})</span>
            </div>

            <div className="divide-y divide-zinc-100">
              {initial.map((c) => {
                const key = campaignKey(c)
                const isExpanded = expanded === key
                const isDeleting = deletingKey === key
                const isDeletingAll = deletingAllKey === key

                return (
                  <div key={key} className={selected.has(key) ? "bg-amber-50/50" : ""}>
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors">
                      {/* Checkbox */}
                      <input type="checkbox" checked={selected.has(key)} onChange={() => toggleSelect(key)}
                        className="w-4 h-4 rounded accent-amber-600 cursor-pointer shrink-0" />

                      {/* Expand */}
                      <button onClick={() => setExpanded(isExpanded ? null : key)}
                        className="shrink-0 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-zinc-900">{c.partner_name}</span>
                          {c.title && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{c.title}</span>
                          )}
                        </div>
                        {c.description && <p className="text-xs text-zinc-500 truncate">{c.description}</p>}
                      </div>

                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-4 text-xs shrink-0">
                        <div className="text-center">
                          <p className="font-semibold text-zinc-900">{c.total}</p>
                          <p className="text-zinc-400">total</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-green-600">{c.available}</p>
                          <p className="text-zinc-400">disponibles</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-blue-600">{c.assigned}</p>
                          <p className="text-zinc-400">asignados</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-zinc-500">{c.used}</p>
                          <p className="text-zinc-400">usados</p>
                        </div>
                      </div>

                      {/* Edit */}
                      <button
                        onClick={() => editingKey === key ? cancelEdit() : startEdit(c)}
                        className={`shrink-0 flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                          editingKey === key
                            ? "border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100"
                            : "border-zinc-200 text-zinc-400 hover:border-amber-300 hover:text-amber-600"
                        }`}
                        title="Editar campaña"
                      >
                        <Pencil className="w-3 h-3" /><span className="hidden sm:inline">Editar</span>
                      </button>

                      {/* Delete */}
                      <div className="shrink-0 flex items-center gap-1.5">
                        {c.available > 0 && (
                          isDeleting ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDeleteAvailable(c)} disabled={isPending}
                                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border bg-red-50 border-red-300 text-red-600 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50">
                                <Trash2 className="w-3 h-3" /><span className="hidden sm:inline">Confirmar</span>
                              </button>
                              <button onClick={() => setDeletingKey(null)}
                                className="flex items-center px-1.5 py-1.5 text-xs rounded-lg border border-zinc-200 text-zinc-400 hover:bg-zinc-50 transition-colors cursor-pointer">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => handleDeleteAvailable(c)} disabled={isPending}
                              className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg border border-zinc-200 text-zinc-400 hover:border-red-300 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50"
                              title="Eliminar cupones disponibles">
                              <Trash2 className="w-3 h-3" /><span className="hidden sm:inline">Disponibles</span>
                            </button>
                          )
                        )}

                        {isDeletingAll ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDeleteAll(c)} disabled={isPending}
                              className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border bg-red-100 border-red-400 text-red-700 hover:bg-red-200 transition-colors cursor-pointer disabled:opacity-50">
                              <Trash2 className="w-3 h-3" /><span className="hidden sm:inline">Confirmar todo</span>
                            </button>
                            <button onClick={() => setDeletingAllKey(null)}
                              className="flex items-center px-1.5 py-1.5 text-xs rounded-lg border border-zinc-200 text-zinc-400 hover:bg-zinc-50 transition-colors cursor-pointer">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleDeleteAll(c)} disabled={isPending}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg border border-zinc-200 text-zinc-400 hover:border-red-400 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50"
                            title="Eliminar campaña completa">
                            <Trash2 className="w-3 h-3" /><span className="hidden sm:inline">Todo</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-3 border-t border-zinc-100 bg-zinc-50/50 space-y-3">
                        {editingKey === key && editForm ? (
                          /* Edit form */
                          <div className="space-y-3">
                            <p className="text-xs font-semibold text-zinc-700">Editar campaña</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">Título</label>
                                <input type="text" value={editForm.title}
                                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                  className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">Descripción</label>
                                <input type="text" value={editForm.description}
                                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                  className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">Expira</label>
                                <input type="date" value={editForm.expires_at}
                                  onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value })}
                                  className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">Máx. por usuario</label>
                                <input type="number" min={1} value={editForm.max_per_user}
                                  onChange={(e) => setEditForm({ ...editForm, max_per_user: e.target.value })}
                                  placeholder="Sin límite"
                                  className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">% Descuento</label>
                                <input type="number" min={0} max={100} value={editForm.discount_percentage}
                                  onChange={(e) => setEditForm({ ...editForm, discount_percentage: e.target.value })}
                                  placeholder="Opcional"
                                  className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">Desc. descuento</label>
                                <input type="text" value={editForm.discount_description}
                                  onChange={(e) => setEditForm({ ...editForm, discount_description: e.target.value })}
                                  placeholder="Ej: 20% OFF en toda la tienda"
                                  className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">URL imagen portada</label>
                                <input type="url" value={editForm.cover_image_url}
                                  onChange={(e) => setEditForm({ ...editForm, cover_image_url: e.target.value })}
                                  placeholder="https://..."
                                  className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">Términos y condiciones</label>
                                <textarea value={editForm.terms_and_conditions}
                                  onChange={(e) => setEditForm({ ...editForm, terms_and_conditions: e.target.value })}
                                  rows={3} placeholder="Condiciones específicas de esta campaña..."
                                  className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white resize-none" />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button onClick={cancelEdit}
                                className="px-3 py-1.5 text-xs text-zinc-600 border border-zinc-300 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer">
                                Cancelar
                              </button>
                              <button onClick={() => handleSaveEdit(c)} disabled={isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors cursor-pointer">
                                <Check className="w-3 h-3" /> {isPending ? "Guardando..." : "Guardar"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Read-only detail */
                          <>
                            {/* Stats (mobile only) */}
                            <div className="sm:hidden flex gap-4 text-xs">
                              <span className="text-zinc-500"><strong className="text-zinc-900">{c.total}</strong> total</span>
                              <span className="text-green-600"><strong>{c.available}</strong> disponibles</span>
                              <span className="text-blue-600"><strong>{c.assigned}</strong> asignados</span>
                              <span className="text-zinc-400"><strong>{c.used}</strong> usados</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs text-zinc-600">
                              <div>
                                <p className="text-zinc-400 font-medium uppercase tracking-wide text-[10px] mb-0.5">Expira</p>
                                <p>{c.expires_at
                                  ? new Date(c.expires_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
                                  : "Sin fecha"}</p>
                              </div>
                              <div>
                                <p className="text-zinc-400 font-medium uppercase tracking-wide text-[10px] mb-0.5">Máx. por usuario</p>
                                <p>{c.max_per_user ?? "Sin límite"}</p>
                              </div>
                              <div>
                                <p className="text-zinc-400 font-medium uppercase tracking-wide text-[10px] mb-0.5">Imagen portada</p>
                                <p>{c.cover_image_url ? "Sí" : "No"}</p>
                              </div>
                              {c.discount_percentage != null && (
                                <div>
                                  <p className="text-zinc-400 font-medium uppercase tracking-wide text-[10px] mb-0.5">Descuento cupón</p>
                                  <p className="text-amber-700 font-semibold">{c.discount_percentage}% OFF</p>
                                </div>
                              )}
                              {c.discount_description && (
                                <div className="sm:col-span-2">
                                  <p className="text-zinc-400 font-medium uppercase tracking-wide text-[10px] mb-0.5">Desc. descuento</p>
                                  <p>{c.discount_description}</p>
                                </div>
                              )}
                            </div>

                            {c.terms_and_conditions && (
                              <div className="text-xs text-zinc-600">
                                <p className="text-zinc-400 font-medium uppercase tracking-wide text-[10px] mb-1">Términos y condiciones</p>
                                <p className="whitespace-pre-wrap bg-white border border-zinc-200 rounded-lg p-2.5 max-h-28 overflow-y-auto">
                                  {c.terms_and_conditions}
                                </p>
                              </div>
                            )}

                            {/* Cupones asignados */}
                            <div className="pt-3 border-t border-zinc-200">
                              <p className="text-zinc-400 font-medium uppercase tracking-wide text-[10px] mb-2">
                                Cupones asignados ({c.assignedCoupons.length})
                              </p>
                              {c.assignedCoupons.length === 0 ? (
                                <p className="text-xs text-zinc-400 italic">Ningún cupón ha sido obtenido aún</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {c.assignedCoupons.map((ac) => {
                                    const effectiveUsedAt = ac.id in localUsedAt ? localUsedAt[ac.id] : ac.used_at
                                    const isUsed = effectiveUsedAt !== null
                                    const isToggling = togglingCouponId === ac.id
                                    return (
                                      <div key={ac.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs ${isUsed ? "bg-zinc-50 border-zinc-200" : "bg-white border-zinc-200"}`}>
                                        <code className="font-mono font-semibold text-zinc-900 flex-shrink-0">{ac.coupon_code}</code>
                                        <span className="text-zinc-500 truncate flex-1 min-w-0">{ac.user_email}</span>
                                        {ac.assigned_at && (
                                          <span className="text-zinc-400 flex-shrink-0 hidden sm:inline">
                                            {new Date(ac.assigned_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                                          </span>
                                        )}
                                        <button
                                          onClick={() => handleToggleUsed(ac.id, effectiveUsedAt)}
                                          disabled={isToggling || isPending}
                                          title={isUsed ? "Marcar como no usado" : "Marcar como usado"}
                                          className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-md border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                            isUsed
                                              ? "border-zinc-300 text-zinc-500 hover:border-red-300 hover:text-red-500"
                                              : "border-zinc-300 text-zinc-400 hover:border-green-400 hover:text-green-600"
                                          }`}
                                        >
                                          {isToggling
                                            ? <span className="text-[10px]">...</span>
                                            : isUsed
                                              ? <><CheckCircle2 className="w-3 h-3" strokeWidth={2} /><span className="hidden sm:inline">Usado</span></>
                                              : <><Clock className="w-3 h-3" strokeWidth={1.5} /><span className="hidden sm:inline">Activo</span></>
                                          }
                                        </button>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </>
                        )}
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
