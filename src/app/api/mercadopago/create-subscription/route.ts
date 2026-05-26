import { NextResponse } from 'next/server'
import { preApprovalClient, getSubscriptionPlan } from '@/lib/mercadopago'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { userEmail, userName, userFirstName, userLastName, productId, referralCode, billing, shipping } = await req.json()

    if (!userEmail || !userName || !productId) {
      return NextResponse.json(
        { error: 'Nombre, email y producto son requeridos' },
        { status: 400 }
      )
    }

    const plan = await getSubscriptionPlan(productId)
    if (!plan) {
      return NextResponse.json({ error: 'Producto no válido' }, { status: 400 })
    }
    if (!plan.isActive) {
      return NextResponse.json(
        { error: 'Este plan no está disponible para contratar en este momento.' },
        { status: 400 }
      )
    }

    const baseUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL)?.replace(/\/$/, '')
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta' },
        { status: 500 }
      )
    }

    // Guardar datos del checkout ANTES de crear el preapproval: su id se usa como
    // external_reference (identificador opaco sin PII). MercadoPago modera el contenido
    // de external_reference y rechaza emails/PII embebidos (error invalid_field_content),
    // por eso ya no serializamos los datos del usuario ahí — el webhook los recupera
    // desde pending_checkout (por este id) y desde la fila users (eventos posteriores).
    const pendingCheckout = await prisma.pendingCheckout.upsert({
      where: { email: userEmail },
      create: {
        email: userEmail,
        name: userName,
        firstName: userFirstName || null,
        lastName: userLastName || null,
        productId: plan.id,
        referralCode: referralCode || null,
        billing: billing || null,
        shipping: shipping || null,
      },
      update: {
        name: userName,
        firstName: userFirstName || null,
        lastName: userLastName || null,
        productId: plan.id,
        referralCode: referralCode || null,
        billing: billing || null,
        shipping: shipping || null,
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const preApprovalBody: any = {
      payer_email: userEmail,
      back_url: `${baseUrl}/subscribe/success`,
      notification_url: `${baseUrl}/api/mercadopago/webhook`,
      reason: `${plan.title} - Happy Sapiens`,
      external_reference: pendingCheckout.id,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: plan.price,
        currency_id: plan.currency,
      },
    }

    const preApproval = await preApprovalClient.create({ body: preApprovalBody })

    return NextResponse.json({ initPoint: preApproval.init_point })
  } catch (error: unknown) {
    console.error('Error creando suscripción:', error)

    const rawMessage = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error)

    if (/different countries/i.test(rawMessage)) {
      return NextResponse.json(
        {
          error: 'Tu cuenta de Mercado Pago está registrada en un país distinto a Colombia y no permite suscripciones desde el exterior. Por favor usa un correo asociado a una cuenta de Mercado Pago de Colombia o crea una nueva cuenta colombiana para completar la compra.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: rawMessage }, { status: 500 })
  }
}
