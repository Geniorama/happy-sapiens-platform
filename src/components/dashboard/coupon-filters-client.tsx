"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { CouponFilters } from "./coupon-filters"
import { AvailableCouponCard } from "./available-coupon-card"

interface Partner {
  id: string
  name: string
  logo_url: string | null
  category: string | null
  website_url: string | null
  discount_percentage: number | null
  discount_description: string | null
  cover_image_url: string | null
  terms_and_conditions: string | null
}

interface Campaign {
  id: string
  title: string | null
  description: string | null
  cover_image_url: string | null
  expires_at: string | null
  max_per_user: number | null
  partner: Partner
  available_count: number
  user_obtained_count: number
}

interface CouponFiltersClientProps {
  partners: Partner[]
  campaigns: Campaign[]
  userId: string
}

export function CouponFiltersClient({ partners, campaigns: initialCampaigns, userId }: CouponFiltersClientProps) {
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Extraer categorías únicas
  const categories = useMemo(() => {
    const cats = new Set<string>()
    partners.forEach(p => {
      if (p.category) cats.add(p.category)
    })
    return Array.from(cats).sort()
  }, [partners])

  // Cargar más cupones
  const loadMoreCampaigns = useCallback(async (pageNum: number, partnerId: string | null, category: string | null, search: string, reset: boolean = false) => {
    if (isLoading && !reset) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
      })

      if (partnerId) {
        params.append("partnerId", partnerId)
      }

      if (category) {
        params.append("category", category)
      }

      if (search && search.trim().length > 0) {
        params.append("search", search.trim())
      }

      const response = await fetch(`/api/coupons/available?${params.toString()}`)
      const data = await response.json()

      if (data.campaigns) {
        if (reset || pageNum === 1) {
          setCampaigns(data.campaigns)
        } else {
          setCampaigns(prev => [...prev, ...data.campaigns])
        }
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error("Error loading campaigns:", error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  // Resetear y cargar cuando cambian los filtros
  useEffect(() => {
    setPage(1)
    setHasMore(true)
    loadMoreCampaigns(1, selectedPartner, selectedCategory, searchQuery, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPartner, selectedCategory])

  // Debounce para la búsqueda
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      setPage(1)
      setHasMore(true)
      loadMoreCampaigns(1, selectedPartner, selectedCategory, searchQuery, true)
    }, 500) // Esperar 500ms después de que el usuario deje de escribir

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // Observer para infinite scroll
  useEffect(() => {
    if (!hasMore || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          const nextPage = page + 1
          setPage(nextPage)
          loadMoreCampaigns(nextPage, selectedPartner, selectedCategory, searchQuery, false)
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, isLoading, page, selectedPartner, selectedCategory, searchQuery, loadMoreCampaigns])

  // Filtrar campañas (filtrado local adicional si es necesario)
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      // Filtro por marca
      if (selectedPartner && campaign.partner.id !== selectedPartner) {
        return false
      }

      // Filtro por categoría
      if (selectedCategory && campaign.partner.category !== selectedCategory) {
        return false
      }

      return true
    })
  }, [campaigns, selectedPartner, selectedCategory])

  return (
    <>
      <CouponFilters
        partners={partners}
        categories={categories}
        selectedPartner={selectedPartner}
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        onPartnerChange={setSelectedPartner}
        onCategoryChange={setSelectedCategory}
        onSearchChange={setSearchQuery}
        totalCoupons={campaigns.length}
        filteredCount={filteredCampaigns.length}
      />

      {/* Resultados filtrados */}
      {filteredCampaigns.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((coupon, index) => (
              <AvailableCouponCard
                key={`${coupon.partner.id}-${coupon.title || 'standard'}-${coupon.description || ''}-${index}`}
                coupon={coupon}
                userId={userId}
                availableCount={coupon.available_count}
                userObtainedCount={coupon.user_obtained_count}
                maxPerUser={coupon.max_per_user}
              />
            ))}
          </div>
          
          {/* Observer target para infinite scroll */}
          <div ref={observerTarget} className="h-10 flex items-center justify-center">
            {isLoading && (
              <div className="flex items-center gap-2 text-zinc-600">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Cargando más cupones...</span>
              </div>
            )}
            {!hasMore && filteredCampaigns.length > 0 && (
              <p className="text-sm text-zinc-500 text-center py-4">
                No hay más cupones disponibles
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-zinc-200 text-center">
          <p className="text-zinc-600">
            {campaigns.length === 0 
              ? "No hay cupones disponibles en este momento."
              : "No hay cupones que coincidan con los filtros seleccionados."}
          </p>
          <p className="text-sm text-zinc-500 mt-2">
            {campaigns.length === 0 
              ? "Vuelve pronto para ver nuevas ofertas"
              : "Prueba a cambiar o limpiar los filtros"}
          </p>
        </div>
      )}
    </>
  )
}
