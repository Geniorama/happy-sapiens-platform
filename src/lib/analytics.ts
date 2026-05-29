/**
 * Eventos de analítica (Google Tag Manager / dataLayer).
 *
 * Centraliza los nombres y esquemas de eventos para mantenerlos consistentes.
 * Los eventos de ecommerce siguen el formato estándar de GA4 para facilitar el
 * mapeo a conversiones en GTM / Google Ads.
 *
 * Solo funciona en componentes cliente ("use client"); `sendGTMEvent` empuja al
 * dataLayer del navegador. Si `NEXT_PUBLIC_GTM_ID` no está configurado, GTM no
 * carga y los push quedan en un dataLayer inerte (no rompe nada).
 */
import { sendGTMEvent } from "@next/third-parties/google"

const PRICE = Number(process.env.NEXT_PUBLIC_SUBSCRIPTION_PRICE) || undefined
const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "COP"

/**
 * GA4 recomienda limpiar el objeto `ecommerce` previo antes de cada evento de
 * ecommerce, para que no se arrastren datos entre eventos.
 */
function clearEcommerce() {
  sendGTMEvent({ ecommerce: null })
}

/** Inicio de checkout de suscripción (antes del redirect a Mercado Pago). */
export function trackBeginCheckout(params: {
  planId: string
  planTitle: string
  price?: number
  referralCode?: string | null
}) {
  const value = params.price ?? PRICE
  clearEcommerce()
  sendGTMEvent({
    event: "begin_checkout",
    referral_code: params.referralCode || undefined,
    ecommerce: {
      currency: CURRENCY,
      value,
      items: [
        {
          item_id: params.planId,
          item_name: params.planTitle,
          price: value,
          quantity: 1,
        },
      ],
    },
  })
}

/** Compra/suscripción confirmada (página de pago exitoso). */
export function trackPurchase(params: { transactionId?: string; value?: number }) {
  const value = params.value ?? PRICE
  clearEcommerce()
  sendGTMEvent({
    event: "purchase",
    ecommerce: {
      transaction_id: params.transactionId,
      currency: CURRENCY,
      value,
      items: [
        {
          item_name: "Suscripción Happy Sapiens",
          price: value,
          quantity: 1,
        },
      ],
    },
  })
}

/** Inicio de sesión exitoso. `method`: "email" | "google" | "strava". */
export function trackLogin(method: string) {
  sendGTMEvent({ event: "login", method })
}

/** Cita con coach agendada exitosamente. */
export function trackAppointmentBooked(params: {
  coachId: string
  coachName: string | null
  date: string
  time: string
  durationMinutes: number
  pointsEarned?: number
}) {
  sendGTMEvent({
    event: "appointment_booked",
    coach_id: params.coachId,
    coach_name: params.coachName || undefined,
    appointment_date: params.date,
    appointment_time: params.time,
    duration_minutes: params.durationMinutes,
    points_earned: params.pointsEarned,
  })
}

/** Cupón de aliado obtenido. */
export function trackClaimCoupon(params: {
  partnerId: string
  partnerName: string
  couponTitle?: string | null
  discountPercentage?: number | null
}) {
  sendGTMEvent({
    event: "claim_coupon",
    partner_id: params.partnerId,
    partner_name: params.partnerName,
    coupon_title: params.couponTitle || undefined,
    discount_percentage: params.discountPercentage ?? undefined,
  })
}
