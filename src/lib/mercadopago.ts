import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'

// Cliente de Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  options: {
    timeout: 5000,
  },
})

export const preferenceClient = new Preference(client)
export const paymentClient = new Payment(client)

// Configuración del plan de suscripción
export const SUBSCRIPTION_PLAN = {
  title: 'Suscripción Mensual - Happy Sapiens',
  description: 'Acceso completo a la plataforma Happy Sapiens',
  price: parseFloat(process.env.NEXT_PUBLIC_SUBSCRIPTION_PRICE || '9.99'),
  currency: process.env.NEXT_PUBLIC_CURRENCY || 'ARS',
  duration: 'monthly', // mensual
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
