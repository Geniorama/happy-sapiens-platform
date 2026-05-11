import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { createShopifyOrder } from '@/lib/shopify'

type CreateShopifyOrderParams = Parameters<typeof createShopifyOrder>[0]
type ShopifyOrder = Awaited<ReturnType<typeof createShopifyOrder>>

export type DispatchResult =
  | { status: 'created'; order: ShopifyOrder }
  | {
      status: 'skipped'
      existing: { status: string; shopifyOrderId: string | null; shopifyOrderNumber: number | null }
    }

// Crea una orden Shopify con garantía de idempotencia atómica.
//
// El patrón es claim → call → commit. Insertamos primero la fila de dispatch
// con UNIQUE(idempotency_key): solo un worker puede reservar el slot. Si la
// llamada a Shopify falla, borramos la fila para que un reintento pueda
// tomar el slot de nuevo. Si tiene éxito, marcamos el estado como `created`
// y futuras reentregas del webhook se saltan.
export async function dispatchShopifyOrder({
  idempotencyKey,
  email,
  userId,
  params,
}: {
  idempotencyKey: string
  email: string
  userId?: string | null
  params: CreateShopifyOrderParams
}): Promise<DispatchResult> {
  try {
    await prisma.shopifyOrderDispatch.create({
      data: {
        idempotencyKey,
        email,
        userId: userId ?? null,
        status: 'pending',
      },
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const existing = await prisma.shopifyOrderDispatch.findUnique({
        where: { idempotencyKey },
        select: { status: true, shopifyOrderId: true, shopifyOrderNumber: true },
      })
      return {
        status: 'skipped',
        existing: existing ?? { status: 'unknown', shopifyOrderId: null, shopifyOrderNumber: null },
      }
    }
    throw err
  }

  try {
    const order = await createShopifyOrder(params)
    await prisma.shopifyOrderDispatch.update({
      where: { idempotencyKey },
      data: {
        status: 'created',
        shopifyOrderId: String(order.id),
        shopifyOrderNumber: order.order_number,
      },
    })
    return { status: 'created', order }
  } catch (err) {
    // Liberar el slot para que MP pueda reintentar. Si fuera un error permanente
    // (ej. variant con components), MP eventualmente desistirá por su cuenta.
    await prisma.shopifyOrderDispatch
      .delete({ where: { idempotencyKey } })
      .catch(() => undefined)
    throw err
  }
}
