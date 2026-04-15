import { NextResponse } from 'next/server'
import { preApprovalClient, paymentClient } from '@/lib/mercadopago'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { awardPoints, POINT_ACTIONS } from '@/lib/points'
import { createShopifyOrder } from '@/lib/shopify'
import { randomBytes } from 'crypto'
import { Prisma } from '@prisma/client'

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

      const user = await prisma.user.findUnique({
        where: { email: bodyEmail },
        select: { id: true, name: true, resetToken: true, resetTokenExpires: true },
      })

      if (!user) return NextResponse.json({ logs, error: `Usuario no encontrado: ${bodyEmail}` })

      // Regenerar token si expiró o no existe
      let token = user.resetToken
      const expires = user.resetTokenExpires
      if (!token || !expires || expires < new Date()) {
        token = randomBytes(32).toString('hex')
        const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)
        await prisma.user.update({
          where: { id: user.id },
          data: { resetToken: token, resetTokenExpires: newExpires },
        })
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

      const user = await prisma.user.findUnique({
        where: { email: bodyEmail },
        select: {
          id: true,
          name: true,
          subscriptionVariantId: true,
          subscriptionPrice: true,
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

      if (!user) return NextResponse.json({ logs, error: `Usuario no encontrado: ${bodyEmail}` })
      logs.push(`Usuario: ${user.id}, variant_id: ${user.subscriptionVariantId}, price: ${user.subscriptionPrice?.toString() ?? 'no registrado'}`)

      if (!user.subscriptionVariantId) {
        return NextResponse.json({ logs, error: 'subscription_variant_id es null — no se puede crear la orden' })
      }

      const billingAddress = user.billingAddress ? {
        phone: user.billingPhone || '',
        address: user.billingAddress,
        city: user.billingCity || '',
        department: user.billingDepartment || '',
      } : undefined

      const shippingAddress = user.shippingAddress ? {
        fullName: user.shippingFullName || user.name || bodyEmail,
        phone: user.shippingPhone || '',
        address: user.shippingAddress,
        city: user.shippingCity || '',
        department: user.shippingDepartment || '',
      } : undefined

      const order = await createShopifyOrder({
        email: bodyEmail,
        name: user.name || bodyEmail,
        variantId: user.subscriptionVariantId,
        price: user.subscriptionPrice ? Number(user.subscriptionPrice) : undefined,
        taxExempt: user.subscriptionTaxExempt === true,
        billing: billingAddress,
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
      let taxExempt = false
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
          taxExempt = parsed.taxExempt === true
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

      const pendingCheckout = await prisma.pendingCheckout.findUnique({
        where: { email },
        select: { billing: true, shipping: true, referralCode: true },
      })

      logs.push(`pending_checkout: ${pendingCheckout ? 'encontrado' : 'no encontrado'}`)
      if (!referralCode && pendingCheckout?.referralCode) referralCode = pendingCheckout.referralCode

      const billingData = pendingCheckout?.billing as Record<string, string> | null
      const shippingData = pendingCheckout?.shipping as Record<string, string> | null

      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      })

      if (existingUser) {
        const updateData: Prisma.UserUpdateInput = {
          subscriptionStatus: 'active',
          subscriptionId: id,
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
          }),
        }
        await prisma.user.update({ where: { id: existingUser.id }, data: updateData })
        logs.push(`Usuario existente actualizado: ${existingUser.id}`)
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
        const appUrl = (process.env.NEXTAUTH_URL || 'https://happy-sapiens.netlify.app').replace(/\/$/, '')
        const setupUrl = `${appUrl}/auth/reset-password?token=${resetToken}`

        let newUser
        try {
          newUser = await prisma.user.create({
            data: {
              name,
              email,
              role: 'user',
              subscriptionStatus: 'active',
              subscriptionId: id,
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
              }),
            },
            select: { id: true },
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          const code = err instanceof Prisma.PrismaClientKnownRequestError ? err.code : ''
          logs.push(`ERROR al crear usuario: ${msg} (${code})`)
          return NextResponse.json({ logs, error: msg })
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

      try {
        await prisma.pendingCheckout.delete({ where: { email } })
        logs.push('pending_checkout eliminado')
      } catch {
        // si no existe, ignorar (P2025)
        logs.push('pending_checkout no existía')
      }

      if (shopifyVariantId) {
        const billingAddress = billingData ? {
          phone: billingData.phone || '',
          address: billingData.address,
          city: billingData.city || '',
          department: billingData.department || '',
        } : undefined

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
            taxExempt,
            note: 'Primera entrega — suscripción activada vía MercadoPago',
            billing: billingAddress,
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

      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
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

      if (!user) return NextResponse.json({ logs, error: `Usuario no encontrado: ${email}` })

      logs.push(`Usuario encontrado: ${user.id}, variant_id: ${user.subscriptionVariantId}`)

      const recurringPrice = payment.transaction_amount ?? undefined
      logs.push(`Precio pago: ${recurringPrice ?? 'no disponible'}`)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionSyncedAt: new Date(),
          ...(recurringPrice !== undefined && { subscriptionPrice: recurringPrice }),
        },
      })

      if (user.subscriptionVariantId) {
        const billingAddress = user.billingAddress ? {
          phone: user.billingPhone || '',
          address: user.billingAddress,
          city: user.billingCity || '',
          department: user.billingDepartment || '',
        } : undefined

        const shippingAddress = user.shippingAddress ? {
          fullName: user.shippingFullName || user.name || email,
          phone: user.shippingPhone || '',
          address: user.shippingAddress,
          city: user.shippingCity || '',
          department: user.shippingDepartment || '',
        } : undefined

        try {
          const order = await createShopifyOrder({ email, name: user.name || email, variantId: user.subscriptionVariantId, price: recurringPrice, taxExempt: user.subscriptionTaxExempt === true, billing: billingAddress, shipping: shippingAddress })
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
