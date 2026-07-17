import { NextResponse } from 'next/server'
import { paymentClient } from '@/lib/mercadopago'
import { prisma } from '@/lib/db'
import { awardPoints, POINT_ACTIONS } from '@/lib/points'
import { dispatchShopifyOrder } from '@/lib/shopify-dispatch'
import { provisionFromPreApproval, logSubscription as log } from '@/lib/subscription-provisioning'
import { recomputeUserSubscription, SUB_STATUS } from '@/lib/subscriptions'
import { createHmac } from 'crypto'
import { hash } from 'bcryptjs'

function verifyMpSignature(req: Request, rawBody: string, dataId: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) return true // si no hay secret configurado, no bloquear

  const xSignature = req.headers.get('x-signature')
  const xRequestId = req.headers.get('x-request-id')
  if (!xSignature) return false

  const parts = Object.fromEntries(xSignature.split(',').map(p => p.split('=')))
  const ts = parts['ts']
  const v1 = parts['v1']
  if (!ts || !v1) return false

  const message = `id:${dataId};request-id:${xRequestId ?? ''};ts:${ts};`
  const expected = createHmac('sha256', secret).update(message).digest('hex')

  return expected === v1
}

async function handlePayment(paymentId: string) {
  let payment: Awaited<ReturnType<typeof paymentClient.get>>
  try {
    payment = await paymentClient.get({ id: paymentId })
  } catch (err) {
    console.error('[webhook] error obteniendo payment:', paymentId, err)
    return
  }

  // Pago de suscripción recurrente (cobro mensual automático)
  // subscription_id existe en runtime pero no está en los tipos del SDK
  const paymentAny = payment as unknown as Record<string, unknown>
  if (paymentAny.subscription_id) {
    const preapprovalId = paymentAny.subscription_id as string
    const email = payment.payer?.email
    if (!email) return

    // Localizar la suscripción concreta de este cobro por su preapproval de MP.
    // Con múltiples suscripciones por usuario, el estado/precio/variant a tocar es
    // el de ESTA fila, no el del usuario entero.
    const subscription =
      typeof preapprovalId === 'string' && preapprovalId
        ? await prisma.subscription.findUnique({
            where: { mpPreapprovalId: preapprovalId },
            include: {
              user: {
                select: {
                  id: true, name: true, firstName: true, lastName: true,
                  billingDocumentType: true, billingDocumentNumber: true,
                  billingPhone: true, billingAddress: true, billingCity: true, billingDepartment: true,
                  shippingFullName: true, shippingFirstName: true, shippingLastName: true,
                  shippingPhone: true, shippingAddress: true, shippingCity: true, shippingDepartment: true,
                },
              },
            },
          })
        : null

    // Pago rechazado → degradar SOLO esta suscripción a past_due (no crear orden).
    // No degradar una 'paused'/'cancelled' por un cobro extraviado.
    if (payment.status === 'rejected' || payment.status === 'cancelled') {
      if (
        subscription &&
        subscription.status !== SUB_STATUS.PAUSED &&
        subscription.status !== SUB_STATUS.CANCELLED
      ) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: SUB_STATUS.PAST_DUE, syncedAt: new Date() },
        })
        await recomputeUserSubscription(subscription.userId)
      }
      await log('webhook.payment.rejected', email, { paymentId, status: payment.status, preapprovalId })
      return
    }

    if (payment.status !== 'approved') return

    // Primer cobro aprobado tras reintentos: la suscripción aún no está
    // materializada (no se activó en el preapproval por no haber cobro confirmado).
    // Este cobro la activa vía el flujo de preaprobación (crea user + email + primer
    // despacho). No se ejecuta el despacho recurrente porque subscription era null.
    if (!subscription) {
      if (typeof preapprovalId === 'string' && preapprovalId) {
        try {
          await provisionFromPreApproval(preapprovalId, { chargeConfirmed: true })
        } catch (err) {
          console.error('Error aprovisionando suscripción desde pago:', err)
        }
      }
      return
    }

    const user = subscription.user
    const recurringPrice = payment.transaction_amount ?? undefined
    const paymentAnyData = payment as unknown as Record<string, unknown>
    const nextDate = paymentAnyData.next_payment_date as string | undefined

    // Un cobro recurrente aprobado restaura ESTA suscripción a 'active' (p.ej.
    // recuperándose de 'past_due'). No reactiva 'paused'/'cancelled'.
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        syncedAt: new Date(),
        ...(subscription.status !== SUB_STATUS.PAUSED &&
          subscription.status !== SUB_STATUS.CANCELLED && { status: SUB_STATUS.ACTIVE }),
        ...(recurringPrice !== undefined && { price: recurringPrice }),
        ...(nextDate && { endDate: new Date(nextDate) }),
      },
    })
    await recomputeUserSubscription(subscription.userId)

    const mpPaymentId = String(payment.id)
    const currency = (payment as unknown as Record<string, unknown>).currency_id as string ?? 'COP'
    const paymentDateVal = payment.date_approved ? new Date(payment.date_approved) : new Date()

    await prisma.paymentTransaction.upsert({
      where: { mercadopagoPaymentId: mpPaymentId },
      create: {
        userId: user.id,
        subscriptionRowId: subscription.id,
        mercadopagoPaymentId: mpPaymentId,
        status: payment.status ?? 'approved',
        amount: recurringPrice ?? null,
        currency,
        paymentMethod: payment.payment_type_id ?? null,
        paymentDate: paymentDateVal,
      },
      update: {
        userId: user.id,
        subscriptionRowId: subscription.id,
        status: payment.status ?? 'approved',
        amount: recurringPrice ?? null,
        currency,
        paymentMethod: payment.payment_type_id ?? null,
        paymentDate: paymentDateVal,
      },
    })

    // Si esta suscripción está pausada, no despachar este mes.
    if (subscription.status === SUB_STATUS.PAUSED) {
      await log('webhook.payment.shopify_skipped', email, { reason: 'subscription_paused', preapprovalId })
      console.log(`Despacho omitido para ${email}: suscripción pausada`)
      return
    }

    if (subscription.variantId) {
      const billingAddress = user.billingAddress
        ? {
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
            phone: user.billingPhone || '',
            address: user.billingAddress,
            city: user.billingCity || '',
            department: user.billingDepartment || '',
          }
        : undefined

      const shippingAddress = user.shippingAddress
        ? {
            firstName: user.shippingFirstName || user.firstName || undefined,
            lastName: user.shippingLastName || user.lastName || undefined,
            fullName: user.shippingFullName || user.name || email,
            phone: user.shippingPhone || '',
            address: user.shippingAddress,
            city: user.shippingCity || '',
            department: user.shippingDepartment || '',
          }
        : undefined

      try {
        const paymentDateStr = payment.date_approved
          ? new Date(payment.date_approved).toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })
          : new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })
        const orderNote = `Suscripción mensual — ${paymentDateStr} | Pago MP #${payment.id} | Cobro automático MercadoPago`

        const result = await dispatchShopifyOrder({
          idempotencyKey: `payment:${mpPaymentId}`,
          email,
          userId: user.id,
          subscriptionRowId: subscription.id,
          params: {
            email,
            name: user.name || email,
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
            variantId: subscription.variantId,
            taxExempt: subscription.taxExempt === true,
            documentType: user.billingDocumentType,
            documentNumber: user.billingDocumentNumber,
            note: orderNote,
            billing: billingAddress,
            shipping: shippingAddress,
          },
        })
        if (result.status === 'created') {
          await log('webhook.payment.shopify_order_created', email, {
            order_number: result.order.order_number,
            order_id: result.order.id,
            paymentId: mpPaymentId,
          })
          console.log(`Orden Shopify creada: #${result.order.order_number} para ${email}`)
        } else {
          await log('webhook.payment.shopify_order_skipped', email, {
            reason: 'duplicate_dispatch',
            paymentId: mpPaymentId,
            existing: result.existing,
          })
          console.log(`Orden Shopify omitida (idempotencia) para ${email}: ya existe dispatch ${result.existing.status}`)
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        await log('webhook.payment.shopify_order_error', email, { error: errMsg, variantId: subscription.variantId, paymentId: mpPaymentId })
        console.error('Error creando orden en Shopify:', err)
      }
    } else {
      await log('webhook.payment.shopify_skipped', email, { reason: 'subscription variantId is null', preapprovalId })
    }

    console.log(`Cobro recurrente procesado: ${email}`)
    return
  }

  // Pago único legacy (flujo anterior con create-preference)
  // Solo se activa con el pago efectivamente aprobado; un pago rechazado o
  // pendiente nunca debe crear/activar la cuenta.
  if (payment.status !== 'approved') return

  const userEmail = payment.metadata?.user_email as string
  const userName = payment.metadata?.user_name as string
  const userPassword = payment.metadata?.user_password as string
  const referralCode = payment.metadata?.referral_code as string | null

  if (!userEmail || !userName || !userPassword) return

  let referrerId: string | null = null
  if (referralCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    })
    if (referrer) referrerId = referrer.id
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { id: true },
  })

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        subscriptionStatus: 'active',
        subscriptionSyncedAt: new Date(),
      },
    })

    await awardPoints({
      userId: existingUser.id,
      actionType: POINT_ACTIONS.SUBSCRIPTION_ACTIVE,
      description: 'Suscripción activada',
    })
  } else {
    const hashedPassword = await hash(userPassword, 12)

    let newUser
    try {
      newUser = await prisma.user.create({
        data: {
          name: userName,
          email: userEmail,
          password: hashedPassword,
          subscriptionStatus: 'active',
          subscriptionSyncedAt: new Date(),
          referredBy: referrerId,
        },
        select: { id: true },
      })
    } catch (err) {
      console.error('Error creando usuario:', err)
      return
    }

    await awardPoints({
      userId: newUser.id,
      actionType: POINT_ACTIONS.SIGNUP,
      description: 'Registro en la plataforma',
    })
    await awardPoints({
      userId: newUser.id,
      actionType: POINT_ACTIONS.SUBSCRIPTION_ACTIVE,
      description: 'Primera suscripción activada',
    })

    if (referrerId) {
      await awardPoints({
        userId: referrerId,
        actionType: POINT_ACTIONS.REFERRAL_SUBSCRIBED,
        description: `Referido ${userName} se suscribió`,
        referenceType: 'user',
        referenceId: newUser.id,
      })
    }
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const body = JSON.parse(rawBody)
    const dataId = body.data?.id ?? ''

    if (!verifyMpSignature(req, rawBody, dataId)) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
    }

    await log('webhook.received', 'system', { type: body.type, data_id: dataId, body })

    if (body.type === 'preapproval' || body.type === 'subscription_preapproval') {
      // Un fallo de Shopify se relanza desde provisionFromPreApproval; lo tragamos
      // para responder 200 (MP no reintenta en bucle) — recuperable desde el admin.
      try {
        await provisionFromPreApproval(dataId)
      } catch (err) {
        console.error('Error aprovisionando suscripción desde preapproval:', err)
      }
    } else if (body.type === 'subscription_authorized_payment' || body.type === 'payment') {
      await handlePayment(dataId)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error en webhook:', error)
    return NextResponse.json(
      { error: 'Error procesando webhook' },
      { status: 500 }
    )
  }
}
