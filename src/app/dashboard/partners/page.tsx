import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { UserCouponsList } from "@/components/dashboard/user-coupons-list"
import { AvailableCouponCard } from "@/components/dashboard/available-coupon-card"
import { CouponFiltersClient } from "@/components/dashboard/coupon-filters-client"

export default async function PartnersPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  // Obtener todas las marcas activas para los filtros
  const { data: allPartners } = await supabaseAdmin
    .from("partners")
    .select("id, name, logo_url, category, website_url, discount_percentage, discount_description, cover_image_url, terms_and_conditions")
    .eq("is_active", true)
    .order("name")

  // Obtener cupones asignados al usuario
  const { data: userCoupons } = await supabaseAdmin
    .from("coupons")
    .select(`
      *,
      partner:partners(id, name, website_url, discount_percentage, discount_description, cover_image_url, logo_url, terms_and_conditions)
    `)
    .eq("user_id", session.user.id)
    .eq("is_assigned", true)
    .order("assigned_at", { ascending: false })

  // Cargar solo la primera página de cupones disponibles (el componente cliente manejará la paginación)
  const { data: availableCoupons } = await supabaseAdmin
    .from("coupons")
    .select(`
      id,
      title,
      description,
      cover_image_url,
      expires_at,
      max_per_user,
      terms_and_conditions,
      discount_percentage,
      discount_description,
      partner:partners!inner(
        id,
        name,
        website_url,
        category,
        discount_percentage,
        discount_description,
        cover_image_url,
        logo_url,
        terms_and_conditions
      )
    `)
    .eq("is_assigned", false)
    .eq("partner.is_active", true)
    .order("created_at", { ascending: false })
    .limit(12)

  // Agrupar cupones por campaña (partner + title + description)
  const groupedCoupons = availableCoupons?.reduce((acc: any[], coupon: any) => {
    const key = `${coupon.partner.id}-${coupon.title || 'standard'}-${coupon.description || ''}`
    const existing = acc.find(item => 
      item.partner.id === coupon.partner.id && 
      item.title === coupon.title && 
      item.description === coupon.description
    )
    
    if (existing) {
      existing.available_count += 1
    } else {
      acc.push({
        ...coupon,
        available_count: 1
      })
    }
    
    return acc
  }, []) || []

  // Para cada campaña, obtener cuántos ya tiene el usuario
  const campaignsWithUserCount = await Promise.all(
    groupedCoupons.map(async (campaign: any) => {
      let query = supabaseAdmin
        .from("coupons")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("partner_id", campaign.partner.id)
        .eq("is_assigned", true)

      if (campaign.title !== undefined) {
        query = query.eq("title", campaign.title)
      }
      if (campaign.description !== undefined) {
        query = query.eq("description", campaign.description)
      }

      const { count } = await query

      return {
        ...campaign,
        user_obtained_count: count || 0
      }
    })
  )

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl uppercase font-heading text-zinc-900 mb-1 sm:mb-2">Aliados</h1>
        <p className="text-sm sm:text-base text-zinc-600">
          Genera cupones de descuento exclusivos para usar en nuestras marcas aliadas
        </p>
      </div>

      <div className="space-y-8">
        {/* Mis Cupones */}
        {userCoupons && userCoupons.length > 0 && (
          <div>
            <h2 className="text-xl sm:text-2xl uppercase font-heading text-zinc-900 mb-3 sm:mb-4">Mis Cupones</h2>
            <UserCouponsList coupons={userCoupons} />
          </div>
        )}

        {/* Cupones Disponibles */}
        <div>
          <div className="mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-2xl uppercase font-heading text-zinc-900 mb-1">
              Cupones Disponibles
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600">
              Obtén cupones exclusivos de nuestras marcas aliadas
            </p>
          </div>

          {/* Componente de filtros con estado del cliente */}
          <CouponFiltersClient
            partners={allPartners || []}
            campaigns={campaignsWithUserCount || []}
            userId={session.user.id}
            isPaused={session.user.subscriptionStatus === "paused"}
          />
        </div>
      </div>
    </div>
  )
}
