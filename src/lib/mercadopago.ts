import { MercadoPagoConfig, Preference, Payment, PreApproval } from 'mercadopago'
import { prisma } from '@/lib/db'

// Cliente de Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  options: {
    timeout: 5000,
  },
})

export const preferenceClient = new Preference(client)
export const paymentClient = new Payment(client)
export const preApprovalClient = new PreApproval(client)

export type SubscriptionPlan = {
  id: string
  title: string
  description: string
  price: number
  currency: string
  taxExempt: boolean
  isActive: boolean
  shopifyVariantId: string
  // Kit de bienvenida (bundle con accesorios de obsequio) — se usa solo en la
  // primera orden de usuarios nuevos. Si no está definido, se usa shopifyVariantId.
  shopifyFirstOrderVariantId?: string
}

// Fallbacks usados solo si la tabla subscription_plan_configs aún no existe
// o no tiene registro para un slug. La fuente de verdad es la base de datos.
const FALLBACK_PLANS: Record<string, SubscriptionPlan> = {
  'happy-blend': {
    id: 'happy-blend',
    title: 'Happy Blend',
    description: 'Suscripción mensual Happy Blend + acceso a la plataforma Happy Sapiens',
    price: 159800,
    currency: 'COP',
    taxExempt: true,
    isActive: true,
    shopifyVariantId: process.env.SHOPIFY_VARIANT_HAPPY_BLEND ?? '',
    shopifyFirstOrderVariantId: process.env.SHOPIFY_VARIANT_HAPPY_BLEND_KIT,
  },
  'happy-on': {
    id: 'happy-on',
    title: 'Happy On',
    description: 'Suscripción mensual Happy On + acceso a la plataforma Happy Sapiens',
    price: 102000,
    currency: 'COP',
    taxExempt: false,
    isActive: true,
    shopifyVariantId: process.env.SHOPIFY_VARIANT_HAPPY_ON ?? '',
    shopifyFirstOrderVariantId: process.env.SHOPIFY_VARIANT_HAPPY_ON_KIT,
  },
  'happy-off': {
    id: 'happy-off',
    title: 'Happy Off',
    description: 'Suscripción mensual Happy Off + acceso a la plataforma Happy Sapiens',
    price: 102000,
    currency: 'COP',
    taxExempt: false,
    isActive: true,
    shopifyVariantId: process.env.SHOPIFY_VARIANT_HAPPY_OFF ?? '',
    shopifyFirstOrderVariantId: process.env.SHOPIFY_VARIANT_HAPPY_OFF_KIT,
  },
}

type PlanConfigRow = {
  slug: string
  title: string
  description: string
  price: { toNumber(): number } | number
  currency: string
  taxExempt: boolean
  isActive: boolean
  shopifyVariantId: string | null
  shopifyFirstOrderVariantId: string | null
}

function rowToPlan(row: PlanConfigRow): SubscriptionPlan {
  const fallback = FALLBACK_PLANS[row.slug]
  const price = typeof row.price === 'number' ? row.price : row.price.toNumber()
  return {
    id: row.slug,
    title: row.title,
    description: row.description,
    price,
    currency: row.currency,
    taxExempt: row.taxExempt,
    isActive: row.isActive,
    shopifyVariantId: row.shopifyVariantId || fallback?.shopifyVariantId || '',
    shopifyFirstOrderVariantId:
      row.shopifyFirstOrderVariantId || fallback?.shopifyFirstOrderVariantId || undefined,
  }
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const rows = await prisma.subscriptionPlanConfig.findMany({
      orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
    })
    if (rows.length === 0) return Object.values(FALLBACK_PLANS)
    return rows.map(rowToPlan)
  } catch (err) {
    console.error('getSubscriptionPlans: fallback to defaults', err)
    return Object.values(FALLBACK_PLANS)
  }
}

export async function getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const all = await getSubscriptionPlans()
  return all.filter((p) => p.isActive)
}

export async function getSubscriptionPlansMap(): Promise<Record<string, SubscriptionPlan>> {
  const list = await getSubscriptionPlans()
  return list.reduce<Record<string, SubscriptionPlan>>((acc, plan) => {
    acc[plan.id] = plan
    return acc
  }, {})
}

export async function getSubscriptionPlan(slug: string): Promise<SubscriptionPlan | null> {
  try {
    const row = await prisma.subscriptionPlanConfig.findUnique({ where: { slug } })
    if (row) return rowToPlan(row)
  } catch (err) {
    console.error(`getSubscriptionPlan(${slug}): fallback to defaults`, err)
  }
  return FALLBACK_PLANS[slug] ?? null
}

// Helper para calcular fecha de expiración de suscripción
export function calculateSubscriptionEndDate(startDate: Date = new Date()): Date {
  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + 1) // Sumar 1 mes
  return endDate
}

// Helper para verificar si una suscripción está activa
export function isSubscriptionActive(endDate: string | null): boolean {
  if (!endDate) return false
  return new Date(endDate) > new Date()
}
