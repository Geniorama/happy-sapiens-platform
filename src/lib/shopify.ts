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
// Flujo: POST /draft_orders → PUT /draft_orders/{id}/complete?payment_pending=false → GET /orders/{order_id}.
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
    fallback: { firstName?: string; lastName?: string; fullName: string }
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
    }
  }

  const fallbackName = { firstName: params.firstName, lastName: params.lastName, fullName: params.name }
  const customerFirstName = params.firstName || splitName(params.name).first_name
  const customerLastName = params.lastName || splitName(params.name).last_name

  const shippingAddress = params.shipping
    ? buildAddress(params.shipping, fallbackName)
    : undefined

  const billingAddress = params.billing
    ? buildAddress(params.billing, fallbackName)
    : shippingAddress

  const headers = {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': SHOPIFY_TOKEN,
  }

  // note_attributes: Siigo/Moship leen tipo y número de documento desde aquí para la FE.
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

  // 2. Completar el draft order — payment_pending=false marca financial_status='paid'.
  const completeRes = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/draft_orders/${draftId}/complete.json?payment_pending=false`,
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

  // 3. Traer el order_number para logging operativo (el draft tiene su propio `name` tipo #D1).
  const orderRes = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/orders/${orderId}.json?fields=id,order_number`,
    { headers, cache: 'no-store' }
  )

  if (!orderRes.ok) {
    const errorBody = await orderRes.text()
    throw new Error(`Shopify order fetch error: ${orderRes.status} ${errorBody}`)
  }

  const { order } = await orderRes.json()
  return { id: order.id as number, order_number: order.order_number as number }
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
