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

  const { type, id, email: bodyEmail } = await req.json()

  if (!type) {
    return NextResponse.json({ error: 'type es requerido' }, { status: 400 })
  }

  const logs: string[] = []

  try {
    if (type === 'resend_email') {
      if (!bodyEmail) return NextResponse.json({ error: 'email es requerido para resend_email' }, { status: 400 })

      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, name, reset_token, reset_token_expires')
        .eq('email', bodyEmail)
        .single()

      if (!user) return NextResponse.json({ logs, error: `Usuario no encontrado: ${bodyEmail}` })

      // Regenerar token si expiró o no existe
      let token = user.reset_token
      const expires = user.reset_token_expires ? new Date(user.reset_token_expires) : null
      if (!token || !expires || expires < new Date()) {
        token = randomBytes(32).toString('hex')
        const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)
        await supabaseAdmin
          .from('users')
          .update({ reset_token: token, reset_token_expires: newExpires.toISOString() })
          .eq('id', user.id)
        logs.push('Token regenerado (estaba expirado o ausente)')
      } else {
        logs.push('Token existente reutilizado')
      }

      const appUrl = (process.env.NEXTAUTH_URL || 'https://happy-sapiens.netlify.app').replace(/\/$/, '')
      const setupUrl = `${appUrl}/auth/reset-password?token=${token}`

      const result = await sendEmail({
        to: bodyEmail,
        subject: '¡Bienvenido a Happy Sapiens! Crea tu contraseña',
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #18181b;">
            <h2>¡Tu suscripción está activa!</h2>
            <p>Hola ${user.name},</p>
            <p>Crea tu contraseña para acceder a la plataforma:</p>
            <a href="${setupUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Crear mi contraseña</a>
            <p style="color:#71717a;font-size:14px;">Este enlace es válido por 24 horas.</p>
          </div>
        `,
      })

      logs.push(`Email enviado: ${result.success ? 'OK' : result.error}`)
      return NextResponse.json({ ok: result.success, logs })

    } else if (type === 'create_shopify_order') {
      if (!bodyEmail) return NextResponse.json({ error: 'email es requerido para create_shopify_order' }, { status: 400 })

      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, name, subscription_variant_id, subscription_price, shipping_full_name, shipping_phone, shipping_address, shipping_city, shipping_department')
        .eq('email', bodyEmail)
        .single()

      if (!user) return NextResponse.json({ logs, error: `Usuario no encontrado: ${bodyEmail}` })
      logs.push(`Usuario: ${user.id}, variant_id: ${user.subscription_variant_id}, price: ${user.subscription_price ?? 'no registrado'}`)

      if (!user.subscription_variant_id) {
        return NextResponse.json({ logs, error: 'subscription_variant_id es null — no se puede crear la orden' })
      }

      const shippingAddress = user.shipping_address ? {
        fullName: user.shipping_full_name || user.name || bodyEmail,
        phone: user.shipping_phone || '',
        address: user.shipping_address,
        city: user.shipping_city || '',
        department: user.shipping_department || '',
      } : undefined

      const order = await createShopifyOrder({
        email: bodyEmail,
        name: user.name || bodyEmail,
        variantId: user.subscription_variant_id,
        price: user.subscription_price ?? undefined,
        shipping: shippingAddress,
      })
      logs.push(`Orden Shopify creada: #${order.order_number} (id: ${order.id})`)
      return NextResponse.json({ ok: true, logs })

    } else if (type === 'preapproval') {
      logs.push(`Obteniendo preapproval ${id}...`)
      const preApproval = await preApprovalClient.get({ id })
      logs.push(`status: ${preApproval.status}, email: ${preApproval.payer_email}`)

      let email = preApproval.payer_email || ''
      let name = email
      let productId: string | null = null
      let shopifyVariantId: string | null = null
      let referralCode: string | null = null
      const preApprovalAny = preApproval as unknown as Record<string, unknown>
      const subscriptionPrice = (preApprovalAny.auto_recurring as Record<string, unknown> | undefined)?.transaction_amount as number | undefined
      const nextPaymentDate = preApprovalAny.next_payment_date as string | undefined
      const dateCreated = preApprovalAny.date_created as string | undefined
      if (subscriptionPrice !== undefined) logs.push(`Precio suscripción: ${subscriptionPrice}`)
      if (nextPaymentDate) logs.push(`Próximo pago: ${nextPaymentDate}`)

      if (preApproval.external_reference) {
        try {
          const parsed = JSON.parse(preApproval.external_reference)
          if (!email && parsed.email) email = parsed.email
          name = parsed.name || email
          productId = parsed.productId || null
          shopifyVariantId = parsed.shopifyVariantId || null
          referralCode = parsed.referralCode || null
          logs.push(`external_reference: ${JSON.stringify(parsed)}`)
        } catch {
          logs.push('external_reference no es JSON válido')
        }
      }

      if (!email) return NextResponse.json({ logs, error: 'email vacío en payer_email y external_reference' })

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
            subscription_id: id,
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
            subscription_id: id,
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

      if (shopifyVariantId) {
        const shippingAddress = shippingData ? {
          fullName: shippingData.fullName || name,
          phone: shippingData.phone || '',
          address: shippingData.address,
          city: shippingData.city || '',
          department: shippingData.department || '',
        } : undefined

        try {
          const order = await createShopifyOrder({
            email,
            name,
            variantId: shopifyVariantId,
            price: subscriptionPrice,
            note: 'Primera entrega — suscripción activada vía MercadoPago',
            shipping: shippingAddress,
          })
          logs.push(`Orden Shopify creada: #${order.order_number} (id: ${order.id})`)
        } catch (err) {
          logs.push(`ERROR Shopify: ${err instanceof Error ? err.message : String(err)}`)
        }
      } else {
        logs.push('shopifyVariantId es null — no se crea orden Shopify')
      }

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

      const recurringPrice = payment.transaction_amount ?? undefined
      logs.push(`Precio pago: ${recurringPrice ?? 'no disponible'}`)
      await supabaseAdmin.from('users').update({
        subscription_synced_at: new Date().toISOString(),
        ...(recurringPrice !== undefined && { subscription_price: recurringPrice }),
      }).eq('id', user.id)

      if (user.subscription_variant_id) {
        const shippingAddress = user.shipping_address ? {
          fullName: user.shipping_full_name || user.name || email,
          phone: user.shipping_phone || '',
          address: user.shipping_address,
          city: user.shipping_city || '',
          department: user.shipping_department || '',
        } : undefined

        try {
          const order = await createShopifyOrder({ email, name: user.name || email, variantId: user.subscription_variant_id, price: recurringPrice, shipping: shippingAddress })
          logs.push(`Orden Shopify creada: #${order.order_number}`)
        } catch (err) {
          logs.push(`ERROR Shopify: ${err instanceof Error ? err.message : String(err)}`)
        }
      } else {
        logs.push('subscription_variant_id es null — no se crea orden Shopify')
      }

    } else if (type === 'list_shopify_products') {
      const domain = process.env.SHOPIFY_SHOP_DOMAIN!
      const token = process.env.SHOPIFY_ADMIN_API_TOKEN!
      const res = await fetch(`https://${domain}/admin/api/2026-01/products.json?fields=id,title,variants&limit=50`, {
        headers: { 'X-Shopify-Access-Token': token },
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) return NextResponse.json({ error: data.errors }, { status: 400 })
      const products = (data.products as { id: number; title: string; variants: { id: number; title: string }[] }[])
        .map(p => ({ title: p.title, variants: p.variants.map(v => ({ id: v.id, title: v.title })) }))
      return NextResponse.json({ ok: true, products })

    } else {
      return NextResponse.json({ error: `Tipo no soportado: ${type}. Usar 'preapproval', 'subscription_authorized_payment', 'resend_email', 'create_shopify_order' o 'list_shopify_products'` }, { status: 400 })
    }

    return NextResponse.json({ ok: true, logs })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logs.push(`EXCEPCIÓN: ${msg}`)
    return NextResponse.json({ error: msg, logs }, { status: 500 })
  }
}
