import { prisma } from "@/lib/db"
import { PlansManager } from "@/components/admin/plans-manager"

export default async function AdminPlansPage() {
  const rows = await prisma.subscriptionPlanConfig.findMany({
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
  })

  const plans = rows.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    price: Number(p.price),
    currency: p.currency,
    taxExempt: p.taxExempt,
    isActive: p.isActive,
    shopifyVariantId: p.shopifyVariantId,
    shopifyFirstOrderVariantId: p.shopifyFirstOrderVariantId,
  }))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl uppercase font-heading text-zinc-900 mb-1">
          Planes de suscripción
        </h1>
        <p className="text-sm text-zinc-500">
          Edita precios, moneda, exención de IVA e IDs de variante de Shopify para cada plan.
        </p>
      </div>

      <PlansManager plans={plans} />
    </div>
  )
}
