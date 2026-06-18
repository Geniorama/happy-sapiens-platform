import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { awardPoints, POINT_ACTIONS } from '@/lib/points'
import { dispatchShopifyOrder } from '@/lib/shopify-dispatch'
import { preApprovalClient, getSubscriptionPlan } from '@/lib/mercadopago'
import { randomBytes } from 'crypto'
import { Prisma } from '@prisma/client'

// Aprovisionamiento de una suscripción a partir de una preaprobación de MercadoPago.
//
// Centraliza la lógica de "activar suscripción": crear/actualizar el usuario,
// enviar el correo de bienvenida y despachar la primera orden en Shopify. La usan
// tanto el webhook de MercadoPago como la herramienta de aprovisionamiento manual
// del admin, para que ambos caminos compartan exactamente el mismo comportamiento.

export async function logSubscription(
  action: string,
  email: string,
  metadata: Record<string, unknown>
) {
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

export type ProvisionResult =
  | { ok: false; reason: 'preapproval_fetch_error' | 'no_email' | 'pending_payment' | 'user_create_error' | 'wrong_status'; status?: string; detail?: string }
  | { ok: true; status: string; userCreated: boolean; order: 'created' | 'skipped' | 'none'; orderNumber?: number | null }

export async function provisionFromPreApproval(
  preApprovalId: string,
  opts: { chargeConfirmed?: boolean } = {}
): Promise<ProvisionResult> {
  let preApproval: Awaited<ReturnType<typeof preApprovalClient.get>>
  try {
    preApproval = await preApprovalClient.get({ id: preApprovalId })
  } catch (err) {
    console.error('[provision] error obteniendo preApproval:', preApprovalId, err)
    return { ok: false, reason: 'preapproval_fetch_error', detail: err instanceof Error ? err.message : String(err) }
  }

  await logSubscription('webhook.preapproval.received', preApproval.payer_email || 'unknown', {
    preApprovalId,
    status: preApproval.status,
    payer_email: preApproval.payer_email,
    external_reference: preApproval.external_reference,
  })

  const preApprovalAny = preApproval as unknown as Record<string, unknown>
  const subscriptionPrice = (preApprovalAny.auto_recurring as Record<string, unknown> | undefined)?.transaction_amount as number | undefined
  const nextPaymentDate = preApprovalAny.next_payment_date as string | undefined
  const dateCreated = preApprovalAny.date_created as string | undefined

  // Recuperación de identidad. payer_email viene vacío en el response de .get(), y MP ya no
  // permite PII en external_reference. Por eso resolvemos email/datos desde tres fuentes:
  //   1. external_reference = id de pending_checkout (formato nuevo, sin PII)
  //   2. external_reference = JSON legacy con email/nombre (preapprovals previos al fix)
  //   3. la fila users via subscriptionId (re-entregas y eventos de ciclo de vida: cancel/pause)
  // Los datos del plan (variant/taxExempt) se derivan de productId con getSubscriptionPlan.
  const ref = preApproval.external_reference || ''
  let legacy: Record<string, unknown> | null = null
  let pendingId: string | null = null
  if (ref) {
    if (ref.trim().startsWith('{')) {
      try { legacy = JSON.parse(ref) } catch { legacy = null }
    } else {
      pendingId = ref
    }
  }

  const userBySubscription = await prisma.user.findFirst({
    where: { subscriptionId: preApprovalId },
    select: {
      email: true, name: true, firstName: true, lastName: true,
      subscriptionProduct: true, subscriptionVariantId: true, subscriptionTaxExempt: true,
    },
  })

  const pending = pendingId
    ? await prisma.pendingCheckout.findUnique({ where: { id: pendingId } })
    : null

  const email = (legacy?.email as string) || pending?.email || userBySubscription?.email || preApproval.payer_email || ''
  if (!email) return { ok: false, reason: 'no_email' }

  const productId = (legacy?.productId as string) || pending?.productId || userBySubscription?.subscriptionProduct || null
  const plan = productId ? await getSubscriptionPlan(productId) : null

  const name = (legacy?.name as string) || pending?.name || userBySubscription?.name || email
  let firstName = (legacy?.firstName as string) || pending?.firstName || userBySubscription?.firstName || null
  let lastName = (legacy?.lastName as string) || pending?.lastName || userBySubscription?.lastName || null
  let referralCode = (legacy?.referralCode as string) || pending?.referralCode || null
  const shopifyVariantId = plan?.shopifyVariantId || (legacy?.shopifyVariantId as string) || userBySubscription?.subscriptionVariantId || null
  const shopifyFirstOrderVariantId = plan?.shopifyFirstOrderVariantId || (legacy?.shopifyFirstOrderVariantId as string) || null
  const taxExempt = plan ? plan.taxExempt : (legacy?.taxExempt === true || userBySubscription?.subscriptionTaxExempt === true)

  const status = preApproval.status

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (status === 'authorized') {
    // Una preaprobación 'authorized' significa que el MANDATO de cobro quedó
    // habilitado, NO que se haya cobrado con éxito. Mercado Pago mantiene la
    // suscripción en 'authorized' mientras reintenta cobros que fallan (p.ej.
    // tarjeta sin fondos). No activamos al usuario hasta confirmar al menos un
    // cobro exitoso; de lo contrario quedaría una suscripción activa sin pago.
    //
    // `chargeConfirmed` lo pasa quien ya tiene en mano un pago 'approved' de esta
    // suscripción: ese pago ES la confirmación del cobro. El agregado `summarized`
    // de la preaprobación es eventualmente consistente y suele seguir reportando
    // charged_quantity:0 en el instante del webhook de pago — re-chequearlo aquí
    // descartaba activaciones reales (cuenta + orden Shopify nunca creadas pese al
    // cobro). Con la confirmación explícita no dependemos de ese agregado rezagado.
    const summarized = (preApprovalAny.summarized ?? {}) as Record<string, unknown>
    const chargedQuantity = Number(summarized.charged_quantity ?? 0)
    const hasSuccessfulCharge =
      opts.chargeConfirmed === true || chargedQuantity > 0 || !!summarized.last_charged_date

    if (!hasSuccessfulCharge) {
      await logSubscription('webhook.preapproval.pending_payment', email, {
        preApprovalId,
        status,
        charged_quantity: summarized.charged_quantity ?? null,
      })
      console.log(`Suscripción autorizada sin cobro confirmado, en espera de pago: ${email}`)
      return { ok: false, reason: 'pending_payment', status }
    }

    // Leer datos de facturación/envío del checkout pendiente
    const pendingCheckout = await prisma.pendingCheckout.findUnique({
      where: { email },
      select: { billing: true, shipping: true, referralCode: true, firstName: true, lastName: true },
    })

    const billingData = pendingCheckout?.billing as Record<string, string> | null
    const shippingData = pendingCheckout?.shipping as Record<string, string> | null
    // Si el referralCode viene del pending_checkout, tiene prioridad
    if (!referralCode && pendingCheckout?.referralCode) {
      referralCode = pendingCheckout.referralCode
    }
    if (!firstName && pendingCheckout?.firstName) firstName = pendingCheckout.firstName
    if (!lastName && pendingCheckout?.lastName) lastName = pendingCheckout.lastName

    let userCreated = false

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
            firstName,
            lastName,
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
              shippingFirstName: shippingData.firstName || null,
              shippingLastName: shippingData.lastName || null,
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
        await logSubscription('webhook.preapproval.user_create_error', email, { error: msg, code })
        return { ok: false, reason: 'user_create_error', detail: msg }
      }

      userCreated = true

      await logSubscription('webhook.preapproval.user_created', email, { userId: newUser.id, productId })
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

    // Crear primer pedido en Shopify al activar la suscripción.
    //
    // Kit de bienvenida: se entrega SOLO en el primer pedido del suscriptor. A
    // partir del 2º pedido siempre va el variant recurrente. Para decidirlo
    // miramos si el email ya tiene CUALQUIER despacho exitoso previo (cualquier
    // clave: `preapproval:` del kit o `payment:` de un recurrente), no solo el del
    // kit. Así, una reentrega o reaprovisionamiento posterior nunca vuelve a
    // mandar el kit. Consultamos shopify_order_dispatches en vez de `!existingUser`
    // porque las reentregas del webhook crean al user en la primera pasada.
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

    let orderOutcome: 'created' | 'skipped' | 'none' = 'none'
    let orderNumber: number | null = null

    if (firstOrderVariantId) {
      // Releer el User: pending_checkout se borra al final del handler, así que
      // en reentregas la única fuente confiable de direcciones es la fila users.
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

      const billingAddress = userForOrder?.billingAddress
        ? {
            firstName: userForOrder.firstName || undefined,
            lastName: userForOrder.lastName || undefined,
            phone: userForOrder.billingPhone || '',
            address: userForOrder.billingAddress,
            city: userForOrder.billingCity || '',
            department: userForOrder.billingDepartment || '',
          }
        : undefined

      const shippingAddress = userForOrder?.shippingAddress
        ? {
            firstName: userForOrder.shippingFirstName || userForOrder.firstName || undefined,
            lastName: userForOrder.shippingLastName || userForOrder.lastName || undefined,
            fullName: userForOrder.shippingFullName || name,
            phone: userForOrder.shippingPhone || '',
            address: userForOrder.shippingAddress,
            city: userForOrder.shippingCity || '',
            department: userForOrder.shippingDepartment || '',
          }
        : undefined

      try {
        const result = await dispatchShopifyOrder({
          idempotencyKey: `preapproval:${preApprovalId}`,
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
          orderOutcome = 'created'
          orderNumber = result.order.order_number
          await logSubscription('webhook.preapproval.shopify_order_created', email, {
            order_number: result.order.order_number,
            order_id: result.order.id,
            welcomeKit: useWelcomeKit,
            variantId: firstOrderVariantId,
            preApprovalId,
          })
          console.log(`Orden Shopify creada: #${result.order.order_number} para ${email}${useWelcomeKit ? ' (Kit bienvenida)' : ''}`)
        } else {
          orderOutcome = 'skipped'
          orderNumber = result.existing.shopifyOrderNumber
          await logSubscription('webhook.preapproval.shopify_order_skipped', email, {
            reason: 'duplicate_dispatch',
            preApprovalId,
            existing: result.existing,
          })
          console.log(`Orden Shopify omitida (idempotencia) para ${email}: ya existe dispatch ${result.existing.status}`)
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        await logSubscription('webhook.preapproval.shopify_order_error', email, { error: errMsg, variantId: firstOrderVariantId, preApprovalId })
        console.error('Error creando orden en Shopify:', err)
        throw err
      }
    }

    // Limpiar el checkout pendiente
    try {
      await prisma.pendingCheckout.delete({ where: { email } })
    } catch {
      // si no existe, ignorar (P2025)
    }

    return { ok: true, status, userCreated, order: orderOutcome, orderNumber }
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
    return { ok: false, reason: 'wrong_status', status }
  }

  return { ok: false, reason: 'wrong_status', status }
}

export type RecurringOrderResult =
  | { ok: false; reason: 'no_payment' | 'no_user' | 'no_variant'; detail?: string }
  | { ok: true; order: 'created' | 'skipped'; orderNumber: number | null }

// (Re)crea el pedido en Shopify de un cobro recurrente concreto, a partir de su
// mercadopagoPaymentId. Replica el despacho recurrente del webhook (misma clave de
// idempotencia `payment:<id>` y el variant recurrente del usuario), así que es
// seguro reejecutarlo: no duplica un pedido ya creado. Se apoya en el
// payment_transactions que ya registramos al procesar el cobro — no vuelve a
// consultar MercadoPago.
export async function provisionRecurringOrder(
  mpPaymentId: string
): Promise<RecurringOrderResult> {
  const tx = await prisma.paymentTransaction.findUnique({
    where: { mercadopagoPaymentId: mpPaymentId },
    select: { amount: true, paymentDate: true, userId: true },
  })
  if (!tx || !tx.userId) return { ok: false, reason: 'no_payment' }

  const user = await prisma.user.findUnique({
    where: { id: tx.userId },
    select: {
      id: true, email: true, name: true, firstName: true, lastName: true,
      subscriptionVariantId: true, subscriptionTaxExempt: true,
      billingDocumentType: true, billingDocumentNumber: true,
      billingPhone: true, billingAddress: true, billingCity: true, billingDepartment: true,
      shippingFullName: true, shippingFirstName: true, shippingLastName: true,
      shippingPhone: true, shippingAddress: true, shippingCity: true, shippingDepartment: true,
    },
  })
  if (!user || !user.email) return { ok: false, reason: 'no_user' }
  if (!user.subscriptionVariantId) return { ok: false, reason: 'no_variant' }

  const email = user.email

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

  const paymentDateStr = (tx.paymentDate ?? new Date()).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
  })
  const orderNote = `Suscripción mensual — ${paymentDateStr} | Pago MP #${mpPaymentId} | Cobro automático MercadoPago`

  try {
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
      await logSubscription('webhook.payment.shopify_order_created', email, {
        order_number: result.order.order_number,
        order_id: result.order.id,
        paymentId: mpPaymentId,
        source: 'admin_reprovision',
      })
      return { ok: true, order: 'created', orderNumber: result.order.order_number }
    }
    await logSubscription('webhook.payment.shopify_order_skipped', email, {
      reason: 'duplicate_dispatch',
      paymentId: mpPaymentId,
      existing: result.existing,
      source: 'admin_reprovision',
    })
    return { ok: true, order: 'skipped', orderNumber: result.existing.shopifyOrderNumber }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    await logSubscription('webhook.payment.shopify_order_error', email, {
      error: errMsg,
      variantId: user.subscriptionVariantId,
      paymentId: mpPaymentId,
      source: 'admin_reprovision',
    })
    throw err
  }
}
