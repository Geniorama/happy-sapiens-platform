import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { supabaseAdmin } from "@/lib/supabase"
import { sendEmail } from "@/lib/email"

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ error: "El email es requerido" }, { status: 400 })
  }

  // Verificar si el usuario existe (sin revelar si existe o no en el mensaje al cliente)
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, name")
    .eq("email", email.toLowerCase())
    .single()

  // Si el usuario no existe, respondemos igual para no revelar información
  if (user) {
    const token = randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    await supabaseAdmin
      .from("users")
      .update({
        reset_token: token,
        reset_token_expires: expires.toISOString(),
      })
      .eq("id", user.id)

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const resetUrl = `${appUrl}/auth/reset-password?token=${token}`

    await sendEmail({
      to: email,
      subject: "Recuperación de contraseña - Happy Sapiens",
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #18181b;">
          <img src="${appUrl}/hs-logo.svg" alt="Happy Sapiens" style="width: 160px; margin-bottom: 24px;" />
          <h2 style="margin-bottom: 8px;">Recupera tu contraseña</h2>
          <p>Hola${user.name ? ` ${user.name}` : ""},</p>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón para continuar:</p>
          <a
            href="${resetUrl}"
            style="display:inline-block;margin:24px 0;padding:12px 28px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;"
          >
            Restablecer contraseña
          </a>
          <p style="color:#71717a;font-size:14px;">Este enlace es válido por 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.</p>
          <p style="color:#71717a;font-size:14px;">Si el botón no funciona, copia y pega esta URL en tu navegador:<br/><a href="${resetUrl}" style="color:#16a34a;">${resetUrl}</a></p>
        </div>
      `,
    })
  }

  // Siempre responder con éxito
  return NextResponse.json({
    message: "Si el email está registrado, recibirás un enlace para restablecer tu contraseña.",
  })
}
