import { supabaseAdmin } from "@/lib/supabase"
import { CouponsManager } from "@/components/admin/coupons-manager"

export default async function AdminCouponsPage() {
  // Fetch all partners for the create form
  const { data: partners } = await supabaseAdmin
    .from("partners")
    .select("id, name, logo_url")
    .eq("is_active", true)
    .order("name")

  // Fetch all coupons with partner info to build campaigns
  const { data: coupons } = await supabaseAdmin
    .from("coupons")
    .select(`
      id,
      partner_id,
      title,
      description,
      expires_at,
      cover_image_url,
      terms_and_conditions,
      max_per_user,
      discount_percentage,
      discount_description,
      coupon_code,
      is_assigned,
      used_at,
      assigned_at,
      user_id,
      partner:partners!inner(id, name)
    `)
    .order("created_at", { ascending: false })

  // Collect all user_ids from assigned coupons to fetch emails
  const assignedCoupons = (coupons ?? []).filter((c) => c.is_assigned && (c as any).user_id)
  const userIds = [...new Set(assignedCoupons.map((c) => (c as any).user_id as string))]

  const userEmailMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id, email, name")
      .in("id", userIds)
    for (const u of users ?? []) {
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

  for (const coupon of coupons ?? []) {
    const partner = coupon.partner as any
    const key = `${coupon.partner_id}-${coupon.title ?? ""}-${coupon.description ?? ""}`

    if (!campaignMap[key]) {
      campaignMap[key] = {
        partner_id: coupon.partner_id,
        partner_name: partner?.name ?? "Desconocido",
        title: coupon.title,
        description: coupon.description,
        expires_at: (coupon as any).expires_at ?? null,
        cover_image_url: (coupon as any).cover_image_url ?? null,
        terms_and_conditions: (coupon as any).terms_and_conditions ?? null,
        max_per_user: (coupon as any).max_per_user ?? null,
        discount_percentage: (coupon as any).discount_percentage ?? null,
        discount_description: (coupon as any).discount_description ?? null,
        total: 0,
        available: 0,
        assigned: 0,
        used: 0,
        assignedCoupons: [],
      }
    }

    campaignMap[key].total++
    if (!coupon.is_assigned) {
      campaignMap[key].available++
    } else {
      campaignMap[key].assigned++
      if (coupon.used_at) campaignMap[key].used++
      const userId = (coupon as any).user_id as string
      campaignMap[key].assignedCoupons.push({
        id: coupon.id,
        coupon_code: (coupon as any).coupon_code,
        user_id: userId,
        user_email: userEmailMap[userId] ?? userId,
        assigned_at: (coupon as any).assigned_at ?? null,
        used_at: coupon.used_at ?? null,
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

      <CouponsManager campaigns={campaigns} partners={partners ?? []} />
    </div>
  )
}
