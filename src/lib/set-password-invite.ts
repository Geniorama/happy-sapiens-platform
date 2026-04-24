import { randomBytes } from "crypto"
import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/email"

const INVITE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 días

export async function createSetPasswordToken(userId: string) {
  const token = randomBytes(32).toString("hex")
  const expires = new Date(Date.now() + INVITE_EXPIRATION_MS)

  await prisma.user.update({
    where: { id: userId },
    data: {
      resetToken: token,
      resetTokenExpires: expires,
    },
  })

  return { token, expires }
}

export async function sendSetPasswordInvite(params: {
  userId: string
  email: string
  name?: string | null
}) {
  const { token } = await createSetPasswordToken(params.userId)

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const setUrl = `${appUrl}/auth/set-password?token=${token}`
  const logoUrl =
    process.env.EMAIL_LOGO_URL ||
    `${process.env.EMAIL_ASSETS_URL || appUrl}/hs-logo.png`

  const greeting = params.name ? ` ${params.name}` : ""

  const result = await sendEmail({
    to: params.email,
    subject: "Bienvenido(a) a Happy Sapiens - Establece tu contraseña",
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #18181b;">
        <img src="${logoUrl}" alt="Happy Sapiens" width="160" style="width: 160px; height: auto; margin-bottom: 24px; display: block;" />
        <h2 style="margin-bottom: 8px;">Bienvenido(a) a Happy Sapiens</h2>
        <p>Hola${greeting},</p>
        <p>Se ha creado una cuenta para ti en la plataforma. Para comenzar, establece tu contraseña haciendo clic en el botón:</p>
        <a
          href="${setUrl}"
          style="display:inline-block;margin:24px 0;padding:12px 28px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;"
        >
          Establecer contraseña
        </a>
        <p style="color:#71717a;font-size:14px;">Este enlace es válido por 7 días. Si no lo usas dentro de ese plazo, contacta al administrador para recibir uno nuevo.</p>
        <p style="color:#71717a;font-size:14px;">Si el botón no funciona, copia y pega esta URL en tu navegador:<br/><a href="${setUrl}" style="color:#16a34a;">${setUrl}</a></p>
      </div>
    `,
  })

  if (!result.success) {
    console.error("[set-password-invite] envío falló", {
      to: params.email,
      error: result.error,
      from: process.env.ZEPTOMAIL_FROM_EMAIL,
    })
  }

  return result
}
