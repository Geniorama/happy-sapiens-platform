const SHOPIFY_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN!
const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN!
const API_VERSION = "2026-01"
const API_URL = `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/graphql.json`

async function shopifyQuery<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`)
  }

  const { data, errors } = await response.json()

  if (errors?.length) {
    throw new Error(`Shopify GraphQL error: ${errors[0].message}`)
  }

  return data as T
}

// Crea un código de descuento en Shopify que espeja el código de un afiliado.
//
// Es un descuento de 0% (no altera el precio): existe solo para que el código del
// afiliado (HSP-XXXXXX) viaje dentro del pedido en `order.discount_codes`, ya que el
// checkout de Shopify no expone un campo de nota que el cliente pueda llenar. El
// webhook orders/paid lee ese código y abona la comisión.
//
// Idempotente: si el código ya existe en Shopify (re-ejecución o afiliado ya
// registrado) se considera OK. Requiere que el token de la app tenga scope
// `write_discounts`.
export async function createShopifyDiscountCode(
  code: string,
  { percentage = 0 }: { percentage?: number } = {}
): Promise<{ ok: boolean; alreadyExists?: boolean; error?: string }> {
  const data = await shopifyQuery<{
    discountCodeBasicCreate: {
      codeDiscountNode: { id: string } | null
      userErrors: { field: string[] | null; code: string | null; message: string }[]
    }
  }>(
    `mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
        codeDiscountNode { id }
        userErrors { field code message }
      }
    }`,
    {
      basicCodeDiscount: {
        title: `Afiliado ${code}`,
        code,
        startsAt: new Date().toISOString(),
        customerSelection: { all: true },
        customerGets: {
          // percentage es una fracción 0..1 (0.1 = 10%). 0 = solo tracking.
          value: { percentage: percentage / 100 },
          items: { all: true },
        },
        appliesOncePerCustomer: false,
        // Que se pueda combinar con otras promos: nunca debe bloquear un descuento real.
        combinesWith: { orderDiscounts: true, productDiscounts: true, shippingDiscounts: true },
      },
    }
  )

  const errors = data.discountCodeBasicCreate.userErrors ?? []
  if (errors.length) {
    // El código ya existe → idempotente, lo tratamos como éxito.
    const taken = errors.some(
      (e) => e.code === "TAKEN" || /taken|exist|unique/i.test(e.message)
    )
    if (taken) return { ok: true, alreadyExists: true }
    return { ok: false, error: errors.map((e) => e.message).join("; ") }
  }

  return { ok: true }
}

// Reintenta una request ante conflictos/lock transitorios de Shopify.
//
// Completar un draft order deja la orden brevemente bloqueada mientras Shopify la
// materializa desde el draft. Un POST de transacción (o un GET de la orden) que
// llega en ese instante choca con el lock y devuelve 409 con cuerpo vacío — y a
// veces un 5xx transitorio. No es un error permanente: reintentamos con backoff
// exponencial para que el lock se libere y el paso entre. Sin esto, un 409 dejaba
// la orden en `pending` de forma permanente (el dispatch queda idempotente y el
// webhook nunca la vuelve a tocar).
async function shopifyFetchWithRetry(
  url: string,
  init: RequestInit,
  { retries = 3, baseDelayMs = 600 }: { retries?: number; baseDelayMs?: number } = {}
): Promise<Response> {
  let lastRes: Response | null = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    let res: Response
    try {
      res = await fetch(url, init)
    } catch (err) {
      // Error de red: reintentar mientras queden intentos.
      if (attempt === retries) throw err
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt))
      continue
    }
    // 409 (lock/conflicto de la orden recién creada) o 5xx transitorio → reintentar.
    if ((res.status === 409 || res.status >= 500) && attempt < retries) {
      lastRes = res
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt))
      continue
    }
    return res
  }
  return lastRes as Response
}

// Buscar cliente de Shopify por email
export async function getShopifyCustomerByEmail(email: string) {
  const data = await shopifyQuery<{
    customers: { edges: { node: { id: string; email: string; tags: string[] } }[] }
  }>(
    `query getCustomerByEmail($query: String!) {
      customers(first: 1, query: $query) {
        edges {
          node {
            id
            email
            tags
          }
        }
      }
    }`,
    { query: `email:${email}` }
  )

  return data.customers.edges[0]?.node ?? null
}

// Obtener cliente de Shopify por ID numérico (viene del webhook)
export async function getShopifyCustomerById(numericId: number) {
  const gid = `gid://shopify/Customer/${numericId}`

  const data = await shopifyQuery<{
    customer: { id: string; email: string; firstName: string; lastName: string; tags: string[] } | null
  }>(
    `query getCustomerById($id: ID!) {
      customer(id: $id) {
        id
        email
        firstName
        lastName
        tags
      }
    }`,
    { id: gid }
  )

  return data.customer
}

