import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { createShopifyOrder, ShopifyPostCreateError } from '@/lib/shopify'

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
  subscriptionRowId,
  params,
}: {
  idempotencyKey: string
  email: string
  userId?: string | null
  subscriptionRowId?: string | null
  params: CreateShopifyOrderParams
}): Promise<DispatchResult> {
  try {
    await prisma.shopifyOrderDispatch.create({
      data: {
        idempotencyKey,
        email,
        userId: userId ?? null,
        subscriptionRowId: subscriptionRowId ?? null,
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
    // La orden ya existe en Shopify, pero falló un paso posterior (pago/lectura).
    // NO liberar el slot: borrarlo permitiría que un reintento cree una orden
    // duplicada (p.ej. un segundo kit de bienvenida). Confirmamos el dispatch como
    // 'created' con el orderId y guardamos el detalle del fallo parcial; luego
    // re-lanzamos para que el llamador lo registre y sea visible para operación.
    if (err instanceof ShopifyPostCreateError) {
      await prisma.shopifyOrderDispatch
        .update({
          where: { idempotencyKey },
          data: {
            status: 'created',
            shopifyOrderId: String(err.shopifyOrderId),
            errorMessage: err.message,
          },
        })
        .catch(() => undefined)
      throw err
    }

    // Error antes de crear la orden: liberar el slot para que MP pueda reintentar.
    // Si fuera un error permanente (ej. variant con components), MP eventualmente
    // desistirá por su cuenta.
    await prisma.shopifyOrderDispatch
      .delete({ where: { idempotencyKey } })
      .catch(() => undefined)
    throw err
  }
}
