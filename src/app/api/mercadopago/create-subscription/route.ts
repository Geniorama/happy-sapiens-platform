import { NextResponse } from 'next/server'
import { preApprovalClient, SUBSCRIPTION_PLANS } from '@/lib/mercadopago'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { userEmail, userName, productId, referralCode, billing, shipping } = await req.json()

    if (!userEmail || !userName || !productId) {
      return NextResponse.json(
        { error: 'Nombre, email y producto son requeridos' },
        { status: 400 }
      )
    }

    const plan = SUBSCRIPTION_PLANS[productId]
    if (!plan) {
      return NextResponse.json({ error: 'Producto no válido' }, { status: 400 })
    }

    const baseUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL)?.replace(/\/$/, '')
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta' },
        { status: 500 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const preApprovalBody: any = {
      payer_email: userEmail,
      back_url: `${baseUrl}/subscribe/success`,
      notification_url: `${baseUrl}/api/mercadopago/webhook`,
      reason: `${plan.title} - Happy Sapiens`,
      external_reference: JSON.stringify({
        name: userName,
        email: userEmail,
        productId: plan.id,
        shopifyVariantId: plan.shopifyVariantId,
        referralCode: referralCode || null,
      }),
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: plan.price,
        currency_id: plan.currency,
      },
    }

    const preApproval = await preApprovalClient.create({ body: preApprovalBody })

    // Guardar datos de facturación/envío en pending_checkout para el webhook
    await supabaseAdmin
      .from('pending_checkout')
      .upsert({
        email: userEmail,
        name: userName,
        product_id: plan.id,
        referral_code: referralCode || null,
        billing: billing || null,
        shipping: shipping || null,
      }, { onConflict: 'email' })

    return NextResponse.json({ initPoint: preApproval.init_point })
  } catch (error: unknown) {
    console.error('Error creando suscripción:', error)
    const errorMessage = error instanceof Error
      ? error.message
      : JSON.stringify(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
