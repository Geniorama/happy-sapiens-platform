import { NextResponse } from 'next/server'
import { paymentClient, preApprovalClient } from '@/lib/mercadopago'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { awardPoints, POINT_ACTIONS } from '@/lib/points'
import { createShopifyOrder } from '@/lib/shopify'
import { randomBytes, createHmac } from 'crypto'
import { hash } from 'bcryptjs'
import { Prisma } from '@prisma/client'

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

async function sendWelcomeEmail(email: string, name: string, resetToken: string) {
  const appUrl = (process.env.NEXTAUTH_URL || 'https://happy-sapiens.netlify.app').replace(/\/$/, '')
  const setupUrl = `${appUrl}/auth/reset-password?token=${resetToken}`

  await sendEmail({
    to: email,
    subject: '¡Bienvenido a Happy Sapiens! Crea tu contraseña',
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #18181b;">
        <img src="${appUrl}/hs-logo.svg" alt="Happy Sapiens" style="width: 160px; margin-bottom: 24px;" />
        <h2 style="margin-bottom: 8px;">¡Tu suscripción está activa!</h2>
        <p>Hola ${name},</p>
        <p>Tu suscripción a Happy Sapiens fue procesada exitosamente. Para acceder a la plataforma solo necesitas crear tu contraseña:</p>
        <a
          href="${setupUrl}"
          style="display:inline-block;margin:24px 0;padding:12px 28px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;"
        >
          Crear mi contraseña
        </a>
        <p style="color:#71717a;font-size:14px;">Este enlace es válido por 24 horas.</p>
        <p style="color:#71717a;font-size:14px;">Si el botón no funciona, copia y pega esta URL:<br/><a href="${setupUrl}" style="color:#16a34a;">${setupUrl}</a></p>
      </div>
    `,
  })
}

async function log(action: string, email: string, metadata: Record<string, unknown>) {
  try {
    await prisma.systemLog.create({
      data: {
        actorEmail: email,
        action,
        entityType: 'subscription',
        metadata: metadata as Prisma.InputJsonValue,
      },
    })
  } catch {
    // no romper el flujo si el log falla
  }
}

async function handlePreApproval(preApprovalId: string) {
  const preApproval = await preApprovalClient.get({ id: preApprovalId })

  await log('webhook.preapproval.received', preApproval.payer_email || 'unknown', {
    preApprovalId,
    status: preApproval.status,
    payer_email: preApproval.payer_email,
    external_reference: preApproval.external_reference,
  })

  let email = preApproval.payer_email || ''
  let name = email
  let referralCode: string | null = null
  let productId: string | null = null
  let shopifyVariantId: string | null = null
  let taxExempt = false
  const preApprovalAny = preApproval as unknown as Record<string, unknown>
  const subscriptionPrice = (preApprovalAny.auto_recurring as Record<string, unknown> | undefined)?.transaction_amount as number | undefined
  const nextPaymentDate = preApprovalAny.next_payment_date as string | undefined
  const dateCreated = preApprovalAny.date_created as string | undefined

  if (preApproval.external_reference) {
    try {
      const parsed = JSON.parse(preApproval.external_reference)
      // payer_email no siempre viene en el response del SDK — usar external_reference como fuente
      if (!email && parsed.email) email = parsed.email
      name = parsed.name || email
      referralCode = parsed.referralCode || null
      productId = parsed.productId || null
      shopifyVariantId = parsed.shopifyVariantId || null
      taxExempt = parsed.taxExempt === true
    } catch {
      // external_reference no es JSON, ignorar
    }
  }

  if (!email) return

  const status = preApproval.status

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (status === 'authorized') {
    // Leer datos de facturación/envío del checkout pendiente
    const pendingCheckout = await prisma.pendingCheckout.findUnique({
      where: { email },
      select: { billing: true, shipping: true, referralCode: true },
    })

    const billingData = pendingCheckout?.billing as Record<string, string> | null
    const shippingData = pendingCheckout?.shipping as Record<string, string> | null
    // Si el referralCode viene del pending_checkout, tiene prioridad
    if (!referralCode && pendingCheckout?.referralCode) {
      referralCode = pendingCheckout.referralCode
    }

    if (existingUser) {
      const updateData: Prisma.UserUpdateInput = {
        subscriptionStatus: 'active',
        subscriptionId: preApprovalId,
        subscriptionSyncedAt: new Date(),
        subscriptionStartDate: dateCreated ? new Date(dateCreated) : new Date(),
        subscriptionEndDate: nextPaymentDate ? new Date(nextPaymentDate) : null,
        subscriptionProduct: productId,
        subscriptionVariantId: shopifyVariantId,
        subscriptionTaxExempt: taxExempt,
        ...(subscriptionPrice !== undefined && { subscriptionPrice }),
        ...(billingData && {
          billingDocumentType: billingData.documentType,
          billingDocumentNumber: billingData.documentNumber,
          billingPhone: billingData.phone,
          billingAddress: billingData.address,
          billingCity: billingData.city,
          billingDepartment: billingData.department,
        }),
        ...(shippingData && {
          shippingFullName: shippingData.fullName,
          shippingPhone: shippingData.phone,
          shippingAddress: shippingData.address,
          shippingCity: shippingData.city,
          shippingDepartment: shippingData.department,
          shippingSameAsBilling: !pendingCheckout?.shipping || shippingData.fullName === name,
        }),
      }

      await prisma.user.update({ where: { id: existingUser.id }, data: updateData })

      console.log(`Suscripción reactivada: ${email}`)
    } else {
      let referrerId: string | null = null
      if (referralCode) {
        const referrer = await prisma.user.findUnique({
          where: { referralCode },
          select: { id: true },
        })
        if (referrer) referrerId = referrer.id
      }

      const resetToken = randomBytes(32).toString('hex')
      const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

      let newUser
      try {
        newUser = await prisma.user.create({
          data: {
            name,
            email,
            role: 'user',
            subscriptionStatus: 'active',
            subscriptionId: preApprovalId,
            subscriptionSyncedAt: new Date(),
            subscriptionStartDate: dateCreated ? new Date(dateCreated) : new Date(),
            subscriptionEndDate: nextPaymentDate ? new Date(nextPaymentDate) : null,
            subscriptionProduct: productId,
            subscriptionVariantId: shopifyVariantId,
            subscriptionTaxExempt: taxExempt,
            ...(subscriptionPrice !== undefined && { subscriptionPrice }),
            referredBy: referrerId,
            resetToken: resetToken,
            resetTokenExpires: resetTokenExpires,
            ...(billingData && {
              billingDocumentType: billingData.documentType,
              billingDocumentNumber: billingData.documentNumber,
              billingPhone: billingData.phone,
              billingAddress: billingData.address,
              billingCity: billingData.city,
              billingDepartment: billingData.department,
            }),
            ...(shippingData && {
              shippingFullName: shippingData.fullName,
              shippingPhone: shippingData.phone,
              shippingAddress: shippingData.address,
              shippingCity: shippingData.city,
              shippingDepartment: shippingData.department,
              shippingSameAsBilling: !pendingCheckout?.shipping || shippingData.fullName === name,
            }),
          },
          select: { id: true },
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const code = err instanceof Prisma.PrismaClientKnownRequestError ? err.code : ''
        console.error('Error creando usuario:', err)
        await log('webhook.preapproval.user_create_error', email, { error: msg, code })
        return
      }

      await log('webhook.preapproval.user_created', email, { userId: newUser.id, productId })
      console.log(`Usuario creado: ${email} — producto: ${productId}`)

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
          description: `Referido ${name} se suscribió`,
          referenceType: 'user',
          referenceId: newUser.id,
        })
      }

      await sendWelcomeEmail(email, name, resetToken)
    }

    // Crear primer pedido en Shopify al activar la suscripción
    if (shopifyVariantId) {
      const billingAddress = billingData
        ? {
            phone: billingData.phone || '',
            address: billingData.address,
            city: billingData.city || '',
            department: billingData.department || '',
          }
        : undefined

      const shippingAddress = shippingData
        ? {
            fullName: shippingData.fullName || name,
            phone: shippingData.phone || '',
            address: shippingData.address,
            city: shippingData.city || '',
            department: shippingData.department || '',
          }
        : undefined

      try {
        const order = await createShopifyOrder({
          email,
          name,
          variantId: shopifyVariantId,
          price: subscriptionPrice,
          taxExempt,
          note: 'Primera entrega — suscripción activada vía MercadoPago',
          billing: billingAddress,
          shipping: shippingAddress,
        })
        await log('webhook.preapproval.shopify_order_created', email, { order_number: order.order_number, order_id: order.id })
        console.log(`Orden Shopify creada: #${order.order_number} para ${email}`)
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        await log('webhook.preapproval.shopify_order_error', email, { error: errMsg, variantId: shopifyVariantId })
        console.error('Error creando orden en Shopify:', err)
      }
    }

    // Limpiar el checkout pendiente
    try {
      await prisma.pendingCheckout.delete({ where: { email } })
    } catch {
      // si no existe, ignorar (P2025)
    }
  } else if (status === 'cancelled' || status === 'paused' || status === 'past_due') {
    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          subscriptionStatus: status === 'cancelled' ? 'cancelled'
            : status === 'paused' ? 'paused'
            : 'past_due',
          subscriptionSyncedAt: new Date(),
        },
      })

      console.log(`Suscripción ${status}: ${email}`)
    }
  }
}

