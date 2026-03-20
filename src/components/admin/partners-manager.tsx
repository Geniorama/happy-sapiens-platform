"use client"

import React, { useState, useTransition } from "react"
import { Plus, Pencil, X, Globe, Building2, ToggleLeft, ToggleRight, Trash2 } from "lucide-react"
import {
  createPartner, updatePartner, togglePartnerActive, deletePartner,
  bulkTogglePartnersActive, bulkDeletePartners,
  type PartnerFormData,
} from "@/app/admin/partners/actions"
import { ImageInput } from "@/components/admin/image-input"
import { PartnerCategoriesManager } from "@/components/admin/partner-categories-manager"

interface Category {
  id: string
  slug: string
  name: string
}

interface Partner {
  id: string
  name: string
  category: string | null
  website_url: string | null
  logo_url: string | null
  cover_image_url: string | null
  terms_and_conditions: string | null
  is_active: boolean
}

const EMPTY_FORM: PartnerFormData = {
  name: "",
  category: "",
  website_url: "",
  logo_url: "",
  cover_image_url: "",
  terms_and_conditions: "",
}

function PartnerForm({
  initial,
  categories,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: {
  initial: PartnerFormData
  categories: Category[]
  onSubmit: (data: PartnerFormData) => void
  onCancel: () => void
  isPending: boolean
  submitLabel: string
}) {
  const [form, setForm] = useState<PartnerFormData>(initial)
  const set = (field: keyof PartnerFormData, value: string | null) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ej: Nike Argentina"
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Categoría</label>
          <select
            value={form.category || ""}
            onChange={(e) => set("category", e.target.value || null)}
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          >
            <option value="">Sin categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Sitio web</label>
          <input
            type="url"
            value={form.website_url || ""}
            onChange={(e) => set("website_url", e.target.value)}
            placeholder="https://..."
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ImageInput label="Logo" value={form.logo_url || ""} onChange={(url) => set("logo_url", url)} aspectRatio="square" />
        <ImageInput label="Imagen de portada" value={form.cover_image_url || ""} onChange={(url) => set("cover_image_url", url)} aspectRatio="wide" />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1">Términos y condiciones</label>
        <textarea
          value={form.terms_and_conditions || ""}
          onChange={(e) => set("terms_and_conditions", e.target.value)}
          rows={3}
          placeholder="Condiciones de uso del cupón..."
          className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer">
          Cancelar
        </button>
        <button type="button" onClick={() => onSubmit(form)} disabled={isPending || !form.name.trim()}
          className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">
          {isPending ? "Guardando..." : submitLabel}
        </button>
      </div>
    </div>
  )
}

