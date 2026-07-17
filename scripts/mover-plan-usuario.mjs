import { PrismaClient } from '@prisma/client'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { parseArgs } from 'node:util'

// Mueve a UN usuario de un plan de suscripción a otro, corrigiendo tanto el
// snapshot en BD como el monto recurrente real en Mercado Pago (PreApproval).
//
// Uso (dry-run, NO aplica cambios):
//   dotenv -e .env.local -- node scripts/mover-plan-usuario.mjs --email cliente@correo.com --plan happy-blend
//
// Para aplicar de verdad, agregá --apply:
//   dotenv -e .env.local -- node scripts/mover-plan-usuario.mjs --email cliente@correo.com --plan happy-blend --apply

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    plan: { type: 'string' }, // slug destino, p.ej. happy-blend
    apply: { type: 'boolean', default: false },
  },
})

if (!values.email || !values.plan) {
  console.error('Faltan argumentos.')
  console.error('Uso: dotenv -e .env.local -- node scripts/mover-plan-usuario.mjs --email cliente@correo.com --plan happy-blend [--apply]')
  process.exit(1)
}

// Fallbacks alineados con src/lib/mercadopago.ts (fuente de verdad: la tabla
// subscription_plan_configs; esto solo cubre variant faltante / plan sin fila).
const VARIANT_ENV = {
  'happy-blend': process.env.SHOPIFY_VARIANT_HAPPY_BLEND,
  'happy-on': process.env.SHOPIFY_VARIANT_HAPPY_ON,
  'happy-off': process.env.SHOPIFY_VARIANT_HAPPY_OFF,
}

const prisma = new PrismaClient()

const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN
if (!mpToken) {
  console.error('Falta MERCADOPAGO_ACCESS_TOKEN en el entorno (¿corriste con dotenv -e .env.local?).')
  process.exit(1)
}
const preApprovalClient = new PreApproval(
  new MercadoPagoConfig({ accessToken: mpToken, options: { timeout: 5000 } })
)

// Estados cuyo cobro recurrente sigue vigente en MP (igual que admin/plans/actions.ts)
const PROPAGATABLE_STATUSES = ['active', 'paused', 'past_due']

const user = await prisma.user.findUnique({
  where: { email: values.email },
  select: {
    id: true,
    email: true,
    subscriptionId: true,
    subscriptionStatus: true,
    subscriptionProduct: true,
    subscriptionPrice: true,
    subscriptionVariantId: true,
    subscriptionTaxExempt: true,
  },
})

if (!user) {
  console.error(`No existe usuario con email ${values.email}`)
  process.exit(1)
}
if (!user.subscriptionId) {
  console.error('El usuario no tiene subscriptionId (PreApproval de Mercado Pago). No hay recurrencia que actualizar.')
  process.exit(1)
}
if (!PROPAGATABLE_STATUSES.includes(user.subscriptionStatus ?? '')) {
  console.error(`El estado de la suscripción es "${user.subscriptionStatus}" y no se le cobra en MP. Abortando para evitar inconsistencias.`)
  process.exit(1)
}

const plan = await prisma.subscriptionPlanConfig.findUnique({ where: { slug: values.plan } })
if (!plan) {
  console.error(`No existe el plan destino "${values.plan}" en subscription_plan_configs.`)
  process.exit(1)
}
if (!plan.isActive) {
  console.warn(`Aviso: el plan destino "${values.plan}" está marcado como inactivo.`)
}

const targetPrice = Number(plan.price)
const targetVariant = plan.shopifyVariantId || VARIANT_ENV[values.plan] || null
const targetCurrency = plan.currency

