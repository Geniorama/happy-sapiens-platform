"use client"

import { useState } from "react"
import { X, Filter, ChevronDown, ChevronUp, Search } from "lucide-react"

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
  searchQuery: string
  onPartnerChange: (partnerId: string | null) => void
  onCategoryChange: (category: string | null) => void
  onSearchChange: (query: string) => void
  totalCoupons: number
  filteredCount: number
}

export function CouponFilters({
  partners,
  categories,
  selectedPartner,
  selectedCategory,
  searchQuery,
  onPartnerChange,
  onCategoryChange,
  onSearchChange,
  totalCoupons,
  filteredCount,
}: CouponFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  const hasActiveFilters = selectedPartner !== null || selectedCategory !== null || searchQuery.length > 0

  const clearFilters = () => {
    onPartnerChange(null)
    onCategoryChange(null)
    onSearchChange("")
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
    <div className="mb-6 bg-zinc-50 rounded-xl border border-zinc-200 p-5">
      {/* Header con botón de toggle en móvil */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Filter className="w-5 h-5 text-primary" strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-heading text-xl text-zinc-900">Filtros</h3>
            <p className="text-sm text-zinc-600 font-medium">
              {hasActiveFilters ? `${filteredCount} de ${totalCoupons}` : `${totalCoupons} cupones`}
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2">
          {/* Limpiar filtros */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:text-zinc-900 hover:bg-white rounded-lg transition-colors font-medium"
            >
              <X className="w-4 h-4" strokeWidth={2} />
              <span className="hidden sm:inline">Limpiar filtros</span>
            </button>
          )}
          
          {/* Botón toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-zinc-300 rounded-lg text-sm font-medium hover:border-primary hover:bg-primary/5 transition-all shadow-sm"
          >
            {showFilters ? (
              <>
                <ChevronUp className="w-4 h-4" strokeWidth={2} />
                <span className="hidden sm:inline">Ocultar</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" strokeWidth={2} />
                <span className="hidden sm:inline">Mostrar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Buscar por marca, título o descripción..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div 
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          showFilters 
            ? "max-h-[5000px] opacity-100 mb-0" 
            : "max-h-0 opacity-0 mb-0"
        }`}
        style={{
          transitionProperty: 'max-height, opacity',
        }}
      >
        <div className="space-y-5 pt-2">
        {/* Filtro por Marca */}
        <div>
          <label className="block text-sm font-semibold text-zinc-800 mb-3 uppercase tracking-wide">
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
                  <div className="w-6 h-6 rounded-full bg-white border border-zinc-200 p-0.5 flex-shrink-0">
                    <img
                      src={partner.logo_url}
                      alt={partner.name}
                      className="w-full h-full object-contain rounded-full"
                    />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center flex-shrink-0">
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
          <label className="block text-sm font-semibold text-zinc-800 mb-3 uppercase tracking-wide">
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
        </div>
      </div>
    </div>
  )
}
