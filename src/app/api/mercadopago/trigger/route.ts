import { NextResponse } from 'next/server'
import { preApprovalClient, paymentClient, getSubscriptionPlan } from '@/lib/mercadopago'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { awardPoints, POINT_ACTIONS } from '@/lib/points'
import { createShopifyOrder } from '@/lib/shopify'
import { dispatchShopifyOrder } from '@/lib/shopify-dispatch'
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

  const body = await req.json()
  const { type, id, email: bodyEmail } = body

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
          firstName: true,
          lastName: true,
          subscriptionVariantId: true,
          subscriptionPrice: true,
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

      if (!user) return NextResponse.json({ logs, error: `Usuario no encontrado: ${bodyEmail}` })
      logs.push(`Usuario: ${user.id}, variant_id: ${user.subscriptionVariantId}, price: ${user.subscriptionPrice?.toString() ?? 'no registrado'}`)

      if (!user.subscriptionVariantId) {
        return NextResponse.json({ logs, error: 'subscription_variant_id es null — no se puede crear la orden' })
      }

      const billingAddress = user.billingAddress ? {
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        phone: user.billingPhone || '',
        address: user.billingAddress,
        city: user.billingCity || '',
        department: user.billingDepartment || '',
      } : undefined

      const shippingAddress = user.shippingAddress ? {
        firstName: user.shippingFirstName || user.firstName || undefined,
        lastName: user.shippingLastName || user.lastName || undefined,
        fullName: user.shippingFullName || user.name || bodyEmail,
        phone: user.shippingPhone || '',
        address: user.shippingAddress,
        city: user.shippingCity || '',
        department: user.shippingDepartment || '',
      } : undefined

      const order = await createShopifyOrder({
        email: bodyEmail,
        name: user.name || bodyEmail,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        variantId: user.subscriptionVariantId,
        taxExempt: user.subscriptionTaxExempt === true,
        documentType: user.billingDocumentType,
        documentNumber: user.billingDocumentNumber,
        billing: billingAddress,
        shipping: shippingAddress,
      })
      logs.push(`Orden Shopify creada: #${order.order_number} (id: ${order.id})`)
      return NextResponse.json({ ok: true, logs })

    } else if (type === 'preapproval') {
      logs.push(`Obteniendo preapproval ${id}...`)
      const preApproval = await preApprovalClient.get({ id })
      logs.push(`status: ${preApproval.status}, email: ${preApproval.payer_email}`)

      const preApprovalAny = preApproval as unknown as Record<string, unknown>
      const subscriptionPrice = (preApprovalAny.auto_recurring as Record<string, unknown> | undefined)?.transaction_amount as number | undefined
      const nextPaymentDate = preApprovalAny.next_payment_date as string | undefined
      const dateCreated = preApprovalAny.date_created as string | undefined
      if (subscriptionPrice !== undefined) logs.push(`Precio suscripción: ${subscriptionPrice}`)
      if (nextPaymentDate) logs.push(`Próximo pago: ${nextPaymentDate}`)

      // external_reference puede ser el id de pending_checkout (formato nuevo, sin PII) o un
      // JSON legacy con email/nombre. Resolvemos identidad desde pending_checkout, users
      // (por subscriptionId) y el JSON legacy; los datos del plan vienen de getSubscriptionPlan.
      const ref = preApproval.external_reference || ''
      let legacy: Record<string, unknown> | null = null
      let pendingId: string | null = null
      if (ref) {
        if (ref.trim().startsWith('{')) {
          try { legacy = JSON.parse(ref); logs.push(`external_reference (legacy JSON): ${ref}`) }
          catch { logs.push('external_reference no es JSON válido') }
        } else {
          pendingId = ref
          logs.push(`external_reference (id pending_checkout): ${ref}`)
        }
      }

      const userBySubscription = await prisma.user.findFirst({
        where: { subscriptionId: id },
        select: {
          email: true, name: true, firstName: true, lastName: true,
          subscriptionProduct: true, subscriptionVariantId: true, subscriptionTaxExempt: true,
        },
      })
      const pendingById = pendingId
        ? await prisma.pendingCheckout.findUnique({ where: { id: pendingId } })
        : null

      const email = (legacy?.email as string) || pendingById?.email || userBySubscription?.email || preApproval.payer_email || ''
      if (!email) return NextResponse.json({ logs, error: 'email vacío en payer_email, pending_checkout y external_reference' })

      const productId = (legacy?.productId as string) || pendingById?.productId || userBySubscription?.subscriptionProduct || null
      const plan = productId ? await getSubscriptionPlan(productId) : null

      const name = (legacy?.name as string) || pendingById?.name || userBySubscription?.name || email
      let firstName = (legacy?.firstName as string) || pendingById?.firstName || userBySubscription?.firstName || null
      let lastName = (legacy?.lastName as string) || pendingById?.lastName || userBySubscription?.lastName || null
      let referralCode = (legacy?.referralCode as string) || pendingById?.referralCode || null
      const shopifyVariantId = plan?.shopifyVariantId || (legacy?.shopifyVariantId as string) || userBySubscription?.subscriptionVariantId || null
      const shopifyFirstOrderVariantId = plan?.shopifyFirstOrderVariantId || (legacy?.shopifyFirstOrderVariantId as string) || null
      const taxExempt = plan ? plan.taxExempt : (legacy?.taxExempt === true || userBySubscription?.subscriptionTaxExempt === true)

      if (preApproval.status !== 'authorized') {
        return NextResponse.json({ logs, warning: `Estado es '${preApproval.status}', no 'authorized'. No se procesará.` })
      }

      // email ya no es único en pending_checkout (un usuario puede tener varios
      // en vuelo). Priorizamos el resuelto por external_reference (por id); si no,
      // el más reciente de ese email.
      const pendingCheckout =
        pendingById ??
        (await prisma.pendingCheckout.findFirst({
          where: { email },
          orderBy: { createdAt: 'desc' },
          select: { id: true, billing: true, shipping: true, referralCode: true, firstName: true, lastName: true },
        }))

      logs.push(`pending_checkout: ${pendingCheckout ? 'encontrado' : 'no encontrado'}`)
      if (!referralCode && pendingCheckout?.referralCode) referralCode = pendingCheckout.referralCode
      if (!firstName && pendingCheckout?.firstName) firstName = pendingCheckout.firstName
      if (!lastName && pendingCheckout?.lastName) lastName = pendingCheckout.lastName

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
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
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
            shippingFirstName: shippingData.firstName || null,
            shippingLastName: shippingData.lastName || null,
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
              firstName,
              lastName,
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
                shippingFirstName: shippingData.firstName || null,
                shippingLastName: shippingData.lastName || null,
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
        if (pendingCheckout?.id) {
          await prisma.pendingCheckout.delete({ where: { id: pendingCheckout.id } })
          logs.push('pending_checkout eliminado')
        } else {
          logs.push('pending_checkout no existía')
        }
      } catch {
        // si no existe, ignorar (P2025)
        logs.push('pending_checkout no existía')
      }

      // Kit de bienvenida: solo en el primer pedido. A partir del 2º va el variant
      // recurrente. Se entrega el kit solo si el email no tiene ningún despacho
      // exitoso previo (cualquier clave). Mirror del webhook.
      const priorOrder = shopifyFirstOrderVariantId
        ? await prisma.shopifyOrderDispatch.findFirst({
            where: {
              email,
              status: 'created',
            },
            select: { id: true },
          })
        : null
      const useWelcomeKit = !!shopifyFirstOrderVariantId && !priorOrder
      const firstOrderVariantId = useWelcomeKit ? shopifyFirstOrderVariantId! : shopifyVariantId
      logs.push(`Kit de bienvenida: ${useWelcomeKit ? 'sí' : 'no'} (variant: ${firstOrderVariantId})`)

      if (firstOrderVariantId) {
        // Releer el User: pending_checkout pudo borrarse en una corrida previa;
        // las direcciones definitivas están en users.
        const userForOrder = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            firstName: true, lastName: true,
            billingDocumentType: true, billingDocumentNumber: true,
            billingPhone: true, billingAddress: true, billingCity: true, billingDepartment: true,
            shippingFullName: true, shippingFirstName: true, shippingLastName: true,
            shippingPhone: true, shippingAddress: true, shippingCity: true, shippingDepartment: true,
          },
        })

        const billingAddress = userForOrder?.billingAddress ? {
          firstName: userForOrder.firstName || undefined,
          lastName: userForOrder.lastName || undefined,
          phone: userForOrder.billingPhone || '',
          address: userForOrder.billingAddress,
          city: userForOrder.billingCity || '',
          department: userForOrder.billingDepartment || '',
        } : undefined

        const shippingAddress = userForOrder?.shippingAddress ? {
          firstName: userForOrder.shippingFirstName || userForOrder.firstName || undefined,
          lastName: userForOrder.shippingLastName || userForOrder.lastName || undefined,
          fullName: userForOrder.shippingFullName || name,
          phone: userForOrder.shippingPhone || '',
          address: userForOrder.shippingAddress,
          city: userForOrder.shippingCity || '',
          department: userForOrder.shippingDepartment || '',
        } : undefined

        try {
          const result = await dispatchShopifyOrder({
            idempotencyKey: `preapproval:${id}`,
            email,
            userId: userForOrder?.id ?? null,
            params: {
              email,
              name,
              firstName: userForOrder?.firstName || firstName || undefined,
              lastName: userForOrder?.lastName || lastName || undefined,
              variantId: firstOrderVariantId,
              taxExempt,
              documentType: userForOrder?.billingDocumentType ?? null,
              documentNumber: userForOrder?.billingDocumentNumber ?? null,
              note: useWelcomeKit
                ? 'Kit de bienvenida — primera entrega con accesorios de obsequio'
                : 'Primera entrega — suscripción activada vía MercadoPago',
              billing: billingAddress,
              shipping: shippingAddress,
            },
          })
          if (result.status === 'created') {
            logs.push(`Orden Shopify creada: #${result.order.order_number} (id: ${result.order.id})`)
          } else {
            logs.push(`Orden Shopify omitida (idempotencia): dispatch ${result.existing.status} ya existe (orden #${result.existing.shopifyOrderNumber ?? 'n/a'})`)
          }
        } catch (err) {
          logs.push(`ERROR Shopify: ${err instanceof Error ? err.message : String(err)}`)
        }
      } else {
        logs.push('No hay variant configurado — no se crea orden Shopify')
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
          firstName: true,
          lastName: true,
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
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          phone: user.billingPhone || '',
          address: user.billingAddress,
          city: user.billingCity || '',
          department: user.billingDepartment || '',
        } : undefined

        const shippingAddress = user.shippingAddress ? {
          firstName: user.shippingFirstName || user.firstName || undefined,
          lastName: user.shippingLastName || user.lastName || undefined,
          fullName: user.shippingFullName || user.name || email,
          phone: user.shippingPhone || '',
          address: user.shippingAddress,
          city: user.shippingCity || '',
          department: user.shippingDepartment || '',
        } : undefined

        try {
          const result = await dispatchShopifyOrder({
            idempotencyKey: `payment:${id}`,
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
              billing: billingAddress,
              shipping: shippingAddress,
            },
          })
          if (result.status === 'created') {
            logs.push(`Orden Shopify creada: #${result.order.order_number}`)
          } else {
            logs.push(`Orden Shopify omitida (idempotencia): dispatch ${result.existing.status} ya existe (orden #${result.existing.shopifyOrderNumber ?? 'n/a'})`)
          }
        } catch (err) {
          logs.push(`ERROR Shopify: ${err instanceof Error ? err.message : String(err)}`)
        }
      } else {
        logs.push('subscription_variant_id es null — no se crea orden Shopify')
      }

    } else if (type === 'simulate_subscription') {
      // Simula una suscripción sin pasar por Mercado Pago. Crea/actualiza el usuario
      // y dispara una orden Shopify usando los datos del body. mode='first' fuerza
      // el variant del kit de bienvenida; mode='recurring' usa el variant individual.
      const mode: 'first' | 'recurring' = body.mode === 'recurring' ? 'recurring' : 'first'
      const { email: simEmail, name, firstName, lastName, productId, billing, shipping } = body

      if (!simEmail || !name || !productId) {
        return NextResponse.json({ error: 'email, name y productId son requeridos' }, { status: 400 })
      }

      const plan = await getSubscriptionPlan(productId)
      if (!plan) {
        return NextResponse.json({ error: `Plan no encontrado: ${productId}` }, { status: 400 })
      }

      logs.push(`Plan: ${plan.id} | variant: ${plan.shopifyVariantId} | kit: ${plan.shopifyFirstOrderVariantId ?? 'no'} | taxExempt: ${plan.taxExempt}`)
      logs.push(`Modo: ${mode}`)

      const userData = {
        name,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        subscriptionStatus: 'active',
        subscriptionProduct: plan.id,
        subscriptionVariantId: plan.shopifyVariantId,
        subscriptionTaxExempt: plan.taxExempt,
        subscriptionPrice: plan.price,
        subscriptionSyncedAt: new Date(),
        subscriptionStartDate: new Date(),
        ...(billing && {
          billingDocumentType: billing.documentType ?? null,
          billingDocumentNumber: billing.documentNumber ?? null,
          billingPhone: billing.phone ?? null,
          billingAddress: billing.address ?? null,
          billingCity: billing.city ?? null,
          billingDepartment: billing.department ?? null,
        }),
        ...(shipping && {
          shippingFullName: shipping.fullName ?? null,
          shippingFirstName: shipping.firstName ?? null,
          shippingLastName: shipping.lastName ?? null,
          shippingPhone: shipping.phone ?? null,
          shippingAddress: shipping.address ?? null,
          shippingCity: shipping.city ?? null,
          shippingDepartment: shipping.department ?? null,
        }),
      }

      const user = await prisma.user.upsert({
        where: { email: simEmail },
        create: { email: simEmail, role: 'user', ...userData },
        update: userData,
        select: {
          id: true, firstName: true, lastName: true,
          billingDocumentType: true, billingDocumentNumber: true,
          billingPhone: true, billingAddress: true, billingCity: true, billingDepartment: true,
          shippingFullName: true, shippingFirstName: true, shippingLastName: true,
          shippingPhone: true, shippingAddress: true, shippingCity: true, shippingDepartment: true,
        },
      })
      logs.push(`Usuario upsert: ${user.id}`)

      const useWelcomeKit = mode === 'first' && !!plan.shopifyFirstOrderVariantId
      const variantId = useWelcomeKit ? plan.shopifyFirstOrderVariantId! : plan.shopifyVariantId

      if (!variantId) {
        return NextResponse.json({ logs, error: `Plan ${plan.id} no tiene variant configurado para modo ${mode}` })
      }
      logs.push(`Variant a usar: ${variantId} (kit: ${useWelcomeKit})`)

      const billingAddress = user.billingAddress ? {
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        phone: user.billingPhone || '',
        address: user.billingAddress,
        city: user.billingCity || '',
        department: user.billingDepartment || '',
      } : undefined

      const shippingAddress = user.shippingAddress ? {
        firstName: user.shippingFirstName || user.firstName || undefined,
        lastName: user.shippingLastName || user.lastName || undefined,
        fullName: user.shippingFullName || name,
        phone: user.shippingPhone || '',
        address: user.shippingAddress,
        city: user.shippingCity || '',
        department: user.shippingDepartment || '',
      } : undefined

      // Idempotency key único por corrida — permite reintentar el mismo email sin colisiones.
      const testKey = `simulate:${mode}:${Date.now()}:${randomBytes(4).toString('hex')}`

      const result = await dispatchShopifyOrder({
        idempotencyKey: testKey,
        email: simEmail,
        userId: user.id,
        params: {
          email: simEmail,
          name,
          firstName: user.firstName || firstName || undefined,
          lastName: user.lastName || lastName || undefined,
          variantId,
          taxExempt: plan.taxExempt,
          documentType: user.billingDocumentType,
          documentNumber: user.billingDocumentNumber,
          note: useWelcomeKit
            ? '[TEST] Kit de bienvenida — simulación'
            : '[TEST] Pedido recurrente — simulación',
          billing: billingAddress,
          shipping: shippingAddress,
        },
      })

      if (result.status === 'created') {
        logs.push(`Orden Shopify creada: #${result.order.order_number} (id: ${result.order.id})`)
        return NextResponse.json({ ok: true, logs, idempotencyKey: testKey, orderId: result.order.id, orderNumber: result.order.order_number })
      } else {
        logs.push(`Orden Shopify omitida: ${result.existing.status}`)
        return NextResponse.json({ ok: false, logs, idempotencyKey: testKey, existing: result.existing })
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
      return NextResponse.json({ error: `Tipo no soportado: ${type}. Usar 'preapproval', 'subscription_authorized_payment', 'resend_email', 'create_shopify_order', 'simulate_subscription' o 'list_shopify_products'` }, { status: 400 })
    }

    return NextResponse.json({ ok: true, logs })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logs.push(`EXCEPCIÓN: ${msg}`)
    return NextResponse.json({ error: msg, logs }, { status: 500 })
  }
}
