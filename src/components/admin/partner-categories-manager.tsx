"use client"

import { useState, useTransition, useRef } from "react"
import { Plus, X, Tag, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import { createCategory, deleteCategory } from "@/app/admin/partners/actions"

interface Category {
  id: string
  slug: string
  name: string
}

export function PartnerCategoriesManager({
  categories: initial,
  onChange,
}: {
  categories: Category[]
  onChange: (categories: Category[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState(initial)
  const [newName, setNewName] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const sync = (updated: Category[]) => {
    setCategories(updated)
    onChange(updated)
  }

  const handleCreate = () => {
    if (!newName.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await createCategory(newName)
      if (result.error) {
        setError(result.error)
      } else if (result.category) {
        const updated = [...categories, result.category].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
        sync(updated)
        setNewName("")
        inputRef.current?.focus()
      }
    })
  }

  const handleDelete = (id: string) => {
    if (deletingId !== id) {
      setDeletingId(id)
      return
    }
    setError(null)
    setDeletingId(null)
    startTransition(async () => {
      const result = await deleteCategory(id)
      if (result.error) {
        setError(result.error)
      } else {
        sync(categories.filter((c) => c.id !== id))
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      {/* Header colapsable */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-700">Categorías</span>
          <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
            {categories.length}
          </span>
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-zinc-100 p-4 space-y-3">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Lista de categorías */}
          {categories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-1 bg-zinc-100 rounded-lg pl-3 pr-1 py-1"
                >
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs font-medium text-zinc-700">{cat.name}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">{cat.slug}</span>
                  </div>
                  {deletingId === cat.id ? (
                    <div className="flex items-center gap-0.5 ml-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id)}
                        disabled={isPending}
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
                        title="Confirmar eliminación"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-zinc-300 text-zinc-600 hover:bg-zinc-400 transition-colors cursor-pointer"
                        title="Cancelar"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id)}
                      disabled={isPending}
                      className="w-5 h-5 flex items-center justify-center rounded-full text-zinc-400 hover:bg-red-100 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50 ml-0.5"
                      title="Eliminar categoría"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-400">No hay categorías. Agrega la primera.</p>
          )}

          {/* Input nueva categoría */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Nueva categoría..."
              className="flex-1 text-sm border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
              disabled={isPending}
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={isPending || !newName.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