console.log('\n=== Cambio de plan de usuario ===')
console.log(`Usuario:        ${user.email} (${user.id})`)
console.log(`Suscripción MP: ${user.subscriptionId}  [${user.subscriptionStatus}]`)
console.log('')
console.log('                     ANTES            ->  DESPUÉS')
console.log(`Producto:            ${user.subscriptionProduct ?? '—'}  ->  ${plan.slug}`)
console.log(`Precio recurrente:   ${user.subscriptionPrice ?? '—'}  ->  ${targetPrice} ${targetCurrency}`)
console.log(`Exento IVA:          ${user.subscriptionTaxExempt}  ->  ${plan.taxExempt}`)
console.log(`Variant Shopify:     ${user.subscriptionVariantId ?? '—'}  ->  ${targetVariant ?? '—'}`)
console.log('')

if (!targetVariant) {
  console.warn('⚠  No se resolvió el variant de Shopify para el plan destino. La próxima orden podría fallar. Configurá plan.shopifyVariantId o la env correspondiente.')
}

if (!values.apply) {
  console.log('DRY-RUN: no se aplicó ningún cambio. Volvé a correr con --apply para ejecutarlo.')
  await prisma.$disconnect()
  process.exit(0)
}

// ORDEN IMPORTANTE: primero la BD, luego Mercado Pago.
//
// Al actualizar el PreApproval, MP dispara un webhook subscription_preapproval
// que corre provisionFromPreApproval(). Cuando ya no hay pending_checkout (clientes
// viejos), esa función deriva el producto desde la PROPIA fila del usuario
// (userBySubscription.subscriptionProduct) y reescribe producto/variant/IVA. Si
// actualizáramos MP antes que la BD, el webhook leería el producto viejo y
// revertiría el cambio (dejando el precio nuevo pero el producto viejo). Al dejar
// la fila ya corregida ANTES de tocar MP, el webhook re-deriva desde el valor
// correcto y todo queda consistente.

// 1) Actualizar el snapshot local primero
console.log('→ Actualizando base de datos...')
await prisma.user.update({
  where: { id: user.id },
  data: {
    subscriptionProduct: plan.slug,
    subscriptionPrice: targetPrice,
    subscriptionTaxExempt: plan.taxExempt,
    subscriptionVariantId: targetVariant,
    subscriptionSyncedAt: new Date(),
  },
})
console.log('  ✓ Base de datos actualizada.')

// 2) Actualizar el monto recurrente REAL en Mercado Pago.
// Si MP falla, revertimos la BD para no dejar el panel/Shopify desalineados del
// cobro real.
console.log('→ Actualizando PreApproval en Mercado Pago...')
try {
  await preApprovalClient.update({
    id: user.subscriptionId,
    body: {
      reason: `${plan.title} - Happy Sapiens`,
      auto_recurring: {
        transaction_amount: targetPrice,
        currency_id: targetCurrency,
      },
    },
  })
} catch (err) {
  console.error('  ✗ Falló Mercado Pago. Revirtiendo la base de datos...')
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionProduct: user.subscriptionProduct,
      subscriptionPrice: user.subscriptionPrice,
      subscriptionTaxExempt: user.subscriptionTaxExempt,
      subscriptionVariantId: user.subscriptionVariantId,
      subscriptionSyncedAt: new Date(),
    },
  })
  console.error('  ✓ Base de datos revertida. No se aplicó ningún cambio.')
  throw err
}
console.log('  ✓ Mercado Pago actualizado.')

// 3) Dejar traza en system_logs
await prisma.systemLog.create({
  data: {
    actorEmail: 'script:mover-plan-usuario',
    action: 'subscription.plan_changed',
    entityType: 'subscription',
    entityId: user.subscriptionId,
    metadata: {
      userId: user.id,
      email: user.email,
      before: {
        product: user.subscriptionProduct,
        price: user.subscriptionPrice ? Number(user.subscriptionPrice) : null,
        taxExempt: user.subscriptionTaxExempt,
        variantId: user.subscriptionVariantId,
      },
      after: {
        product: plan.slug,
        price: targetPrice,
        taxExempt: plan.taxExempt,
        variantId: targetVariant,
      },
    },
  },
})

console.log('\n✅ Listo. La próxima renovación en Mercado Pago cobrará el nuevo valor.')
await prisma.$disconnect()
