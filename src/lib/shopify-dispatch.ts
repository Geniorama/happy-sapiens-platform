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

// Ventana para considerar que un cobro es el PRIMERO de su suscripción y, por
// tanto, ya lo cubre la primera entrega. El primer cobro es justamente el que
// dispara el aprovisionamiento, así que normalmente caen con minutos de
// diferencia; el margen holgado absorbe reintentos de MercadoPago y
// aprovisionamientos hechos a mano desde el admin días después. Sigue muy por
// debajo del mes que separa dos cobros recurrentes, así que nunca puede
// confundir una mensualidad legítima con el cobro inicial.
export const FIRST_DELIVERY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export type FirstDeliveryCoverage = {
  idempotencyKey: string
  status: string
  shopifyOrderId: string | null
  shopifyOrderNumber: number | null
}

// ¿La primera entrega de esta suscripción (`preapproval:<id>`) ya despachó este
// cobro?
//
// El primer cobro de una suscripción se despacha por el flujo de preaprobación,
// con clave `preapproval:<id>`. La rama de cobro recurrente lo despacharía otra
// vez con clave `payment:<id>`: dos claves distintas para un solo pago, así que
// dispatchShopifyOrder no puede detectarlo por sí solo y salen dos pedidos.
//
// La detección es por cercanía temporal con la primera entrega, NO por "esta
// suscripción no tiene cobros previos": las suscripciones anteriores al fix de
// julio quedaron con payment_transactions vacío, y esa regla les saltaría un
// cobro recurrente legítimo.
//
// Devuelve null si no hay cobertura (incluidos los despachos legacy sin
// subscriptionRowId): ante la duda no se salta el despacho.
export async function findFirstDeliveryCovering({
  subscriptionRowId,
  paymentDate,
}: {
  subscriptionRowId: string | null | undefined
  paymentDate: Date
}): Promise<FirstDeliveryCoverage | null> {
  if (!subscriptionRowId) return null

  const firstDelivery = await prisma.shopifyOrderDispatch.findFirst({
    where: {
      subscriptionRowId,
      status: 'created',
      idempotencyKey: { startsWith: 'preapproval:' },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      idempotencyKey: true,
      status: true,
      shopifyOrderId: true,
      shopifyOrderNumber: true,
      createdAt: true,
    },
  })
  if (!firstDelivery) return null

  const gap = Math.abs(paymentDate.getTime() - firstDelivery.createdAt.getTime())
  if (gap >= FIRST_DELIVERY_WINDOW_MS) return null

  return {
    idempotencyKey: firstDelivery.idempotencyKey,
    status: firstDelivery.status,
    shopifyOrderId: firstDelivery.shopifyOrderId,
    shopifyOrderNumber: firstDelivery.shopifyOrderNumber,
  }
}
