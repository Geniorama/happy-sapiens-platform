// Remediación puntual: marcar como PAGADA una orden Shopify que quedó en
// "Pendiente" porque el paso 3 (POST transactions con gateway "Mercado Pago")
// falló (409 lock) al crearse y nunca se reintentó.
//
// La orden ya tiene una transacción `sale` PENDIENTE (gateway "manual") generada
// al completar el draft con payment_pending=true. Para liquidarla usamos la
// mutación GraphQL `orderMarkAsPaid`, que asienta esa transacción pendiente y deja
// la orden en `paid`. (Nota: el método de pago quedará como "manual", no
// "Mercado Pago" — es el trade-off aceptado para rescatar la orden ya asentada.)
//
// Idempotente: si la orden ya está `paid`, no hace nada salvo reconciliar la fila
// shopify_order_dispatches (limpia errorMessage y fija shopifyOrderNumber).
//
// Uso (con DATABASE_URL + SHOPIFY_SHOP_DOMAIN + SHOPIFY_ADMIN_API_TOKEN en el env):
//   node scripts/fix-shopify-order.mjs <shopifyOrderId>

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN
const TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN
const API_VERSION = '2026-01'
const orderId = process.argv[2]

if (!orderId) {
  console.error('Falta el orderId. Uso: node scripts/fix-shopify-order.mjs <shopifyOrderId>')
  process.exit(1)
}
if (!DOMAIN || !TOKEN) {
  console.error('Faltan SHOPIFY_SHOP_DOMAIN o SHOPIFY_ADMIN_API_TOKEN en el env.')
  process.exit(1)
}

const restHeaders = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN }
const restBase = `https://${DOMAIN}/admin/api/${API_VERSION}`
const gqlUrl = `${restBase}/graphql.json`

async function gql(query, variables) {
  const res = await fetch(gqlUrl, {
    method: 'POST',
    headers: restHeaders,
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })
  const json = await res.json()
  if (!res.ok || json.errors?.length) {
    throw new Error(`GraphQL error: ${res.status} ${JSON.stringify(json.errors ?? json)}`)
  }
  return json.data
}

// 1. Leer estado actual.
const before = await (
  await fetch(
    `${restBase}/orders/${orderId}.json?fields=id,order_number,financial_status,total_price,currency`,
    { headers: restHeaders, cache: 'no-store' }
  )
).json()
const order = before.order
console.log('Orden actual:', {
  order_number: order.order_number,
  financial_status: order.financial_status,
  total_price: order.total_price,
  currency: order.currency,
})

// 2. Marcar como pagada (si aún no lo está).
if (order.financial_status === 'paid') {
  console.log('La orden YA está `paid`. No se ejecuta orderMarkAsPaid.')
} else {
  const gid = `gid://shopify/Order/${orderId}`
  const data = await gql(
    `mutation orderMarkAsPaid($input: OrderMarkAsPaidInput!) {
      orderMarkAsPaid(input: $input) {
        order { id name displayFinancialStatus }
        userErrors { field message }
      }
    }`,
    { input: { id: gid } }
  )
  const result = data.orderMarkAsPaid
  if (result.userErrors?.length) {
    console.error('orderMarkAsPaid userErrors:', JSON.stringify(result.userErrors))
    await prisma.$disconnect()
    process.exit(1)
  }
  console.log('orderMarkAsPaid OK:', {
    name: result.order?.name,
    displayFinancialStatus: result.order?.displayFinancialStatus,
  })
}

// 3. Releer estado final y reconciliar la fila de dispatch.
const after = await (
  await fetch(
    `${restBase}/orders/${orderId}.json?fields=id,order_number,financial_status`,
    { headers: restHeaders, cache: 'no-store' }
  )
).json()
console.log('Estado final:', {
  order_number: after.order.order_number,
  financial_status: after.order.financial_status,
})

const updated = await prisma.shopifyOrderDispatch.updateMany({
  where: { shopifyOrderId: String(orderId) },
  data: { shopifyOrderNumber: after.order.order_number, errorMessage: null },
})
console.log(`Filas shopify_order_dispatches reconciliadas: ${updated.count}`)

await prisma.$disconnect()
