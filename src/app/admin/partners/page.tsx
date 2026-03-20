import { supabaseAdmin } from "@/lib/supabase"
import { PartnersManager } from "@/components/admin/partners-manager"

export default async function AdminPartnersPage() {
  const [{ data: partners }, { data: categories }] = await Promise.all([
    supabaseAdmin
      .from("partners")
      .select("id, name, category, website_url, logo_url, cover_image_url, terms_and_conditions, is_active")
      .order("name"),
    supabaseAdmin
      .from("partner_categories")
      .select("id, slug, name")
      .order("name"),
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl uppercase font-heading text-zinc-900 mb-1">
          Marcas Aliadas
        </h1>
        <p className="text-sm text-zinc-500">
          Administra las marcas y sus beneficios para los usuarios
        </p>
      </div>

      <PartnersManager partners={partners ?? []} categories={categories ?? []} />
    </div>
  )
}
