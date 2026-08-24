/**
 * Completa el historial de arenas_sergio@hotmail.com con su primer cobro (julio),
 * que nunca se registró porque `provisionFromPreApproval` no escribe en
 * `payment_transactions` — ningún alta guarda su cobro inicial.
 *
 * Hace dos cosas, en este orden (importa):
 *   1. Enlaza el despacho de la primera entrega (orden Shopify #1070) a la fila
 *      de suscripción. Quedó en NULL porque el despacho es del 14-jul y la fila
 *      recién se creó el 14-ago.
 *   2. Inserta el cobro de julio en `payment_transactions`.
 *
 * Sin el paso 1, el panel de aprovisionamiento no puede ver que ese cobro ya se
 * despachó y lo mostraría como "pedido faltante", invitando a duplicar la #1070.
 *
 * NO crea ni toca nada en Shopify.
 *
 * Uso:
 *   npx dotenv -e .env.local -- node scripts/registrar-cobro-julio-arenas.mjs --dry
 *   npx dotenv -e .env.local -- node scripts/registrar-cobro-julio-arenas.mjs --apply
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const EMAIL = 'arenas_sergio@hotmail.com'
const PREAPPROVAL_ID = '9fee5f3672cc4d49b1bb3ab61ae7221f'
const DISPATCH_KEY = `preapproval:${PREAPPROVAL_ID}`
const MP_PAYMENT_ID = '168720697214'

// Datos de MercadoPago (GET /authorized_payments/7030026883, el cobro de julio):
// payment 168720697214 approved/accredited, $149.000 COP, debit_date
// 2026-07-14T16:06:53-04:00. El endpoint /v1/payments/168720697214 responde 404
// con el token disponible, así que `date_approved` exacto no se pudo leer y se
// usa el debit_date — que además es el ancla del ciclo (coincide al segundo con
// el end_date de la suscripción).
// `paymentMethod` se infiere del payment_method_id "card" que devuelve MP y del
// cobro de agosto de esta misma suscripción, que sí llegó como "credit_card".
const PAYMENT = {
  status: 'approved',
  amount: 149000,
  currency: 'COP',
  paymentMethod: 'credit_card',
  paymentDate: new Date('2026-07-14T20:06:53.000Z'),
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

// ── Paso 1: enlazar el despacho de la primera entrega ────────────────────────

const dispatch = await prisma.shopifyOrderDispatch.findUnique({ where: { idempotencyKey: DISPATCH_KEY } })
if (!dispatch) {
  console.error(`No existe el despacho ${DISPATCH_KEY}. Abortado.`)
  process.exit(1)
}

if (dispatch.subscriptionRowId === subscription.id) {
  console.log(`1. Despacho #${dispatch.shopifyOrderNumber} ya estaba enlazado. Sin cambios.`)
} else if (dispatch.subscriptionRowId) {
  console.error(
    `1. El despacho #${dispatch.shopifyOrderNumber} ya apunta a otra suscripción (${dispatch.subscriptionRowId}). Abortado.`
  )
  process.exit(1)
} else {
  console.log(`1. Enlazar despacho #${dispatch.shopifyOrderNumber} (${DISPATCH_KEY}) → suscripción ${subscription.id}`)
  if (apply) {
    await prisma.shopifyOrderDispatch.update({
      where: { idempotencyKey: DISPATCH_KEY },
      data: { subscriptionRowId: subscription.id },
    })
    console.log('   enlazado.')
  }
}

// ── Paso 2: registrar el cobro de julio ──────────────────────────────────────

const existing = await prisma.paymentTransaction.findUnique({
  where: { mercadopagoPaymentId: MP_PAYMENT_ID },
})

if (existing) {
  console.log(`2. El cobro ${MP_PAYMENT_ID} ya está registrado (${existing.id}). Sin cambios.`)
} else {
  const data = {
    userId: subscription.user.id,
    subscriptionRowId: subscription.id,
    mercadopagoPaymentId: MP_PAYMENT_ID,
    ...PAYMENT,
  }
  console.log('2. Insertar en payment_transactions:')
  console.log(JSON.stringify(data, null, 2).split('\n').map((l) => '   ' + l).join('\n'))
  if (apply) {
    const created = await prisma.paymentTransaction.create({ data })
    console.log(`   registrado: ${created.id}`)
  }
}

if (!apply) console.log('\nSimulación: no se escribió nada. Repite con --apply.')

await prisma.$disconnect()
