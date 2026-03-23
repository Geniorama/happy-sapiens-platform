import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

const ITEMS_PER_PAGE = 12

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const partnerId = searchParams.get("partnerId")
    const category = searchParams.get("category")
    const search = searchParams.get("search")

    // Si hay búsqueda, primero obtener partners que coincidan
    let matchingPartnerIds: string[] = []
    if (search && search.trim().length > 0) {
      const searchLower = `%${search.toLowerCase().trim()}%`
      const { data: matchingPartners } = await supabaseAdmin
        .from("partners")
        .select("id")
        .ilike("name", searchLower)
        .eq("is_active", true)
      
      if (matchingPartners) {
        matchingPartnerIds = matchingPartners.map(p => p.id)
      }
    }

    // Construir query base
    let query = supabaseAdmin
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

    // Aplicar búsqueda por texto
    if (search && search.trim().length > 0) {
      const searchLower = `%${search.toLowerCase().trim()}%`
      
      if (matchingPartnerIds.length > 0) {
        // Buscar en título, descripción O en partners que coincidan
        query = query.or(`title.ilike.${searchLower},description.ilike.${searchLower},partner_id.in.(${matchingPartnerIds.join(",")})`)
      } else {
        // Solo buscar en título y descripción
        query = query.or(`title.ilike.${searchLower},description.ilike.${searchLower}`)
      }
    }

    // Aplicar filtros
    if (partnerId) {
      query = query.eq("partner_id", partnerId)
    }

    if (category) {
      query = query.eq("partner.category", category)
    }

    query = query.order("created_at", { ascending: false })

    // Paginación
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    const { data: availableCoupons, error } = await query.range(from, to)

    if (error) {
      console.error("Error fetching coupons:", error)
      return NextResponse.json({ error: "Error al obtener cupones" }, { status: 500 })
    }

    // Agrupar cupones por campaña
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
        let countQuery = supabaseAdmin
          .from("coupons")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id)
          .eq("partner_id", campaign.partner.id)
          .eq("is_assigned", true)

        if (campaign.title !== undefined) {
          countQuery = countQuery.eq("title", campaign.title)
        }
        if (campaign.description !== undefined) {
          countQuery = countQuery.eq("description", campaign.description)
        }

        const { count } = await countQuery

        return {
          ...campaign,
          user_obtained_count: count || 0
        }
      })
    )

    // Obtener el total de cupones (para saber si hay más páginas)
    let countQuery = supabaseAdmin
      .from("coupons")
      .select("*", { count: "exact", head: true })
      .eq("is_assigned", false)
      .eq("partner.is_active", true)

    if (partnerId) {
      countQuery = countQuery.eq("partner_id", partnerId)
    }

    if (category) {
      countQuery = countQuery.eq("partner.category", category)
    }

    const { count: totalCount } = await countQuery

    // Calcular si hay más páginas basado en los cupones obtenidos
    // Si obtuvimos menos cupones que ITEMS_PER_PAGE, no hay más páginas
    const hasMore = (availableCoupons?.length || 0) >= ITEMS_PER_PAGE

    return NextResponse.json({
      campaigns: campaignsWithUserCount,
      hasMore,
      page,
      totalCount: totalCount || 0
    })
  } catch (error) {
    console.error("Error in available coupons API:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
