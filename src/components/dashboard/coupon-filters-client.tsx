"use client"

import { useState, useMemo } from "react"
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

export function CouponFiltersClient({ partners, campaigns, userId }: CouponFiltersClientProps) {
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Extraer categorías únicas
  const categories = useMemo(() => {
    const cats = new Set<string>()
    partners.forEach(p => {
      if (p.category) cats.add(p.category)
    })
    return Array.from(cats).sort()
  }, [partners])

  // Filtrar campañas
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
        onPartnerChange={setSelectedPartner}
        onCategoryChange={setSelectedCategory}
        totalCoupons={campaigns.length}
        filteredCount={filteredCampaigns.length}
      />

      {/* Resultados filtrados */}
      {filteredCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((coupon, index) => (
            <AvailableCouponCard
              key={`${coupon.partner.id}-${index}`}
              coupon={coupon}
              userId={userId}
              availableCount={coupon.available_count}
              userObtainedCount={coupon.user_obtained_count}
              maxPerUser={coupon.max_per_user}
            />
          ))}
        </div>
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
