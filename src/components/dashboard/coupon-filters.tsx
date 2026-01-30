"use client"

import { useState } from "react"
import { X, Filter } from "lucide-react"

interface Partner {
  id: string
  name: string
  logo_url: string | null
  category: string | null
}

interface CouponFiltersProps {
  partners: Partner[]
  categories: string[]
  selectedPartner: string | null
  selectedCategory: string | null
  onPartnerChange: (partnerId: string | null) => void
  onCategoryChange: (category: string | null) => void
  totalCoupons: number
  filteredCount: number
}

export function CouponFilters({
  partners,
  categories,
  selectedPartner,
  selectedCategory,
  onPartnerChange,
  onCategoryChange,
  totalCoupons,
  filteredCount,
}: CouponFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  const hasActiveFilters = selectedPartner !== null || selectedCategory !== null

  const clearFilters = () => {
    onPartnerChange(null)
    onCategoryChange(null)
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      deportes: "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200",
      nutricion: "bg-green-100 text-green-700 border-green-300 hover:bg-green-200",
      tecnologia: "bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200",
    }
    return colors[category] || "bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200"
  }

  return (
    <div className="mb-6">
      {/* Header con botón de toggle en móvil */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-zinc-600" strokeWidth={1.5} />
          <div>
            <h3 className="font-heading text-lg text-zinc-900">Filtros</h3>
            <p className="text-sm text-zinc-600">
              {hasActiveFilters ? `${filteredCount} de ${totalCoupons}` : `${totalCoupons} cupones`}
            </p>
          </div>
        </div>

        {/* Botón toggle para móvil */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="lg:hidden px-3 py-2 border border-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-50"
        >
          {showFilters ? "Ocultar" : "Mostrar"}
        </button>

        {/* Limpiar filtros (desktop) */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="hidden lg:flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2} />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className={`space-y-4 ${showFilters ? "block" : "hidden lg:block"}`}>
        {/* Filtro por Marca */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-3">
            Por Marca
          </label>
          <div className="flex flex-wrap gap-3">
            {partners.map((partner) => (
              <button
                key={partner.id}
                onClick={() => onPartnerChange(selectedPartner === partner.id ? null : partner.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  selectedPartner === partner.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-zinc-200 hover:border-zinc-300 bg-white"
                }`}
              >
                {partner.logo_url ? (
                  <img
                    src={partner.logo_url}
                    alt={partner.name}
                    className="w-6 h-6 object-contain"
                  />
                ) : (
                  <div className="w-6 h-6 rounded bg-zinc-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-zinc-600">
                      {partner.name.charAt(0)}
                    </span>
                  </div>
                )}
                <span className={`text-sm font-medium ${
                  selectedPartner === partner.id ? "text-primary" : "text-zinc-700"
                }`}>
                  {partner.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Filtro por Categoría */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-3">
            Por Categoría
          </label>
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => onCategoryChange(selectedCategory === category ? null : category)}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? "border-primary bg-primary text-white shadow-sm"
                    : getCategoryColor(category)
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Limpiar filtros (móvil) */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="lg:hidden w-full flex items-center justify-center gap-2 px-4 py-2 border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <X className="w-4 h-4" strokeWidth={2} />
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  )
}