// Error lanzado cuando la orden ya se creó en Shopify pero falló un paso
// posterior (registrar el pago o leer el order_number). Carga el orderId para que
// el despacho confirme la fila como creada y no la borre (evita duplicar la orden).
export class ShopifyPostCreateError extends Error {
  shopifyOrderId: number
  constructor(shopifyOrderId: number, detail: string) {
    super(`Orden Shopify ${shopifyOrderId} creada, pero falló un paso posterior: ${detail}`)
    this.name = 'ShopifyPostCreateError'
    this.shopifyOrderId = shopifyOrderId
  }
}

// Crear una orden en Shopify para una suscripción (primer despacho o cobro recurrente).
//
// Usamos el flujo de Draft Orders en vez de Orders directos porque la REST Orders API
// rechaza variants con `components` (bundles de Shopify) con 422. Los Welcome Kits
// están configurados como bundles, así que Orders directos imposibilita despacharlos.
// Draft Orders sí los acepta — Shopify expande el bundle internamente al completar.
//
// Precio: el variant en Shopify ya está creado con el precio de suscripción, así que
// no aplicamos descuento ni sobrescribimos el price del line item. Shopify calcula
// IVA con la configuración del variant; respetamos tax_exempt cuando aplica.
//
// Flujo: POST /draft_orders → PUT /draft_orders/{id}/complete?payment_pending=true →
// POST /orders/{order_id}/transactions (gateway "Mercado Pago") → GET /orders/{order_id}.
export async function createShopifyOrder(params: {
  email: string
  name: string
  firstName?: string
  lastName?: string
  variantId: string
  taxExempt?: boolean
  note?: string
  documentType?: string | null
  documentNumber?: string | null
  billing?: {
    firstName?: string
    lastName?: string
    fullName?: string
    phone: string
    address: string
    city: string
    department: string
  }
  shipping?: {
    firstName?: string
    lastName?: string
    fullName: string
    phone: string
    address: string
    city: string
    department: string
  }
}) {
  const splitName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/)
    return {
      first_name: parts[0] || fullName,
      last_name: parts.slice(1).join(' ') || '',
    }
  }

  const buildAddress = (
    data: { firstName?: string; lastName?: string; fullName?: string; phone: string; address: string; city: string; department: string },
    fallback: { firstName?: string; lastName?: string; fullName: string },
    company?: string | null
  ) => {
    const hasExplicit = !!(data.firstName || data.lastName)
    const first_name = hasExplicit
      ? (data.firstName || '')
      : (fallback.firstName || splitName(data.fullName || fallback.fullName).first_name)
    const last_name = hasExplicit
      ? (data.lastName || '')
      : (fallback.lastName || splitName(data.fullName || fallback.fullName).last_name)
    const fullName = data.fullName || [first_name, last_name].filter(Boolean).join(' ') || fallback.fullName

    return {
      first_name,
      last_name,
      name: fullName,
      address1: data.address,
      city: data.city,
      province: data.department,
      country: 'Colombia',
      country_code: 'CO',
      phone: data.phone,
      // Moship lee la identificación (cédula/NIT) del cliente desde `company`
      // de la dirección para la FE en Siigo. Los note_attributes NO los lee.
      ...(company && { company }),
    }
  }

  const fallbackName = { firstName: params.firstName, lastName: params.lastName, fullName: params.name }
  const customerFirstName = params.firstName || splitName(params.name).first_name
  const customerLastName = params.lastName || splitName(params.name).last_name

  // El número de documento viaja en `company` de la dirección de facturación:
  // es de donde Moship toma la identificación del cliente para la FE en Siigo.
  const fiscalCompany = params.documentNumber || undefined

  const shippingAddress = params.shipping
    ? buildAddress(params.shipping, fallbackName)
    : undefined

  const billingAddress = params.billing
    ? buildAddress(params.billing, fallbackName, fiscalCompany)
    : shippingAddress
      ? { ...shippingAddress, ...(fiscalCompany && { company: fiscalCompany }) }
      : undefined

  const headers = {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': SHOPIFY_TOKEN,
  }

  // note_attributes: solo referencia humana en el admin de Shopify ("Información
  // adicional"). Moship NO los lee para la FE — la identificación que sí procesa
  // va en `billing_address.company` (ver fiscalCompany arriba).
  const noteAttributes: { name: string; value: string }[] = []
  if (params.documentType) noteAttributes.push({ name: 'Tipo de documento', value: params.documentType })
  if (params.documentNumber) noteAttributes.push({ name: 'Número de documento', value: params.documentNumber })

  // 1. Crear el draft order
  const draftRes = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/draft_orders.json`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        draft_order: {
          email: params.email,
          // Canal/atribución de venta en Shopify. Coincide con el nombre exacto
          // de la Custom App registrada en Shopify para que las ventas se asocien
          // a ese canal en el admin.
          source_name: 'Happy Sapiens Suscriptions',
          tax_exempt: params.taxExempt === true,
          taxes_included: true,
          use_customer_default_address: false,
          line_items: [{
            variant_id: parseInt(params.variantId, 10),
            quantity: 1,
          }],
          customer: {
            email: params.email,
            first_name: customerFirstName,
            last_name: customerLastName,
          },
          note: params.note ?? 'Suscripción mensual — cobro automático MercadoPago',
          ...(noteAttributes.length > 0 && { note_attributes: noteAttributes }),
          tags: 'subscription,auto',
          ...(billingAddress && { billing_address: billingAddress }),
          ...(shippingAddress && {
            shipping_address: shippingAddress,
            shipping_line: { title: 'Envío estándar', price: '0.00', custom: true },
          }),
        },
      }),
      cache: 'no-store',
    }
  )

  if (!draftRes.ok) {
    const errorBody = await draftRes.text()
    throw new Error(`Shopify draft_order create error: ${draftRes.status} ${errorBody}`)
  }

  const { draft_order } = await draftRes.json()
  const draftId = draft_order.id as number

  // 2. Completar el draft order con payment_pending=true: crea la orden en estado
  // `pending`. OJO: Shopify SÍ genera aquí una transacción `sale` PENDIENTE con
  // gateway "manual" (el saldo queda por cobrar). En el paso 3 registramos una
  // transacción `sale/success` con gateway "Mercado Pago" que asienta el pago,
  // marca la orden como `paid` y deja el método identificado (payment_gateway_names
  // incluye "Mercado Pago"), que es lo que lee Moship/Siigo.
  //
  // IMPORTANTE: ese POST del paso 3 solo es válido en la ventana inmediata a la
  // creación. Si se pospone (p.ej. tras un 409 por el lock de la orden recién
  // creada que no se reintentó), Shopify rechaza una nueva `sale` con
  // 422 "sale is not a valid transaction" y ya no se puede replicar este flujo —
  // hay que asentar la transacción pendiente vía `markShopifyOrderAsPaid`
  // (reconciliación desde el admin). Por eso el paso 3 usa shopifyFetchWithRetry.
  const completeRes = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/draft_orders/${draftId}/complete.json?payment_pending=true`,
    {
      method: 'PUT',
      headers,
      cache: 'no-store',
    }
  )

  if (!completeRes.ok) {
    const errorBody = await completeRes.text()
    throw new Error(`Shopify draft_order complete error: ${completeRes.status} ${errorBody}`)
  }

  const { draft_order: completed } = await completeRes.json()
  const orderId = completed.order_id as number

  // A partir de aquí la orden YA existe en Shopify. Si un paso posterior falla,
  // NO podemos dejar que el error se propague tal cual: el patrón de despacho
  // borraría el slot de idempotencia y un reintento crearía una orden duplicada
  // (p.ej. un segundo kit de bienvenida). Por eso envolvemos los pasos 3-4 y, ante
  // un fallo, lanzamos un ShopifyPostCreateError que carga el orderId para que el
  // despacho confirme la fila como 'created' (idempotente) en lugar de borrarla.
  try {
    // 3. Registrar el pago como transacción `sale` con gateway "Mercado Pago".
    // Esto marca financial_status='paid' y deja el método de pago identificado
    // (payment_gateway_names: ["Mercado Pago"]), que es lo que lee Moship.
    const txRes = await shopifyFetchWithRetry(
      `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/orders/${orderId}/transactions.json`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transaction: {
            kind: 'sale',
            status: 'success',
            gateway: 'Mercado Pago',
            amount: completed.total_price,
            currency: completed.currency,
          },
        }),
        cache: 'no-store',
      }
    )

    if (!txRes.ok) {
      const errorBody = await txRes.text()
      throw new Error(`Shopify order transaction error: ${txRes.status} ${errorBody}`)
    }

    // 4. Traer el order_number para logging operativo (el draft tiene su propio `name` tipo #D1).
    const orderRes = await shopifyFetchWithRetry(
      `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/orders/${orderId}.json?fields=id,order_number`,
      { headers, cache: 'no-store' }
    )

    if (!orderRes.ok) {
      const errorBody = await orderRes.text()
      throw new Error(`Shopify order fetch error: ${orderRes.status} ${errorBody}`)
    }

    const { order } = await orderRes.json()
    return { id: order.id as number, order_number: order.order_number as number }
  } catch (err) {
    throw new ShopifyPostCreateError(orderId, err instanceof Error ? err.message : String(err))
  }
}

