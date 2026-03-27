import { NextResponse } from 'next/server'
import { paymentClient, preApprovalClient } from '@/lib/mercadopago'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { awardPoints, POINT_ACTIONS } from '@/lib/points'
import { randomBytes } from 'crypto'
import { hash } from 'bcryptjs'

async function sendWelcomeEmail(email: string, name: string, resetToken: string) {
  const appUrl = process.env.NEXTAUTH_URL || 'https://happy-sapiens.netlify.app'
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

async function handlePreApproval(preApprovalId: string) {
  const preApproval = await preApprovalClient.get({ id: preApprovalId })

  const email = preApproval.payer_email
  if (!email) return

  let name = email
  let referralCode: string | null = null

  if (preApproval.external_reference) {
    try {
      const parsed = JSON.parse(preApproval.external_reference)
      name = parsed.name || email
      referralCode = parsed.referralCode || null
    } catch {
      // external_reference no es JSON, ignorar
    }
  }

  const status = preApproval.status

  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (status === 'authorized') {
    if (existingUser) {
      await supabaseAdmin
        .from('users')
        .update({
          subscription_status: 'active',
          subscription_synced_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id)

      console.log(`Suscripción reactivada: ${email}`)
    } else {
      // Crear usuario nuevo
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

      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          name,
          email,
          role: 'user',
          subscription_status: 'active',
          subscription_synced_at: new Date().toISOString(),
          referred_by: referrerId,
          reset_token: resetToken,
          reset_token_expires: resetTokenExpires.toISOString(),
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error creando usuario:', error)
        return
      }

      console.log(`Usuario creado: ${email}`)

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
  } else if (status === 'cancelled' || status === 'paused') {
    if (existingUser) {
      await supabaseAdmin
        .from('users')
        .update({
          subscription_status: status === 'cancelled' ? 'cancelled' : 'paused',
          subscription_synced_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id)

      console.log(`Suscripción ${status}: ${email}`)
    }
  }
}

async function handlePayment(paymentId: string) {
  const payment = await paymentClient.get({ id: paymentId })

  if (payment.status !== 'approved') return

  // Pago de suscripción recurrente (cobro mensual automático)
  if (payment.subscription_id) {
    const email = payment.payer?.email
    if (!email) return

    await supabaseAdmin
      .from('users')
      .update({ subscription_synced_at: new Date().toISOString() })
      .eq('email', email)

    console.log(`Cobro recurrente procesado: ${email}`)
    return
  }

  // Pago único legacy (flujo anterior con create-preference)
  const userEmail = payment.metadata?.user_email as string
  const userName = payment.metadata?.user_name as string
  const userPassword = payment.metadata?.user_password as string
  const referralCode = payment.metadata?.referral_code as string | null

  if (!userEmail || !userName || !userPassword) return

  let referrerId: string | null = null
  if (referralCode) {
    const { data: referrer } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('referral_code', referralCode)
      .single()
    if (referrer) referrerId = referrer.id
  }

  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', userEmail)
    .single()

  if (existingUser) {
    await supabaseAdmin
      .from('users')
      .update({
        subscription_status: 'active',
        subscription_synced_at: new Date().toISOString(),
      })
      .eq('id', existingUser.id)

    await awardPoints({
      userId: existingUser.id,
      actionType: POINT_ACTIONS.SUBSCRIPTION_ACTIVE,
      description: 'Suscripción activada',
    })
  } else {
    const hashedPassword = await hash(userPassword, 12)

    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        name: userName,
        email: userEmail,
        password: hashedPassword,
        subscription_status: 'active',
        subscription_synced_at: new Date().toISOString(),
        referred_by: referrerId,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creando usuario:', error)
      return
    }

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
        description: `Referido ${userName} se suscribió`,
        referenceType: 'user',
        referenceId: newUser.id,
      })
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (body.type === 'preapproval') {
      await handlePreApproval(body.data.id)
    } else if (body.type === 'subscription_authorized_payment' || body.type === 'payment') {
      await handlePayment(body.data.id)
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
