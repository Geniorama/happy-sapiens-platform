import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/email"

export async function POST(req: NextRequest) {
  let email: string
  try {
    const body = await req.json()
    email = body.email
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 })
  }

  const debug = new URL(req.url).searchParams.get("debug") === "1"
    && process.env.ALLOW_EMAIL_DEBUG === "true"

  if (!email) {
    return NextResponse.json({ error: "El email es requerido" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, name: true },
  })

  let emailError: string | undefined

  if (user) {
    const token = randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpires: expires,
      },
    })

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const resetUrl = `${appUrl}/auth/reset-password?token=${token}`
    const logoUrl = process.env.EMAIL_LOGO_URL
      || `${process.env.EMAIL_ASSETS_URL || appUrl}/hs-logo.png`

    const result = await sendEmail({
      to: email,
      subject: "Recuperación de contraseña - Happy Sapiens",
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #18181b;">
          <img src="${logoUrl}" alt="Happy Sapiens" width="160" style="width: 160px; height: auto; margin-bottom: 24px; display: block;" />
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

    if (!result.success) {
      emailError = result.error
      console.error("[forgot-password] envío falló", {
        to: email,
        error: result.error,
        from: process.env.ZEPTOMAIL_FROM_EMAIL,
      })
    }
  }

  return NextResponse.json({
    message: "Si el email está registrado, recibirás un enlace para restablecer tu contraseña.",
    ...(debug ? { debug: { userFound: !!user, emailError: emailError ?? null } } : {}),
  })
}
