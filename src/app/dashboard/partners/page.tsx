import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { SectionCover } from "@/components/dashboard/section-cover"
import { UserCouponsList } from "@/components/dashboard/user-coupons-list"
import { CouponFiltersClient } from "@/components/dashboard/coupon-filters-client"

export default async function PartnersPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  const coverRow = await prisma.sectionCover.findFirst({
    where: { sectionKey: "partners", isActive: true },
    select: { title: true, subtitle: true, imageUrl: true, isActive: true },
  })

  const cover = coverRow
    ? {
        title: coverRow.title,
        subtitle: coverRow.subtitle,
        image_url: coverRow.imageUrl,
        is_active: coverRow.isActive,
      }
    : null

  // Obtener todas las marcas activas para los filtros
  const partnerRows = await prisma.partner.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      category: true,
      websiteUrl: true,
      discountPercentage: true,
      discountDescription: true,
      coverImageUrl: true,
      termsAndConditions: true,
    },
    orderBy: { name: "asc" },
  })

  const allPartners = partnerRows.map((p) => ({
    id: p.id,
    name: p.name,
    logo_url: p.logoUrl,
    category: p.category,
    website_url: p.websiteUrl,
    discount_percentage: p.discountPercentage,
    discount_description: p.discountDescription,
    cover_image_url: p.coverImageUrl,
    terms_and_conditions: p.termsAndConditions,
  }))

  // Obtener cupones asignados al usuario
  const userCouponRows = await prisma.coupon.findMany({
    where: { userId: session.user.id, isAssigned: true },
    include: {
      partner: {
        select: {
          id: true,
          name: true,
          websiteUrl: true,
          discountPercentage: true,
          discountDescription: true,
          coverImageUrl: true,
          logoUrl: true,
          termsAndConditions: true,
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  })

  const userCoupons = userCouponRows.map((c) => ({
    id: c.id,
    coupon_code: c.couponCode,
    title: c.title,
    description: c.description,
    cover_image_url: c.coverImageUrl,
    is_assigned: c.isAssigned ?? false,
    assigned_at: c.assignedAt ? c.assignedAt.toISOString() : "",
    used_at: c.usedAt ? c.usedAt.toISOString() : null,
    expires_at: c.expiresAt ? c.expiresAt.toISOString() : null,
    terms_and_conditions: c.termsAndConditions,
    discount_percentage: c.discountPercentage,
    discount_description: c.discountDescription,
    partner: {
      id: c.partner.id,
      name: c.partner.name,
      website_url: c.partner.websiteUrl,
      discount_percentage: c.partner.discountPercentage,
      discount_description: c.partner.discountDescription,
      cover_image_url: c.partner.coverImageUrl,
      logo_url: c.partner.logoUrl,
      terms_and_conditions: c.partner.termsAndConditions,
    },
  }))

  // Cargar solo la primera página de cupones disponibles (el componente cliente manejará la paginación)
  const availableCouponRows = await prisma.coupon.findMany({
    where: {
      isAssigned: false,
      partner: { isActive: true },
    },
    select: {
      id: true,
      title: true,
      description: true,
      coverImageUrl: true,
      expiresAt: true,
      maxPerUser: true,
      termsAndConditions: true,
      discountPercentage: true,
      discountDescription: true,
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
    take: 12,
  })

  // Agrupar cupones por campaña (partner + title + description)
  type CampaignAcc = {
    id: string
    title: string | null
    description: string | null
    cover_image_url: string | null
    expires_at: string | null
    max_per_user: number | null
    terms_and_conditions: string | null
    discount_percentage: number | null
    discount_description: string | null
    partner: {
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
    available_count: number
  }

  const groupedCoupons = availableCouponRows.reduce<CampaignAcc[]>((acc, coupon) => {
    const existing = acc.find(
      (item) =>
        item.partner.id === coupon.partner.id &&
        item.title === coupon.title &&
        item.description === coupon.description
    )

    if (existing) {
      existing.available_count += 1
    } else {
      acc.push({
        id: coupon.id,
        title: coupon.title,
        description: coupon.description,
        cover_image_url: coupon.coverImageUrl,
        expires_at: coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
        max_per_user: coupon.maxPerUser,
        terms_and_conditions: coupon.termsAndConditions,
        discount_percentage: coupon.discountPercentage,
        discount_description: coupon.discountDescription,
        partner: {
          id: coupon.partner.id,
          name: coupon.partner.name,
          logo_url: coupon.partner.logoUrl,
          category: coupon.partner.category,
          website_url: coupon.partner.websiteUrl,
          discount_percentage: coupon.partner.discountPercentage,
          discount_description: coupon.partner.discountDescription,
          cover_image_url: coupon.partner.coverImageUrl,
          terms_and_conditions: coupon.partner.termsAndConditions,
        },
        available_count: 1,
      })
    }

    return acc
  }, [])

  // Para cada campaña, obtener cuántos ya tiene el usuario
  const campaignsWithUserCount = await Promise.all(
    groupedCoupons.map(async (campaign) => {
      const count = await prisma.coupon.count({
        where: {
          userId: session.user.id,
          partnerId: campaign.partner.id,
          isAssigned: true,
          title: campaign.title,
          description: campaign.description,
        },
      })

      return {
        ...campaign,
        user_obtained_count: count,
      }
    })
  )

  return (
    <div className="max-w-7xl mx-auto">
      <SectionCover
        title={cover?.title || ""}
        subtitle={cover?.subtitle || ""}
        imageUrl={cover?.image_url}
        fallbackTitle="Aliados"
        fallbackSubtitle="Genera cupones de descuento exclusivos para usar en nuestras marcas aliadas"
      />

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
            partners={allPartners}
            campaigns={campaignsWithUserCount}
            userId={session.user.id}
            isPaused={session.user.subscriptionStatus === "paused"}
          />
        </div>
      </div>
    </div>
  )
}
