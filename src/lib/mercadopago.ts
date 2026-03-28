import { MercadoPagoConfig, Preference, Payment, PreApproval } from 'mercadopago'

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
  shopifyVariantId: string
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  'happy-blend': {
    id: 'happy-blend',
    title: 'Happy Blend',
    description: 'Suscripción mensual Happy Blend + acceso a la plataforma Happy Sapiens',
    price: 1600,
    currency: 'COP',
    shopifyVariantId: process.env.SHOPIFY_VARIANT_HAPPY_BLEND!,
  },
  'happy-on': {
    id: 'happy-on',
    title: 'Happy On',
    description: 'Suscripción mensual Happy On + acceso a la plataforma Happy Sapiens',
    price: 1600,
    currency: 'COP',
    shopifyVariantId: process.env.SHOPIFY_VARIANT_HAPPY_ON!,
  },
  'happy-off': {
    id: 'happy-off',
    title: 'Happy Off',
    description: 'Suscripción mensual Happy Off + acceso a la plataforma Happy Sapiens',
    price: 1600,
    currency: 'COP',
    shopifyVariantId: process.env.SHOPIFY_VARIANT_HAPPY_OFF!,
  },
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
