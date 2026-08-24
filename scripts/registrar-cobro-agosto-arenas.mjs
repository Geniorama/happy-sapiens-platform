/**
 * Registra el cobro recurrente de agosto de arenas_sergio@hotmail.com que el
 * webhook nunca guardó (incidencia 2026-08-14: el pago se acreditó en MercadoPago
 * pero `handlePayment` se desvió al flujo de alta y cortó antes de registrarlo).
 *
 * Solo inserta la fila en `payment_transactions`. NO crea el pedido en Shopify:
 * eso se hace después desde /admin/aprovisionamiento → "Crear pedido", que deja
 * traza del admin que lo ejecutó.
 *
 * Uso:
 *   npx dotenv -e .env.local -- node scripts/registrar-cobro-agosto-arenas.mjs --dry
 *   npx dotenv -e .env.local -- node scripts/registrar-cobro-agosto-arenas.mjs --apply
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const MP_PAYMENT_ID = '172947289763'
const EMAIL = 'arenas_sergio@hotmail.com'
const PREAPPROVAL_ID = '9fee5f3672cc4d49b1bb3ab61ae7221f'

// Valores tomados de la API de MercadoPago (GET /v1/payments/172947289763):
// status approved / accredited, $149.000 COP, date_approved 2026-08-14T17:10:35-04:00.
const PAYMENT = {
  status: 'approved',
  amount: 149000,
  currency: 'COP',
  paymentMethod: 'credit_card',
  paymentDate: new Date('2026-08-14T21:10:35.000Z'),
}

const apply = process.argv.includes('--apply')

const subscription = await prisma.subscription.findUnique({
  where: { mpPreapprovalId: PREAPPROVAL_ID },
  include: { user: { select: { id: true, email: true } } },
})

if (!subscription) {
  console.error(`No existe la suscripción con preapproval ${PREAPPROVAL_ID}. Abortado.`)
  process.exit(1)
}
if (subscription.user.email !== EMAIL) {
  console.error(`La suscripción pertenece a ${subscription.user.email}, no a ${EMAIL}. Abortado.`)
  process.exit(1)
}

const existing = await prisma.paymentTransaction.findUnique({
  where: { mercadopagoPaymentId: MP_PAYMENT_ID },
})
if (existing) {
  console.log(`El cobro ${MP_PAYMENT_ID} ya está registrado (${existing.id}). No hay nada que hacer.`)
  await prisma.$disconnect()
  process.exit(0)
}

const data = {
  userId: subscription.user.id,
  subscriptionRowId: subscription.id,
  mercadopagoPaymentId: MP_PAYMENT_ID,
  ...PAYMENT,
}

console.log('Fila a insertar en payment_transactions:')
console.log(JSON.stringify(data, null, 2))

if (!apply) {
  console.log('\nSimulación: no se escribió nada. Repite con --apply para insertarla.')
  await prisma.$disconnect()
  process.exit(0)
}

const created = await prisma.paymentTransaction.create({ data })
console.log(`\nCobro registrado: ${created.id}`)
console.log('Siguiente paso: /admin/aprovisionamiento → cobros recurrentes → "Crear pedido" en ' + MP_PAYMENT_ID)

await prisma.$disconnect()
