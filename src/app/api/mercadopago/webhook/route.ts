import { NextResponse } from 'next/server'
import { paymentClient } from '@/lib/mercadopago'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateSubscriptionEndDate } from '@/lib/mercadopago'
import { hash } from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Mercado Pago envía notificaciones de diferentes tipos
    if (body.type === 'payment') {
      const paymentId = body.data.id

      // Obtener información del pago
      const payment = await paymentClient.get({ id: paymentId })

      console.log('Webhook recibido - Payment:', {
        id: payment.id,
        status: payment.status,
        email: payment.payer?.email,
      })

      // Solo procesar pagos aprobados
      if (payment.status === 'approved') {
        const userEmail = payment.metadata?.user_email as string
        const userName = payment.metadata?.user_name as string
        const userPassword = payment.metadata?.user_password as string
        const referralCode = payment.metadata?.referral_code as string | null

        if (!userEmail || !userName || !userPassword) {
          console.error('Faltan datos en metadata del pago')
          return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
        }

        // Si hay código de referido, buscar el usuario referidor
        let referrerId: string | null = null
        if (referralCode) {
          const { data: referrer } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('referral_code', referralCode)
            .single()
          
          if (referrer) {
            referrerId = referrer.id
            console.log('Usuario referido por:', referralCode)
          }
        }

        // Verificar si el usuario ya existe
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', userEmail)
          .single()

        if (existingUser) {
          // Actualizar suscripción del usuario existente
          const startDate = new Date()
          const endDate = calculateSubscriptionEndDate(startDate)

          await supabaseAdmin
            .from('users')
            .update({
              subscription_status: 'active',
              subscription_start_date: startDate.toISOString(),
              subscription_end_date: endDate.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingUser.id)

          // Registrar transacción
          await supabaseAdmin.from('payment_transactions').insert({
            user_id: existingUser.id,
            mercadopago_payment_id: payment.id?.toString(),
            status: 'approved',
            amount: payment.transaction_amount,
            currency: payment.currency_id,
            payment_method: payment.payment_method_id,
            payment_date: new Date().toISOString(),
            metadata: payment.metadata as any,
          })

          // Registrar en historial
          await supabaseAdmin.from('subscription_history').insert({
            user_id: existingUser.id,
            action: 'renewed',
            previous_status: 'inactive',
            new_status: 'active',
            amount: payment.transaction_amount,
            notes: 'Pago aprobado vía webhook',
          })
        } else {
          // Crear nuevo usuario con suscripción activa
          const hashedPassword = await hash(userPassword, 12)
          const startDate = new Date()
          const endDate = calculateSubscriptionEndDate(startDate)

          const { data: newUser, error } = await supabaseAdmin
            .from('users')
            .insert({
              name: userName,
              email: userEmail,
              password: hashedPassword,
              subscription_status: 'active',
              subscription_start_date: startDate.toISOString(),
              subscription_end_date: endDate.toISOString(),
              referred_by: referrerId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (error) {
            console.error('Error creando usuario:', error)
            return NextResponse.json({ error: 'Error creando usuario' }, { status: 500 })
          }

          // Registrar transacción
          await supabaseAdmin.from('payment_transactions').insert({
            user_id: newUser.id,
            mercadopago_payment_id: payment.id?.toString(),
            status: 'approved',
            amount: payment.transaction_amount,
            currency: payment.currency_id,
            payment_method: payment.payment_method_id,
            payment_date: new Date().toISOString(),
            metadata: payment.metadata as any,
          })

          // Registrar en historial
          await supabaseAdmin.from('subscription_history').insert({
            user_id: newUser.id,
            action: 'created',
            new_status: 'active',
            amount: payment.transaction_amount,
            notes: 'Primera suscripción - Pago aprobado',
          })
        }
      }
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
