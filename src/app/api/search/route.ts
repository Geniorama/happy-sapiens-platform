import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get("q")?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ coaches: [], partners: [], coupons: [] })
  }

  const pattern = `%${q}%`

  const [coachesRes, partnersRes, couponsRes] = await Promise.all([
    // Coaches activos
    supabaseAdmin
      .from("users")
      .select("id, name, specialization, image")
      .eq("role", "coach")
      .eq("is_coach_active", true)
      .or(`name.ilike.${pattern},specialization.ilike.${pattern},bio.ilike.${pattern}`)
      .order("name")
      .limit(6),

    // Aliados activos
    supabaseAdmin
      .from("partners")
      .select("id, name, category, logo_url, discount_percentage, discount_description")
      .eq("is_active", true)
      .or(`name.ilike.${pattern},category.ilike.${pattern},discount_description.ilike.${pattern}`)
      .order("name")
      .limit(6),

    // Cupones disponibles
    supabaseAdmin
      .from("coupons")
      .select(`
        id, title, description, cover_image_url, discount_percentage, discount_description,
        partner:partners!inner(id, name, logo_url, is_active)
      `)
      .eq("is_assigned", false)
      .eq("partner.is_active", true)
      .or(`title.ilike.${pattern},description.ilike.${pattern}`)
      .order("created_at", { ascending: false })
      .limit(6),
  ])

  return NextResponse.json({
    coaches: coachesRes.data || [],
    partners: partnersRes.data || [],
    coupons: couponsRes.data || [],
  })
}
