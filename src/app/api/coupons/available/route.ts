import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"

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
      const matchingPartners = await prisma.partner.findMany({
        where: {
          name: { contains: search.trim(), mode: "insensitive" },
          isActive: true,
        },
        select: { id: true },
      })
      matchingPartnerIds = matchingPartners.map((p) => p.id)
    }

    // Construir where base
    const where: Prisma.CouponWhereInput = {
      isAssigned: false,
      partner: { isActive: true },
    }

    // Aplicar búsqueda por texto
    if (search && search.trim().length > 0) {
      const term = search.trim()
      const searchOr: Prisma.CouponWhereInput[] = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ]
      if (matchingPartnerIds.length > 0) {
        searchOr.push({ partnerId: { in: matchingPartnerIds } })
      }
      where.OR = searchOr
    }

    // Aplicar filtros
    if (partnerId) {
      where.partnerId = partnerId
    }

    if (category) {
      where.partner = { isActive: true, category }
    }

    // Paginación
    const from = (page - 1) * ITEMS_PER_PAGE

    let availableCoupons
    try {
      availableCoupons = await prisma.coupon.findMany({
        where,
        include: {
          partner: {
            select: {
              id: true,
              name: true,
              websiteUrl: true,
              category: true,
              discountPercentage: true,
              discountDescription: true,
              coverImageUrl: true,
              logoUrl: true,
              termsAndConditions: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: from,
        take: ITEMS_PER_PAGE,
      })
    } catch (err) {
      console.error("Error fetching coupons:", err)
      return NextResponse.json({ error: "Error al obtener cupones" }, { status: 500 })
    }

    // Mapear a shape snake_case esperada por el frontend
    const mappedCoupons = availableCoupons.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      cover_image_url: c.coverImageUrl,
      expires_at: c.expiresAt,
      max_per_user: c.maxPerUser,
      terms_and_conditions: c.termsAndConditions,
      discount_percentage: c.discountPercentage,
      discount_description: c.discountDescription,
      partner: {
        id: c.partner.id,
        name: c.partner.name,
        website_url: c.partner.websiteUrl,
        category: c.partner.category,
        discount_percentage: c.partner.discountPercentage,
        discount_description: c.partner.discountDescription,
        cover_image_url: c.partner.coverImageUrl,
        logo_url: c.partner.logoUrl,
        terms_and_conditions: c.partner.termsAndConditions,
      },
    }))

    // Agrupar cupones por campaña
    type Campaign = typeof mappedCoupons[number] & { available_count: number }
    const groupedCoupons = mappedCoupons.reduce((acc: Campaign[], coupon) => {
      const existing = acc.find(
        (item) =>
          item.partner.id === coupon.partner.id &&
          item.title === coupon.title &&
          item.description === coupon.description,
      )

      if (existing) {
        existing.available_count += 1
      } else {
        acc.push({
          ...coupon,
          available_count: 1,
        })
      }

      return acc
    }, [])

    // Para cada campaña, obtener cuántos ya tiene el usuario
    const campaignsWithUserCount = await Promise.all(
      groupedCoupons.map(async (campaign) => {
        const countWhere: Prisma.CouponWhereInput = {
          userId: session.user.id,
          partnerId: campaign.partner.id,
          isAssigned: true,
        }

        if (campaign.title !== undefined) {
          countWhere.title = campaign.title
        }
        if (campaign.description !== undefined) {
          countWhere.description = campaign.description
        }

        const count = await prisma.coupon.count({ where: countWhere })

        return {
          ...campaign,
          user_obtained_count: count,
        }
      }),
    )

    // Obtener el total de cupones (para saber si hay más páginas)
    const countWhere: Prisma.CouponWhereInput = {
      isAssigned: false,
      partner: { isActive: true },
    }

    if (partnerId) {
      countWhere.partnerId = partnerId
    }

    if (category) {
      countWhere.partner = { isActive: true, category }
    }

    const totalCount = await prisma.coupon.count({ where: countWhere })

    // Calcular si hay más páginas basado en los cupones obtenidos
    const hasMore = availableCoupons.length >= ITEMS_PER_PAGE

    return NextResponse.json({
      campaigns: campaignsWithUserCount,
      hasMore,
      page,
      totalCount,
    })
  } catch (error) {
    console.error("Error in available coupons API:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    )
  }
}
