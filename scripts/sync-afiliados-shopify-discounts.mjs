// Backfill: crea en Shopify el código de descuento espejo (0%, solo tracking) de cada
// afiliado que ya existe en la base de datos. De aquí en adelante los afiliados nuevos
// o recién promovidos lo obtienen automáticamente (ver ensureAffiliateShopifyDiscount
// en src/lib/affiliate.ts); este script cubre los que quedaron atrás.
//
// El descuento espeja el referralCode (HSP-XXXXXX) del afiliado. El webhook orders/paid
// lo lee de order.discount_codes y abona la comisión. Es idempotente: si el código ya
// existe en Shopify, se reporta como "ya existía" y no se duplica.
//
// Requiere en el entorno: DATABASE_URL, SHOPIFY_SHOP_DOMAIN, SHOPIFY_ADMIN_API_TOKEN.
// El token debe tener el scope `write_discounts`.
//
// Uso:
//   # Local (carga .env.local):
//   npm run afiliados:sync-shopify
//   npm run afiliados:sync-shopify -- --dry-run   # solo lista, no crea nada
//
//   # En el servidor (env ya presente en el proceso):
//   node scripts/sync-afiliados-shopify-discounts.mjs
//   node scripts/sync-afiliados-shopify-discounts.mjs --dry-run

import { PrismaClient } from '@prisma/client'

const DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN
const TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN
const API_VERSION = '2026-01'

const DRY_RUN = process.argv.includes('--dry-run')
// Porcentaje del cupón. 0 = solo tracking (no altera el precio). Se puede sobrescribir
// con --percent=N, pero por defecto 0 igual que el hook automático.
const percentArg = process.argv.find((a) => a.startsWith('--percent='))
const PERCENT = percentArg ? Number(percentArg.split('=')[1]) : 0

if (!DOMAIN || !TOKEN) {
  console.error(
    'Faltan variables de entorno: SHOPIFY_SHOP_DOMAIN y/o SHOPIFY_ADMIN_API_TOKEN.'
  )
  process.exit(1)
}
if (!Number.isFinite(PERCENT) || PERCENT < 0 || PERCENT > 100) {
  console.error(`--percent inválido: ${PERCENT}. Debe estar entre 0 y 100.`)
  process.exit(1)
}

const prisma = new PrismaClient()

// Crea un código de descuento en Shopify. Idempotente: si ya existe, ok+alreadyExists.
async function createShopifyDiscountCode(code) {
  const res = await fetch(
    `https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': TOKEN,
      },
      body: JSON.stringify({
        query: `mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
          discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
            codeDiscountNode { id }
            userErrors { field code message }
          }
        }`,
        variables: {
          basicCodeDiscount: {
            title: `Afiliado ${code}`,
            code,
            startsAt: new Date().toISOString(),
            customerSelection: { all: true },
            customerGets: {
              value: { percentage: PERCENT / 100 },
              items: { all: true },
            },
            appliesOncePerCustomer: false,
            combinesWith: {
              orderDiscounts: true,
              productDiscounts: true,
              shippingDiscounts: true,
            },
          },
        },
      }),
    }
  )

  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status} ${res.statusText}` }
  }

  const json = await res.json()
  if (json.errors?.length) {
    return { ok: false, error: json.errors.map((e) => e.message).join('; ') }
  }

  const errors = json.data?.discountCodeBasicCreate?.userErrors ?? []
  if (errors.length) {
    const taken = errors.some(
      (e) => e.code === 'TAKEN' || /taken|exist|unique/i.test(e.message)
    )
    if (taken) return { ok: true, alreadyExists: true }
    return { ok: false, error: errors.map((e) => e.message).join('; ') }
  }

  return { ok: true }
}

const affiliates = await prisma.user.findMany({
  where: { role: 'afiliado' },
  select: { id: true, email: true, referralCode: true },
  orderBy: { createdAt: 'asc' },
})

console.log(
  `\n=== Sync descuentos Shopify para afiliados (${affiliates.length}) ===` +
    (DRY_RUN ? '  [DRY RUN]' : '') +
    `  cupón: ${PERCENT}%\n`
)

const summary = { created: 0, alreadyExisted: 0, noCode: 0, failed: 0 }

for (const a of affiliates) {
  const label = a.email ?? a.id
  if (!a.referralCode) {
    // Un afiliado sin referralCode es anómalo: reasignar el rol desde /admin/users lo
    // regenera (y crea el descuento). Este script no lo genera para no tocar la BD.
    console.warn(`⚠️  ${label}: sin referralCode — omitido (reasignar rol en /admin/users)`)
    summary.noCode++
    continue
  }

  if (DRY_RUN) {
    console.log(`•  ${label}: crearía descuento ${a.referralCode}`)
    continue
  }

  const res = await createShopifyDiscountCode(a.referralCode)
  if (res.ok && res.alreadyExists) {
    console.log(`=  ${label}: ${a.referralCode} ya existía`)
    summary.alreadyExisted++
  } else if (res.ok) {
    console.log(`✓  ${label}: ${a.referralCode} creado`)
    summary.created++
  } else {
    console.error(`✗  ${label}: ${a.referralCode} — ${res.error}`)
    summary.failed++
  }

  // Pausa breve para no saturar el límite de costo del GraphQL de Shopify.
  await new Promise((r) => setTimeout(r, 300))
}

console.log(
  `\n=== Resumen ===\n` +
    `  creados:        ${summary.created}\n` +
    `  ya existían:    ${summary.alreadyExisted}\n` +
    `  sin referralCode: ${summary.noCode}\n` +
    `  fallidos:       ${summary.failed}\n`
)

await prisma.$disconnect()
process.exit(summary.failed > 0 ? 1 : 0)