// Asienta como pagada una orden que quedó en `pending` porque el paso 3 de
// createShopifyOrder (POST de la transacción `sale/Mercado Pago`) no se completó a
// tiempo. La orden ya tiene una transacción `sale` PENDIENTE (gateway "manual")
// generada al completar el draft; `orderMarkAsPaid` la liquida y deja la orden en
// `paid`. NO se puede recrear la `sale/Mercado Pago` a posteriori (Shopify la
// rechaza con 422), así que el método de pago queda como "manual". Idempotente: si
// la orden ya está pagada, no hace nada.
export async function markShopifyOrderAsPaid(
  orderId: string | number
): Promise<{ orderNumber: number | null; financialStatus: string; alreadyPaid: boolean }> {
  const headers = {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': SHOPIFY_TOKEN,
  }

  const infoRes = await shopifyFetchWithRetry(
    `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/orders/${orderId}.json?fields=id,order_number,financial_status`,
    { headers, cache: 'no-store' }
  )
  if (!infoRes.ok) {
    throw new Error(`Shopify order fetch error: ${infoRes.status} ${await infoRes.text()}`)
  }
  const { order } = await infoRes.json()

  if (order.financial_status === 'paid') {
    return { orderNumber: order.order_number ?? null, financialStatus: 'paid', alreadyPaid: true }
  }

  const data = await shopifyQuery<{
    orderMarkAsPaid: {
      order: { id: string; name: string; displayFinancialStatus: string } | null
      userErrors: { field: string[] | null; message: string }[]
    }
  }>(
    `mutation orderMarkAsPaid($input: OrderMarkAsPaidInput!) {
      orderMarkAsPaid(input: $input) {
        order { id name displayFinancialStatus }
        userErrors { field message }
      }
    }`,
    { input: { id: `gid://shopify/Order/${orderId}` } }
  )

  const result = data.orderMarkAsPaid
  if (result.userErrors?.length) {
    throw new Error(`orderMarkAsPaid userErrors: ${result.userErrors.map((e) => e.message).join('; ')}`)
  }

  return {
    orderNumber: order.order_number ?? null,
    financialStatus: (result.order?.displayFinancialStatus ?? 'PAID').toLowerCase(),
    alreadyPaid: false,
  }
}

