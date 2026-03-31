import { NextResponse } from 'next/server'
import { preApprovalClient, paymentClient } from '@/lib/mercadopago'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { awardPoints, POINT_ACTIONS } from '@/lib/points'
import { createShopifyOrder } from '@/lib/shopify'
import { randomBytes } from 'crypto'

// Endpoint de diagnóstico para disparar manualmente el procesamiento de un webhook de MP.
// Protegido por WEBHOOK_TRIGGER_SECRET en variables de entorno.
// Usar solo para pruebas — no exponer públicamente.

const SECRET = process.env.WEBHOOK_TRIGGER_SECRET

export async function POST(req: Request) {
  const authHeader = req.headers.get('x-trigger-secret')
  if (!SECRET || authHeader !== SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { type, id } = await req.json()

  if (!type || !id) {
    return NextResponse.json({ error: 'type e id son requeridos' }, { status: 400 })
  }

  const logs: string[] = []

  try {
    if (type === 'preapproval') {
      logs.push(`Obteniendo preapproval ${id}...`)
      const preApproval = await preApprovalClient.get({ id })
      logs.push(`status: ${preApproval.status}, email: ${preApproval.payer_email}`)

      const email = preApproval.payer_email
      if (!email) return NextResponse.json({ logs, error: 'payer_email vacío' })

      let name = email
      let productId: string | null = null
      let shopifyVariantId: string | null = null
      let referralCode: string | null = null

      if (preApproval.external_reference) {
        try {
          const parsed = JSON.parse(preApproval.external_reference)
          name = parsed.name || email
          productId = parsed.productId || null
          shopifyVariantId = parsed.shopifyVariantId || null
          referralCode = parsed.referralCode || null
          logs.push(`external_reference: ${JSON.stringify(parsed)}`)
        } catch {
          logs.push('external_reference no es JSON válido')
        }
      }

      if (preApproval.status !== 'authorized') {
        return NextResponse.json({ logs, warning: `Estado es '${preApproval.status}', no 'authorized'. No se procesará.` })
      }

      const { data: pendingCheckout } = await supabaseAdmin
        .from('pending_checkout')
        .select('billing, shipping, referral_code')
        .eq('email', email)
        .single()

      logs.push(`pending_checkout: ${pendingCheckout ? 'encontrado' : 'no encontrado'}`)
      if (!referralCode && pendingCheckout?.referral_code) referralCode = pendingCheckout.referral_code

      const billingData = pendingCheckout?.billing as Record<string, string> | null
      const shippingData = pendingCheckout?.shipping as Record<string, string> | null

      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

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
            }),
          })
          .eq('id', existingUser.id)
        logs.push(`Usuario existente actualizado: ${existingUser.id}`)
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
        const appUrl = (process.env.NEXTAUTH_URL || 'https://happy-sapiens.netlify.app').replace(/\/$/, '')
        const setupUrl = `${appUrl}/auth/reset-password?token=${resetToken}`

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
            }),
          })
          .select('id')
          .single()

        if (error) {
          logs.push(`ERROR al crear usuario: ${error.message} (${error.code})`)
          return NextResponse.json({ logs, error: error.message })
        }

        logs.push(`Usuario creado: ${newUser.id}`)

        await awardPoints({ userId: newUser.id, actionType: POINT_ACTIONS.SIGNUP, description: 'Registro en la plataforma' })
        await awardPoints({ userId: newUser.id, actionType: POINT_ACTIONS.SUBSCRIPTION_ACTIVE, description: 'Primera suscripción activada' })
        if (referrerId) {
          await awardPoints({ userId: referrerId, actionType: POINT_ACTIONS.REFERRAL_SUBSCRIBED, description: `Referido ${name} se suscribió`, referenceType: 'user', referenceId: newUser.id })
        }

        const emailResult = await sendEmail({
          to: email,
          subject: '¡Bienvenido a Happy Sapiens! Crea tu contraseña',
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #18181b;">
              <h2>¡Tu suscripción está activa!</h2>
              <p>Hola ${name},</p>
              <p>Crea tu contraseña para acceder a la plataforma:</p>
              <a href="${setupUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Crear mi contraseña</a>
              <p style="color:#71717a;font-size:14px;">Este enlace es válido por 24 horas.</p>
            </div>
          `,
        })
        logs.push(`Email enviado: ${emailResult.success ? 'OK' : emailResult.error}`)
      }

      await supabaseAdmin.from('pending_checkout').delete().eq('email', email)
      logs.push('pending_checkout eliminado')

    } else if (type === 'subscription_authorized_payment') {
      logs.push(`Obteniendo pago ${id}...`)
      const payment = await paymentClient.get({ id })
      logs.push(`status: ${payment.status}, email: ${payment.payer?.email}`)

      if (payment.status !== 'approved') {
        return NextResponse.json({ logs, warning: `Pago no aprobado: ${payment.status}` })
      }

      const email = payment.payer?.email
      if (!email) return NextResponse.json({ logs, error: 'payer.email vacío' })

      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, name, subscription_variant_id, shipping_full_name, shipping_phone, shipping_address, shipping_city, shipping_department')
        .eq('email', email)
        .single()

      if (!user) return NextResponse.json({ logs, error: `Usuario no encontrado: ${email}` })

      logs.push(`Usuario encontrado: ${user.id}, variant_id: ${user.subscription_variant_id}`)

      await supabaseAdmin.from('users').update({ subscription_synced_at: new Date().toISOString() }).eq('id', user.id)

      if (user.subscription_variant_id) {
        const shippingAddress = user.shipping_address ? {
          fullName: user.shipping_full_name || user.name || email,
          phone: user.shipping_phone || '',
          address: user.shipping_address,
          city: user.shipping_city || '',
          department: user.shipping_department || '',
        } : undefined

        try {
          const order = await createShopifyOrder({ email, name: user.name || email, variantId: user.subscription_variant_id, shipping: shippingAddress })
          logs.push(`Orden Shopify creada: #${order.order_number}`)
        } catch (err) {
          logs.push(`ERROR Shopify: ${err instanceof Error ? err.message : String(err)}`)
        }
      } else {
        logs.push('subscription_variant_id es null — no se crea orden Shopify')
      }

    } else {
      return NextResponse.json({ error: `Tipo no soportado: ${type}. Usar 'preapproval' o 'subscription_authorized_payment'` }, { status: 400 })
    }

    return NextResponse.json({ ok: true, logs })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logs.push(`EXCEPCIÓN: ${msg}`)
    return NextResponse.json({ error: msg, logs }, { status: 500 })
  }
}
