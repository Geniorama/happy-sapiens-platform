import { NextResponse } from 'next/server'
import { paymentClient, preApprovalClient } from '@/lib/mercadopago'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { awardPoints, POINT_ACTIONS } from '@/lib/points'
import { createShopifyOrder } from '@/lib/shopify'
import { randomBytes, createHmac } from 'crypto'
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
    await supabaseAdmin.from('system_logs').insert({
      actor_email: email,
      action,
      entity_type: 'subscription',
      metadata,
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
    } catch {
      // external_reference no es JSON, ignorar
    }
  }

  if (!email) return

  const status = preApproval.status

  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (status === 'authorized') {
    // Leer datos de facturación/envío del checkout pendiente
    const { data: pendingCheckout } = await supabaseAdmin
      .from('pending_checkout')
      .select('billing, shipping, referral_code')
      .eq('email', email)
      .single()

    const billingData = pendingCheckout?.billing as Record<string, string> | null
    const shippingData = pendingCheckout?.shipping as Record<string, string> | null
    // Si el referralCode viene del pending_checkout, tiene prioridad
    if (!referralCode && pendingCheckout?.referral_code) {
      referralCode = pendingCheckout.referral_code
    }

    if (existingUser) {
      await supabaseAdmin
        .from('users')
        .update({
          subscription_status: 'active',
          subscription_id: preApprovalId,
          subscription_synced_at: new Date().toISOString(),
          subscription_start_date: dateCreated ?? new Date().toISOString(),
          subscription_end_date: nextPaymentDate ?? null,
          subscription_product: productId,
          subscription_variant_id: shopifyVariantId,
          ...(subscriptionPrice !== undefined && { subscription_price: subscriptionPrice }),
          ...(billingData && {
            billing_document_type: billingData.documentType,
            billing_document_number: billingData.documentNumber,
            billing_phone: billingData.phone,
            billing_address: billingData.address,
            billing_city: billingData.city,
            billing_department: billingData.department,
          }),
          ...(shippingData && {
            shipping_full_name: shippingData.fullName,
            shipping_phone: shippingData.phone,
            shipping_address: shippingData.address,
            shipping_city: shippingData.city,
            shipping_department: shippingData.department,
            shipping_same_as_billing: !pendingCheckout?.shipping || shippingData.fullName === name,
          }),
        })
        .eq('id', existingUser.id)

      console.log(`Suscripción reactivada: ${email}`)
    } else {
      let referrerId: string | null = null
      if (referralCode) {
        const { data: referrer } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('referral_code', referralCode)
          .single()
        if (referrer) referrerId = referrer.id
      }

      const resetToken = randomBytes(32).toString('hex')
      const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          name,
          email,
          role: 'user',
          subscription_status: 'active',
          subscription_id: preApprovalId,
          subscription_synced_at: new Date().toISOString(),
          subscription_start_date: dateCreated ?? new Date().toISOString(),
          subscription_end_date: nextPaymentDate ?? null,
          subscription_product: productId,
          subscription_variant_id: shopifyVariantId,
          ...(subscriptionPrice !== undefined && { subscription_price: subscriptionPrice }),
          referred_by: referrerId,
          reset_token: resetToken,
          reset_token_expires: resetTokenExpires.toISOString(),
          ...(billingData && {
            billing_document_type: billingData.documentType,
            billing_document_number: billingData.documentNumber,
            billing_phone: billingData.phone,
            billing_address: billingData.address,
            billing_city: billingData.city,
            billing_department: billingData.department,
          }),
          ...(shippingData && {
            shipping_full_name: shippingData.fullName,
            shipping_phone: shippingData.phone,
            shipping_address: shippingData.address,
            shipping_city: shippingData.city,
            shipping_department: shippingData.department,
            shipping_same_as_billing: !pendingCheckout?.shipping || shippingData.fullName === name,
          }),
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error creando usuario:', error)
        await log('webhook.preapproval.user_create_error', email, { error: error.message, code: error.code })
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
    await supabaseAdmin.from('pending_checkout').delete().eq('email', email)
  } else if (status === 'cancelled' || status === 'paused' || status === 'past_due') {
    if (existingUser) {
      await supabaseAdmin
        .from('users')
        .update({
          subscription_status: status === 'cancelled' ? 'cancelled'
            : status === 'paused' ? 'paused'
            : 'past_due',
          subscription_synced_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id)

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
      await supabaseAdmin
        .from('users')
        .update({ subscription_status: 'past_due', subscription_synced_at: new Date().toISOString() })
        .eq('email', email)
      await log('webhook.payment.rejected', email, { paymentId, status: payment.status })
      return
    }

    if (payment.status !== 'approved') return

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, name, subscription_status, subscription_variant_id, billing_phone, billing_address, billing_city, billing_department, shipping_full_name, shipping_phone, shipping_address, shipping_city, shipping_department')
      .eq('email', email)
      .single()

    if (user) {
      const recurringPrice = payment.transaction_amount ?? undefined
      const paymentAnyData = payment as unknown as Record<string, unknown>
      const nextDate = paymentAnyData.next_payment_date as string | undefined

      await supabaseAdmin
        .from('users')
        .update({
          subscription_synced_at: new Date().toISOString(),
          ...(recurringPrice !== undefined && { subscription_price: recurringPrice }),
          ...(nextDate && { subscription_end_date: nextDate }),
        })
        .eq('id', user.id)

      await supabaseAdmin.from('payment_transactions').upsert({
        user_id: user.id,
        mercadopago_payment_id: String(payment.id),
        status: payment.status ?? 'approved',
        amount: recurringPrice ?? null,
        currency: (payment as unknown as Record<string, unknown>).currency_id as string ?? 'COP',
        payment_method: payment.payment_type_id ?? null,
        payment_date: payment.date_approved ?? new Date().toISOString(),
      }, { onConflict: 'mercadopago_payment_id' })

      // Si la suscripción está pausada, no despachar el producto este mes
      if (user.subscription_status === 'paused') {
        await log('webhook.payment.shopify_skipped', email, { reason: 'subscription_paused' })
        console.log(`Despacho omitido para ${email}: suscripción pausada`)
        return
      }

      if (user.subscription_variant_id) {
        const billingAddress = user.billing_address
          ? {
              phone: user.billing_phone || '',
              address: user.billing_address,
              city: user.billing_city || '',
              department: user.billing_department || '',
            }
          : undefined

        const shippingAddress = user.shipping_address
          ? {
              fullName: user.shipping_full_name || user.name || email,
              phone: user.shipping_phone || '',
              address: user.shipping_address,
              city: user.shipping_city || '',
              department: user.shipping_department || '',
            }
          : undefined

        try {
          const paymentDate = payment.date_approved
            ? new Date(payment.date_approved).toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })
            : new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })
          const orderNote = `Suscripción mensual — ${paymentDate} | Pago MP #${payment.id} | Cobro automático MercadoPago`

          const order = await createShopifyOrder({
            email,
            name: user.name || email,
            variantId: user.subscription_variant_id,
            price: recurringPrice,
            note: orderNote,
            billing: billingAddress,
            shipping: shippingAddress,
          })
          await log('webhook.payment.shopify_order_created', email, { order_number: order.order_number, order_id: order.id })
          console.log(`Orden Shopify creada: #${order.order_number} para ${email}`)
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err)
          await log('webhook.payment.shopify_order_error', email, { error: errMsg, variantId: user.subscription_variant_id })
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
    const { data: referrer } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('referral_code', referralCode)
      .single()
    if (referrer) referrerId = referrer.id
  }

  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', userEmail)
    .single()

  if (existingUser) {
    await supabaseAdmin
      .from('users')
      .update({
        subscription_status: 'active',
        subscription_synced_at: new Date().toISOString(),
      })
      .eq('id', existingUser.id)

    await awardPoints({
      userId: existingUser.id,
      actionType: POINT_ACTIONS.SUBSCRIPTION_ACTIVE,
      description: 'Suscripción activada',
    })
  } else {
    const hashedPassword = await hash(userPassword, 12)

    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        name: userName,
        email: userEmail,
        password: hashedPassword,
        subscription_status: 'active',
        subscription_synced_at: new Date().toISOString(),
        referred_by: referrerId,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creando usuario:', error)
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
