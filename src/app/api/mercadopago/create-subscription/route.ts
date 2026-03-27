import { NextResponse } from 'next/server'
import { preApprovalClient, SUBSCRIPTION_PLAN } from '@/lib/mercadopago'

export async function POST(req: Request) {
  try {
    const { userEmail, userName, referralCode } = await req.json()

    if (!userEmail || !userName) {
      return NextResponse.json(
        { error: 'Nombre y email son requeridos' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta' },
        { status: 500 }
      )
    }

    const preApproval = await preApprovalClient.create({
      body: {
        payer_email: userEmail,
        back_url: `${baseUrl}/subscribe/success`,
        reason: SUBSCRIPTION_PLAN.title,
        external_reference: JSON.stringify({
          name: userName,
          referralCode: referralCode || null,
        }),
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: SUBSCRIPTION_PLAN.price,
          currency_id: SUBSCRIPTION_PLAN.currency,
        },
      },
    })

    return NextResponse.json({ initPoint: preApproval.init_point })
  } catch (error: unknown) {
    console.error('Error creando suscripción:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error al crear la suscripción'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
