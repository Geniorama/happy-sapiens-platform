import { NextResponse } from 'next/server'
import { preferenceClient, SUBSCRIPTION_PLAN } from '@/lib/mercadopago'

export async function POST(req: Request) {
  try {
    const { userEmail, userName, userPassword, referralCode } = await req.json()

    if (!userEmail || !userName || !userPassword) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    // Validar que NEXTAUTH_URL esté configurado
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl) {
      console.error('NEXTAUTH_URL no está configurado en las variables de entorno')
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta' },
        { status: 500 }
      )
    }

    console.log('Creando preferencia de Mercado Pago para:', userEmail)

    // Crear preferencia de pago en Mercado Pago
    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: 'subscription_monthly',
            title: SUBSCRIPTION_PLAN.title,
            description: SUBSCRIPTION_PLAN.description,
            quantity: 1,
            unit_price: SUBSCRIPTION_PLAN.price,
            currency_id: SUBSCRIPTION_PLAN.currency,
          },
        ],
        payer: {
          email: userEmail,
          name: userName,
        },
        back_urls: {
          success: `${baseUrl}/payment/success`,
          failure: `${baseUrl}/payment/failure`,
          pending: `${baseUrl}/payment/pending`,
        },
        notification_url: `${baseUrl}/api/mercadopago/webhook`,
        metadata: {
          user_email: userEmail,
          user_name: userName,
          user_password: userPassword,
          subscription_type: 'monthly',
          referral_code: referralCode || null,
        },
      },
    })

    return NextResponse.json({
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
    })
  } catch (error: unknown) {
    console.error('Error creando preferencia:', error)
    const errorMessage = error instanceof Error 
      ? (error.message || error.cause || 'Error al crear preferencia de pago')
      : 'Error al crear preferencia de pago'
    return NextResponse.json(
      { error: errorMessage, details: error },
      { status: 500 }
    )
  }
}
