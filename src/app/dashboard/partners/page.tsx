import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { UserCouponsList } from "@/components/dashboard/user-coupons-list"
import { AvailableCouponCard } from "@/components/dashboard/available-coupon-card"

export default async function PartnersPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  // Obtener cupones asignados al usuario
  const { data: userCoupons } = await supabaseAdmin
    .from("coupons")
    .select(`
      *,
      partner:partners(*)
    `)
    .eq("user_id", session.user.id)
    .eq("is_assigned", true)
    .order("assigned_at", { ascending: false })

  // Obtener cupones disponibles agrupados por campaña
  const { data: availableCoupons } = await supabaseAdmin
    .from("coupons")
    .select(`
      id,
      title,
      description,
      cover_image_url,
      expires_at,
      max_per_user,
      partner:partners!inner(
        id,
        name,
        website_url,
        category,
        discount_percentage,
        discount_description,
        cover_image_url,
        terms_and_conditions
      )
    `)
    .eq("is_assigned", false)
    .eq("partner.is_active", true)
    .order("created_at", { ascending: false })

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
      <div className="mb-8">
        <h1 className="text-4xl font-heading text-zinc-900 mb-2">Aliados</h1>
        <p className="text-zinc-600">
          Genera cupones de descuento exclusivos para usar en nuestras marcas aliadas
        </p>
      </div>

      <div className="space-y-8">
        {/* Mis Cupones */}
        {userCoupons && userCoupons.length > 0 && (
          <div>
            <h2 className="text-2xl font-heading text-zinc-900 mb-4">Mis Cupones</h2>
            <UserCouponsList coupons={userCoupons} />
          </div>
        )}

        {/* Cupones Disponibles */}
        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-heading text-zinc-900 mb-1">
              Cupones Disponibles
            </h2>
            <p className="text-sm text-zinc-600">
              Obtén cupones exclusivos de nuestras marcas aliadas
            </p>
          </div>
          
          {campaignsWithUserCount && campaignsWithUserCount.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaignsWithUserCount.map((coupon, index) => (
                <AvailableCouponCard 
                  key={`${coupon.partner.id}-${index}`}
                  coupon={coupon}
                  userId={session.user.id}
                  availableCount={coupon.available_count}
                  userObtainedCount={coupon.user_obtained_count}
                  maxPerUser={coupon.max_per_user}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-zinc-200 text-center">
              <p className="text-zinc-600">
                No hay cupones disponibles en este momento.
              </p>
              <p className="text-sm text-zinc-500 mt-2">
                Vuelve pronto para ver nuevas ofertas
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
