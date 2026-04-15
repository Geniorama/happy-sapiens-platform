import { prisma } from "@/lib/db"
import { PartnersManager } from "@/components/admin/partners-manager"

export default async function AdminPartnersPage() {
  const [partnerRows, categoryRows] = await Promise.all([
    prisma.partner.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        websiteUrl: true,
        discountPercentage: true,
        discountDescription: true,
        logoUrl: true,
        coverImageUrl: true,
        termsAndConditions: true,
        isActive: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.partnerCategory.findMany({
      select: { id: true, slug: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  const partners = partnerRows.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    website_url: p.websiteUrl,
    discount_percentage: p.discountPercentage,
    discount_description: p.discountDescription,
    logo_url: p.logoUrl,
    cover_image_url: p.coverImageUrl,
    terms_and_conditions: p.termsAndConditions,
    is_active: p.isActive ?? false,
  }))

  const categories = categoryRows.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
  }))

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

      <PartnersManager partners={partners} categories={categories} />
    </div>
  )
}
