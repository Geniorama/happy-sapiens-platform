import { NextResponse } from 'next/server'
import { paymentClient, preApprovalClient } from '@/lib/mercadopago'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { awardPoints, POINT_ACTIONS } from '@/lib/points'
import { createShopifyOrder } from '@/lib/shopify'
import { randomBytes } from 'crypto'
import { hash } from 'bcryptjs'

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

  const email = preApproval.payer_email
  if (!email) return

  let name = email
  let referralCode: string | null = null
  let productId: string | null = null
  let shopifyVariantId: string | null = null

  if (preApproval.external_reference) {
    try {
      const parsed = JSON.parse(preApproval.external_reference)
      name = parsed.name || email
      referralCode = parsed.referralCode || null
      productId = parsed.productId || null
      shopifyVariantId = parsed.shopifyVariantId || null
    } catch {
      // external_reference no es JSON, ignorar
    }
  }

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
          subscription_synced_at: new Date().toISOString(),
          subscription_product: productId,
          subscription_variant_id: shopifyVariantId,
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
          subscription_synced_at: new Date().toISOString(),
          subscription_product: productId,
          subscription_variant_id: shopifyVariantId,
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

    // Limpiar el checkout pendiente
    await supabaseAdmin.from('pending_checkout').delete().eq('email', email)
  } else if (status === 'cancelled' || status === 'paused') {
    if (existingUser) {
      await supabaseAdmin
        .from('users')
        .update({
          subscription_status: status === 'cancelled' ? 'cancelled' : 'paused',
          subscription_synced_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id)

      console.log(`Suscripción ${status}: ${email}`)
    }
  }
}

async function handlePayment(paymentId: string) {
  const payment = await paymentClient.get({ id: paymentId })

  if (payment.status !== 'approved') return

  // Pago de suscripción recurrente (cobro mensual automático)
  // subscription_id existe en runtime pero no está en los tipos del SDK
  const paymentAny = payment as unknown as Record<string, unknown>
  if (paymentAny.subscription_id) {
    const email = payment.payer?.email
    if (!email) return

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, name, subscription_variant_id, shipping_full_name, shipping_phone, shipping_address, shipping_city, shipping_department')
      .eq('email', email)
      .single()

    if (user) {
      await supabaseAdmin
        .from('users')
        .update({ subscription_synced_at: new Date().toISOString() })
        .eq('id', user.id)

      if (user.subscription_variant_id) {
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
          const order = await createShopifyOrder({
            email,
            name: user.name || email,
            variantId: user.subscription_variant_id,
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
    const body = await req.json()

    await log('webhook.received', 'system', { type: body.type, data_id: body.data?.id, body })

    if (body.type === 'preapproval') {
      await handlePreApproval(body.data.id)
    } else if (body.type === 'subscription_authorized_payment' || body.type === 'payment') {
      await handlePayment(body.data.id)
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