export function PartnersManager({
  partners: initial,
  categories: initialCategories,
}: {
  partners: Partner[]
  categories: Category[]
}) {
  const [partners, setPartners] = useState(initial)
  const [categories, setCategories] = useState(initialCategories)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Bulk
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState<"delete" | null>(null)

  const allSelected = selected.size > 0 && selected.size === partners.length
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(partners.map((p) => p.id)))
    }
    setBulkConfirm(null)
  }
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setBulkConfirm(null)
  }
  const clearSelection = () => { setSelected(new Set()); setBulkConfirm(null) }

  const handleBulkActivate = (isActive: boolean) => {
    setError(null)
    const ids = [...selected]
    startTransition(async () => {
      const result = await bulkTogglePartnersActive(ids, isActive)
      if (result.error) { setError(result.error) } else {
        setPartners((prev) => prev.map((p) => selected.has(p.id) ? { ...p, is_active: isActive } : p))
        clearSelection()
      }
    })
  }

  const handleBulkDelete = () => {
    if (bulkConfirm !== "delete") { setBulkConfirm("delete"); return }
    setError(null)
    const ids = [...selected]
    startTransition(async () => {
      const result = await bulkDeletePartners(ids)
      if (result.error) { setError(result.error) } else {
        setPartners((prev) => prev.filter((p) => !selected.has(p.id)))
        clearSelection()
      }
    })
  }

  const handleCreate = (data: PartnerFormData) => {
    setError(null)
    startTransition(async () => {
      const result = await createPartner(data)
      if (result.error) { setError(result.error) } else {
        if (result.partner) {
          setPartners((prev) => [...prev, result.partner!].sort((a, b) => a.name.localeCompare(b.name)))
        }
        setShowCreate(false)
      }
    })
  }

  const handleUpdate = (id: string, data: PartnerFormData) => {
    setError(null)
    startTransition(async () => {
      const result = await updatePartner(id, data)
      if (result.error) { setError(result.error) } else {
        setPartners((prev) =>
          prev.map((p) => p.id === id ? {
            ...p,
            name: data.name.trim(),
            category: data.category?.trim() || null,
            website_url: data.website_url?.trim() || null,
            logo_url: data.logo_url?.trim() || null,
            cover_image_url: data.cover_image_url?.trim() || null,
            terms_and_conditions: data.terms_and_conditions?.trim() || null,
          } : p).sort((a, b) => a.name.localeCompare(b.name))
        )
        setEditingId(null)
      }
    })
  }

  const handleDelete = (id: string) => {
    if (deletingId !== id) { setDeletingId(id); return }
    setError(null)
    setDeletingId(null)
    startTransition(async () => {
      const result = await deletePartner(id)
      if (result.error) { setError(result.error) } else {
        setPartners((prev) => prev.filter((p) => p.id !== id))
        setEditingId(null)
      }
    })
  }

  const handleToggle = (id: string, currentActive: boolean) => {
    setError(null)
    startTransition(async () => {
      const result = await togglePartnerActive(id, !currentActive)
      if (result.error) { setError(result.error) } else {
        setPartners((prev) => prev.map((p) => p.id === id ? { ...p, is_active: !currentActive } : p))
      }
    })
  }

  return (
    <div className="space-y-4">
      <PartnerCategoriesManager categories={categories} onChange={setCategories} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{partners.length} marca(s) en total</p>
        <button
          onClick={() => { setShowCreate(!showCreate); setEditingId(null) }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors cursor-pointer"
        >
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreate ? "Cancelar" : "Nueva Marca"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {showCreate && (
        <PartnerForm initial={EMPTY_FORM} categories={categories} onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)} isPending={isPending} submitLabel="Crear Marca" />
      )}

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          <span className="text-sm font-medium text-amber-900">{selected.size} seleccionada(s)</span>
          <div className="flex-1" />
          <button onClick={() => handleBulkActivate(true)} disabled={isPending}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors cursor-pointer disabled:opacity-50">
            <ToggleRight className="w-3.5 h-3.5" /> Activar
          </button>
          <button onClick={() => handleBulkActivate(false)} disabled={isPending}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-zinc-300 text-zinc-600 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer disabled:opacity-50">
            <ToggleLeft className="w-3.5 h-3.5" /> Desactivar
          </button>
          {bulkConfirm === "delete" ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-red-700 font-medium">
                ¿Eliminar {selected.size} marca(s) y sus cupones?
              </span>
              <button onClick={handleBulkDelete} disabled={isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer">
                <Trash2 className="w-3 h-3" /> Confirmar
              </button>
              <button onClick={() => setBulkConfirm(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={handleBulkDelete} disabled={isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50">
              <Trash2 className="w-3.5 h-3.5" /> Eliminar
            </button>
          )}
          <button onClick={clearSelection}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 cursor-pointer" title="Deseleccionar todo">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {partners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <Building2 className="w-10 h-10 mb-2" strokeWidth={1} />
            <p className="text-sm">No hay marcas registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={allSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded accent-amber-600 cursor-pointer" />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Marca</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden sm:table-cell">Categoría</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {partners.map((partner) => (
                  <React.Fragment key={partner.id}>
                    <tr className={`hover:bg-zinc-50 transition-colors ${selected.has(partner.id) ? "bg-amber-50/50" : ""}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(partner.id)}
                          onChange={() => toggleSelect(partner.id)}
                          className="w-4 h-4 rounded accent-amber-600 cursor-pointer" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {partner.logo_url ? (
                            <img src={partner.logo_url} alt={partner.name}
                              className="w-8 h-8 rounded-lg object-contain bg-zinc-100 shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4 text-zinc-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-zinc-900">{partner.name}</p>
                            {partner.website_url && (
                              <a href={partner.website_url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-zinc-400 hover:text-amber-600 flex items-center gap-1">
                                <Globe className="w-3 h-3" /> sitio web
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                          {partner.category || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleToggle(partner.id, partner.is_active)} disabled={isPending}
                          className="inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title={partner.is_active ? "Desactivar" : "Activar"}>
                          {partner.is_active ? (
                            <><ToggleRight className="w-5 h-5 text-green-500" /><span className="text-xs text-green-600 font-medium hidden sm:inline">Activa</span></>
                          ) : (
                            <><ToggleLeft className="w-5 h-5 text-zinc-400" /><span className="text-xs text-zinc-400 font-medium hidden sm:inline">Inactiva</span></>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingId(editingId === partner.id ? null : partner.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer">
                            {editingId === partner.id ? <X className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                            {editingId === partner.id ? "Cancelar" : "Editar"}
                          </button>
                          <button onClick={() => handleDelete(partner.id)} disabled={isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-400 hover:border-red-300 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50">
                            <Trash2 className="w-3 h-3" /> Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                    {deletingId === partner.id && (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 bg-red-50 border-t border-red-100">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-sm text-red-700">
                              <Trash2 className="w-4 h-4 shrink-0" />
                              <span>¿Eliminar <strong>{partner.name}</strong>? Se eliminarán también todos sus cupones. Esta acción no se puede deshacer.</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => setDeletingId(null)}
                                className="px-3 py-1.5 text-xs font-medium border border-zinc-300 text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer">
                                Cancelar
                              </button>
                              <button onClick={() => handleDelete(partner.id)} disabled={isPending}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer">
                                <Trash2 className="w-3 h-3" /> Eliminar todo
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {editingId === partner.id && (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 bg-zinc-50">
                          <PartnerForm
                            initial={{
                              name: partner.name,
                              category: partner.category || "",
                              website_url: partner.website_url || "",
                              logo_url: partner.logo_url || "",
                              cover_image_url: partner.cover_image_url || "",
                              terms_and_conditions: partner.terms_and_conditions || "",
                            }}
                            categories={categories}
                            onSubmit={(data) => handleUpdate(partner.id, data)}
                            onCancel={() => setEditingId(null)}
                            isPending={isPending}
                            submitLabel="Guardar Cambios"
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
