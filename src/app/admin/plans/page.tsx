import { prisma } from "@/lib/db"
import { PlansManager } from "@/components/admin/plans-manager"

export default async function AdminPlansPage() {
  const [rows, subCounts, userCounts] = await Promise.all([
    prisma.subscriptionPlanConfig.findMany({
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    }),
    // `subscriptions` es la fuente autoritativa (un usuario puede tener varias);
    // `users.subscription_product` es el espejo de la primaria. Se toma el mayor
    // de los dos para no ofrecer borrar un plan que todavía tiene suscriptores.
    prisma.subscription.groupBy({
      by: ["product"],
      where: { product: { not: null } },
      _count: { _all: true },
    }),
    prisma.user.groupBy({
      by: ["subscriptionProduct"],
      where: { subscriptionProduct: { not: null } },
      _count: { _all: true },
    }),
  ])

  const countBySlug = new Map<string, number>()
  for (const c of subCounts) {
    countBySlug.set(c.product!, c._count._all)
  }
  for (const c of userCounts) {
    const slug = c.subscriptionProduct!
    countBySlug.set(slug, Math.max(countBySlug.get(slug) ?? 0, c._count._all))
  }

  const plans = rows.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    price: Number(p.price),
    currency: p.currency,
    taxExempt: p.taxExempt,
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    shopifyVariantId: p.shopifyVariantId,
    shopifyFirstOrderVariantId: p.shopifyFirstOrderVariantId,
    subscriberCount: countBySlug.get(p.slug) ?? 0,
  }))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl uppercase font-heading text-zinc-900 mb-1">
          Planes de suscripción
        </h1>
        <p className="text-sm text-zinc-500">
          Crea planes nuevos y edita precios, moneda, exención de IVA e IDs de variante
          de Shopify para cada plan.
        </p>
      </div>

      <PlansManager plans={plans} />
    </div>
  )
}
