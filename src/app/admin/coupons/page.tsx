import { prisma } from "@/lib/db"
import { CouponsManager } from "@/components/admin/coupons-manager"

export default async function AdminCouponsPage() {
  // Fetch all partners for the create form
  const partnerRows = await prisma.partner.findMany({
    where: { isActive: true },
    select: { id: true, name: true, logoUrl: true },
    orderBy: { name: "asc" },
  })

  const partners = partnerRows.map((p) => ({
    id: p.id,
    name: p.name,
    logo_url: p.logoUrl,
  }))

  // Fetch all coupons with partner info to build campaigns
  const couponRows = await prisma.coupon.findMany({
    select: {
      id: true,
      partnerId: true,
      title: true,
      description: true,
      expiresAt: true,
      coverImageUrl: true,
      termsAndConditions: true,
      maxPerUser: true,
      discountPercentage: true,
      discountDescription: true,
      couponCode: true,
      isAssigned: true,
      usedAt: true,
      assignedAt: true,
      userId: true,
      partner: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // Collect all user_ids from assigned coupons to fetch emails
  const assignedUserIds = Array.from(
    new Set(
      couponRows
        .filter((c) => c.isAssigned && c.userId)
        .map((c) => c.userId as string)
    )
  )

  const userEmailMap: Record<string, string> = {}
  if (assignedUserIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: assignedUserIds } },
      select: { id: true, email: true, name: true },
    })
    for (const u of users) {
      userEmailMap[u.id] = u.email || u.name || u.id
    }
  }

  // Group coupons into campaigns
  type AssignedCoupon = {
    id: string
    coupon_code: string
    user_id: string
    user_email: string
    assigned_at: string | null
    used_at: string | null
  }

  type CampaignMap = {
    [key: string]: {
      partner_id: string
      partner_name: string
      title: string | null
      description: string | null
      expires_at: string | null
      cover_image_url: string | null
      terms_and_conditions: string | null
      max_per_user: number | null
      discount_percentage: number | null
      discount_description: string | null
      total: number
      available: number
      assigned: number
      used: number
      assignedCoupons: AssignedCoupon[]
    }
  }

  const campaignMap: CampaignMap = {}

  for (const coupon of couponRows) {
    const key = `${coupon.partnerId}-${coupon.title ?? ""}-${coupon.description ?? ""}`

    if (!campaignMap[key]) {
      campaignMap[key] = {
        partner_id: coupon.partnerId,
        partner_name: coupon.partner?.name ?? "Desconocido",
        title: coupon.title,
        description: coupon.description,
        expires_at: coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
        cover_image_url: coupon.coverImageUrl ?? null,
        terms_and_conditions: coupon.termsAndConditions ?? null,
        max_per_user: coupon.maxPerUser ?? null,
        discount_percentage: coupon.discountPercentage ?? null,
        discount_description: coupon.discountDescription ?? null,
        total: 0,
        available: 0,
        assigned: 0,
        used: 0,
        assignedCoupons: [],
      }
    }

    campaignMap[key].total++
    if (!coupon.isAssigned) {
      campaignMap[key].available++
    } else {
      campaignMap[key].assigned++
      if (coupon.usedAt) campaignMap[key].used++
      const userId = coupon.userId as string
      campaignMap[key].assignedCoupons.push({
        id: coupon.id,
        coupon_code: coupon.couponCode,
        user_id: userId,
        user_email: userEmailMap[userId] ?? userId,
        assigned_at: coupon.assignedAt ? coupon.assignedAt.toISOString() : null,
        used_at: coupon.usedAt ? coupon.usedAt.toISOString() : null,
      })
    }
  }

  const campaigns = Object.values(campaignMap).sort((a, b) =>
    a.partner_name.localeCompare(b.partner_name)
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl uppercase font-heading text-zinc-900 mb-1">Cupones</h1>
        <p className="text-sm text-zinc-500">
          Carga y administra los códigos de descuento por campaña
        </p>
      </div>

      <CouponsManager campaigns={campaigns} partners={partners} />
    </div>
  )
}
