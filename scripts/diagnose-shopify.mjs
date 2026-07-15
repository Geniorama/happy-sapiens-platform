// Diagnóstico: por qué un pedido quedó "Pendiente" en Shopify pese a pago aprobado en MP.
//
// Uso (en el servidor, con DATABASE_URL disponible):
//   node scripts/diagnose-shopify.mjs arenas_sergio@hotmail.com
//
// Muestra, para ese email:
//  - Las filas de shopify_order_dispatches (status + errorMessage = causa raíz literal)
//  - Los SystemLog de suscripción (shopify_order_error / created / skipped, etc.)

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const email = process.argv[2]

if (!email) {
  console.error('Falta el email. Uso: node scripts/diagnose-shopify.mjs <email>')
  process.exit(1)
}

const dispatches = await prisma.shopifyOrderDispatch.findMany({
  where: { email },
  orderBy: { createdAt: 'desc' },
})

console.log(`\n=== shopify_order_dispatches para ${email} (${dispatches.length}) ===`)
for (const d of dispatches) {
  console.log({
    idempotencyKey: d.idempotencyKey,
    status: d.status,
    shopifyOrderNumber: d.shopifyOrderNumber,
    errorMessage: d.errorMessage, // <-- causa raíz literal si el paso 3 (transacción) falló
    createdAt: d.createdAt,
  })
}

const logs = await prisma.systemLog.findMany({
  where: { actorEmail: email, entityType: 'subscription' },
  orderBy: { createdAt: 'desc' },
  take: 30,
})

console.log(`\n=== SystemLog (subscription) para ${email} (últimos ${logs.length}) ===`)
for (const l of logs) {
  console.log(l.createdAt.toISOString(), l.action, JSON.stringify(l.metadata))
}

await prisma.$disconnect()
