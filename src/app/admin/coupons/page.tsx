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
      is_assigned,
      used_at,
      partner:partners!inner(id, name)
    `)
    .order("created_at", { ascending: false })

  // Group coupons into campaigns
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
      total: number
      available: number
      assigned: number
      used: number
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
        total: 0,
        available: 0,
        assigned: 0,
        used: 0,
      }
    }

    campaignMap[key].total++
    if (!coupon.is_assigned) {
      campaignMap[key].available++
    } else {
      campaignMap[key].assigned++
      if (coupon.used_at) campaignMap[key].used++
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