export interface ShopifyOrder {
  id: number
  order_number: number
  created_at: string
  closed_at: string | null
  financial_status: string
  fulfillment_status: string | null
  line_items: { title: string; price: string; quantity: number }[]
}

// Obtener pedidos de un cliente por email
export async function getShopifyOrdersByEmail(email: string): Promise<ShopifyOrder[]> {
  const restUrl = `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/orders.json?email=${encodeURIComponent(email)}&status=any&fields=id,order_number,created_at,closed_at,financial_status,fulfillment_status,line_items&limit=20`

  const response = await fetch(restUrl, {
    headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN },
    cache: 'no-store',
  })

  if (!response.ok) return []

  const { orders } = await response.json()
  return (orders ?? []) as ShopifyOrder[]
}

// Registrar webhooks en Shopify
export async function registerShopifyWebhooks(baseUrl: string) {
  const topics = ["ORDERS_PAID", "ORDERS_CANCELLED"]

  const callbackUrl = `${baseUrl}/api/webhooks/shopify`
  const results = []

  for (const topic of topics) {
    const data = await shopifyQuery<{
      webhookSubscriptionCreate: {
        webhookSubscription: { id: string } | null
        userErrors: { message: string }[]
      }
    }>(
      `mutation createWebhook($topic: WebhookSubscriptionTopic!, $callbackUrl: URL!) {
        webhookSubscriptionCreate(
          topic: $topic
          webhookSubscription: { callbackUrl: $callbackUrl, format: JSON }
        ) {
          webhookSubscription { id }
          userErrors { message }
        }
      }`,
      { topic, callbackUrl }
    )

    results.push({ topic, result: data.webhookSubscriptionCreate })
  }

  return results
}
