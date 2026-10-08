/**
 * Registra los cobros recurrentes que el webhook descartó en silencio
 * (incidencia 2026-09: `handlePayment` buscaba el preapproval en
 * `payment.subscription_id`, que MercadoPago no envía, y el cobro caía en la rama
 * de pago único legacy).
 *
 * Cada cobro se valida contra la API de MercadoPago antes de escribir: debe estar
 * aprobado y pertenecer al preapproval de la suscripción del usuario indicado.
 *
 * Solo inserta la fila en `payment_transactions`. NO crea el pedido en Shopify:
 * eso se hace después desde /admin/aprovisionamiento → "Crear pedido", que deja
 * traza del admin que lo ejecutó.
 *
 * Uso:
 *   npx dotenv -e .env.local -- node scripts/registrar-cobros-perdidos-2026-09.mjs --dry
 *   npx dotenv -e .env.local -- node scripts/registrar-cobros-perdidos-2026-09.mjs --apply
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CHARGES = [
  { email: 'arenas_sergio@hotmail.com', preapprovalId: '9fee5f3672cc4d49b1bb3ab61ae7221f', mpPaymentId: '179025101176' },
  { email: 'jshool@gmail.com', preapprovalId: '48b3a32986fc4f9f9c3ee92c656dd3f8', mpPaymentId: '178442500039' },
  { email: 'saviska@hotmail.com', preapprovalId: '773a4806dffa411cad24322ed269acbe', mpPaymentId: '183054613370' },
]

const apply = process.argv.includes('--apply')

async function getMpPayment(id) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
  })
  if (!res.ok) throw new Error(`MercadoPago respondió ${res.status} para el pago ${id}`)
  return res.json()
}

let failed = false

for (const { email, preapprovalId, mpPaymentId } of CHARGES) {
  console.log(`\n— ${email} · pago ${mpPaymentId}`)

  const subscription = await prisma.subscription.findUnique({
    where: { mpPreapprovalId: preapprovalId },
    include: { user: { select: { id: true, email: true } } },
  })
  if (!subscription) {
    console.error(`  No existe la suscripción con preapproval ${preapprovalId}. Omitido.`)
    failed = true
    continue
  }
  if (subscription.user.email !== email) {
    console.error(`  La suscripción pertenece a ${subscription.user.email}, no a ${email}. Omitido.`)
    failed = true
    continue
  }

  const existing = await prisma.paymentTransaction.findUnique({
    where: { mercadopagoPaymentId: mpPaymentId },
  })
  if (existing) {
    console.log(`  Ya está registrado (${existing.id}). No hay nada que hacer.`)
    continue
  }

  const payment = await getMpPayment(mpPaymentId)
  const paymentPreapproval =
    payment.point_of_interaction?.transaction_data?.subscription_id || payment.metadata?.preapproval_id
  if (payment.status !== 'approved') {
    console.error(`  El pago está en estado ${payment.status}, no approved. Omitido.`)
    failed = true
    continue
  }
  if (paymentPreapproval !== preapprovalId) {
    console.error(`  El pago pertenece al preapproval ${paymentPreapproval}, no a ${preapprovalId}. Omitido.`)
    failed = true
    continue
  }

  const data = {
    userId: subscription.userId,
    subscriptionRowId: subscription.id,
    mercadopagoPaymentId: mpPaymentId,
    status: payment.status,
    amount: payment.transaction_amount,
    currency: payment.currency_id ?? 'COP',
    paymentMethod: payment.payment_type_id ?? null,
    paymentDate: new Date(payment.date_approved),
  }
  console.log('  Fila a insertar:', JSON.stringify(data))

  if (!apply) continue

  const created = await prisma.paymentTransaction.create({ data })
  console.log(`  Insertado: ${created.id}`)
}

if (!apply) console.log('\nSimulación (--dry). Use --apply para escribir.')

await prisma.$disconnect()
process.exit(failed ? 1 : 0)
