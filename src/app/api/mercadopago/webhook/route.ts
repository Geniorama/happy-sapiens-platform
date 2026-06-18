import { NextResponse } from 'next/server'
import { paymentClient } from '@/lib/mercadopago'
import { prisma } from '@/lib/db'
import { awardPoints, POINT_ACTIONS } from '@/lib/points'
import { dispatchShopifyOrder } from '@/lib/shopify-dispatch'
import { provisionFromPreApproval, logSubscription as log } from '@/lib/subscription-provisioning'
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
    const email = payment.payer?.email
    if (!email) return

    // Pago rechazado → marcar suscripción como past_due (no crear orden Shopify).
    // Solo afecta suscripciones vigentes ('active'/'past_due'); un evento de cobro
    // extraviado no debe degradar una 'paused'/'cancelled' ni activar una cuenta
    // inexistente (updateMany no coincide si el usuario aún no se ha creado).
    if (payment.status === 'rejected' || payment.status === 'cancelled') {
      await prisma.user.updateMany({
        where: { email, subscriptionStatus: { in: ['active', 'past_due'] } },
        data: { subscriptionStatus: 'past_due', subscriptionSyncedAt: new Date() },
      })
      await log('webhook.payment.rejected', email, { paymentId, status: payment.status })
      return
    }

    if (payment.status !== 'approved') return

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        subscriptionStatus: true,
        subscriptionVariantId: true,
        subscriptionTaxExempt: true,
        billingDocumentType: true,
        billingDocumentNumber: true,
        billingPhone: true,
        billingAddress: true,
        billingCity: true,
        billingDepartment: true,
        shippingFullName: true,
        shippingFirstName: true,
        shippingLastName: true,
        shippingPhone: true,
        shippingAddress: true,
        shippingCity: true,
        shippingDepartment: true,
      },
    })

    // Primer cobro aprobado tras reintentos: si la suscripción quedó "en espera
    // de pago" (no se activó en el evento de preaprobación por no haber cobro
    // confirmado), aún no existe el usuario. Este cobro aprobado la activa vía el
    // flujo de preaprobación, que vuelve a verificar el cobro (ya en summarized)
    // y crea usuario + email de bienvenida + primer despacho. No se ejecuta el
    // despacho recurrente de abajo porque el usuario era null al consultarse.
    if (!user) {
      const preApprovalId = paymentAny.subscription_id
      if (typeof preApprovalId === 'string' && preApprovalId) {
        // Este pago ya está 'approved' (se verificó arriba), así que el cobro
        // está confirmado: no re-chequear el agregado `summarized`, que llega
        // rezagado y haría descartar la activación y la orden Shopify.
        // Un fallo de Shopify se relanza desde provisionFromPreApproval (ya quedó
        // logueado dentro); lo tragamos aquí para responder 200 y que MP no
        // reintente en bucle — el admin puede reaprovisionar manualmente.
        try {
          await provisionFromPreApproval(preApprovalId, { chargeConfirmed: true })
        } catch (err) {
          console.error('Error aprovisionando suscripción desde pago:', err)
        }
      }
      return
    }

    if (user) {
      const recurringPrice = payment.transaction_amount ?? undefined
      const paymentAnyData = payment as unknown as Record<string, unknown>
      const nextDate = paymentAnyData.next_payment_date as string | undefined

      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionSyncedAt: new Date(),
          // Un cobro recurrente aprobado restaura la suscripción a 'active'
          // (p.ej. recuperándose de 'past_due' tras un reintento exitoso de MP).
          // No se reactivan suscripciones 'paused' ni 'cancelled': un cobro no
          // debe reanudarlas por sí solo.
          ...(user.subscriptionStatus !== 'paused' &&
            user.subscriptionStatus !== 'cancelled' && { subscriptionStatus: 'active' }),
          ...(recurringPrice !== undefined && { subscriptionPrice: recurringPrice }),
          ...(nextDate && { subscriptionEndDate: new Date(nextDate) }),
        },
      })

      const mpPaymentId = String(payment.id)
      const currency = (payment as unknown as Record<string, unknown>).currency_id as string ?? 'COP'
      const paymentDateVal = payment.date_approved ? new Date(payment.date_approved) : new Date()

      await prisma.paymentTransaction.upsert({
        where: { mercadopagoPaymentId: mpPaymentId },
        create: {
          userId: user.id,
          mercadopagoPaymentId: mpPaymentId,
          status: payment.status ?? 'approved',
          amount: recurringPrice ?? null,
          currency,
          paymentMethod: payment.payment_type_id ?? null,
          paymentDate: paymentDateVal,
        },
        update: {
          userId: user.id,
          status: payment.status ?? 'approved',
          amount: recurringPrice ?? null,
          currency,
          paymentMethod: payment.payment_type_id ?? null,
          paymentDate: paymentDateVal,
        },
      })

      // Si la suscripción está pausada, no despachar el producto este mes
      if (user.subscriptionStatus === 'paused') {
        await log('webhook.payment.shopify_skipped', email, { reason: 'subscription_paused' })
        console.log(`Despacho omitido para ${email}: suscripción pausada`)
        return
      }

      if (user.subscriptionVariantId) {
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
            params: {
              email,
              name: user.name || email,
              firstName: user.firstName || undefined,
              lastName: user.lastName || undefined,
              variantId: user.subscriptionVariantId,
              taxExempt: user.subscriptionTaxExempt === true,
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
          await log('webhook.payment.shopify_order_error', email, { error: errMsg, variantId: user.subscriptionVariantId, paymentId: mpPaymentId })
          console.error('Error creando orden en Shopify:', err)
        }
      } else {
        await log('webhook.payment.shopify_skipped', email, { reason: 'subscription_variant_id is null' })
      }
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
