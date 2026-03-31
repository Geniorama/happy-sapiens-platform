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

// Crear una orden en Shopify (para cobros recurrentes de suscripción)
export async function createShopifyOrder(params: {
  email: string
  name: string
  variantId: string
  note?: string
  shipping?: {
    fullName: string
    phone: string
    address: string
    city: string
    department: string
  }
}) {
  const restUrl = `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/orders.json`

  const shippingAddress = params.shipping
    ? {
        name: params.shipping.fullName,
        address1: params.shipping.address,
        city: params.shipping.city,
        province: params.shipping.department,
        country: 'Colombia',
        country_code: 'CO',
        phone: params.shipping.phone,
      }
    : undefined

  const response = await fetch(restUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
    },
    body: JSON.stringify({
      order: {
        email: params.email,
        financial_status: 'paid',
        send_receipt: false,
        send_fulfillment_receipt: true,
        line_items: [{ variant_id: parseInt(params.variantId, 10), quantity: 1 }],
        customer: { email: params.email },
        note: params.note ?? 'Suscripción mensual — cobro automático MercadoPago',
        tags: 'subscription,auto',
        ...(shippingAddress && { shipping_address: shippingAddress }),
      },
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Shopify order error: ${response.status} ${errorBody}`)
  }

  const { order } = await response.json()
  return order as { id: number; order_number: number }
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