async function handlePayment(paymentId: string) {
  const payment = await paymentClient.get({ id: paymentId })

  // Pago de suscripción recurrente (cobro mensual automático)
  // subscription_id existe en runtime pero no está en los tipos del SDK
  const paymentAny = payment as unknown as Record<string, unknown>
  if (paymentAny.subscription_id) {
    const email = payment.payer?.email
    if (!email) return

    // Pago rechazado → marcar suscripción como past_due (no crear orden Shopify)
    if (payment.status === 'rejected' || payment.status === 'cancelled') {
      await prisma.user.updateMany({
        where: { email },
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
        subscriptionStatus: true,
        subscriptionVariantId: true,
        subscriptionTaxExempt: true,
        billingPhone: true,
        billingAddress: true,
        billingCity: true,
        billingDepartment: true,
        shippingFullName: true,
        shippingPhone: true,
        shippingAddress: true,
        shippingCity: true,
        shippingDepartment: true,
      },
    })

    if (user) {
      const recurringPrice = payment.transaction_amount ?? undefined
      const paymentAnyData = payment as unknown as Record<string, unknown>
      const nextDate = paymentAnyData.next_payment_date as string | undefined

      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionSyncedAt: new Date(),
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
              phone: user.billingPhone || '',
              address: user.billingAddress,
              city: user.billingCity || '',
              department: user.billingDepartment || '',
            }
          : undefined

        const shippingAddress = user.shippingAddress
          ? {
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

          const order = await createShopifyOrder({
            email,
            name: user.name || email,
            variantId: user.subscriptionVariantId,
            price: recurringPrice,
            taxExempt: user.subscriptionTaxExempt === true,
            note: orderNote,
            billing: billingAddress,
            shipping: shippingAddress,
          })
          await log('webhook.payment.shopify_order_created', email, { order_number: order.order_number, order_id: order.id })
          console.log(`Orden Shopify creada: #${order.order_number} para ${email}`)
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err)
          await log('webhook.payment.shopify_order_error', email, { error: errMsg, variantId: user.subscriptionVariantId })
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
      await handlePreApproval(dataId)
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
