import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sendEmail } from "@/lib/email"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") return null
  return session
}

function configStatus() {
  return {
    hasApiToken: Boolean(process.env.ZEPTOMAIL_API_TOKEN),
    apiUrl: process.env.ZEPTOMAIL_API_URL || "https://api.zeptomail.com/v1.1/email",
    fromEmail: process.env.ZEPTOMAIL_FROM_EMAIL || null,
    fromName: process.env.ZEPTOMAIL_FROM_NAME || null,
    healthRecipient: process.env.EMAIL_HEALTH_RECIPIENT || process.env.ZEPTOMAIL_FROM_EMAIL || null,
  }
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const config = configStatus()
  const configured = Boolean(config.hasApiToken && config.fromEmail && config.healthRecipient)
  return NextResponse.json({
    status: configured ? "configured" : "incomplete",
    config,
    hint: configured
      ? "Envía POST a este mismo endpoint para disparar un email de prueba."
      : "Faltan variables de entorno. Revisa ZEPTOMAIL_API_TOKEN, ZEPTOMAIL_FROM_EMAIL y EMAIL_HEALTH_RECIPIENT.",
  })
}

export async function POST() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const config = configStatus()
  const recipient = config.healthRecipient

  if (!config.hasApiToken || !config.fromEmail || !recipient) {
    return NextResponse.json(
      {
        status: "incomplete",
        config,
        error: "Configuración incompleta: revisa ZEPTOMAIL_API_TOKEN, ZEPTOMAIL_FROM_EMAIL y EMAIL_HEALTH_RECIPIENT.",
      },
      { status: 503 }
    )
  }

  const startedAt = Date.now()
  const timestamp = new Date().toISOString()
  const triggeredBy = session.user.email || session.user.id

  const result = await sendEmail({
    to: recipient,
    subject: `[Healthcheck] Happy Sapiens — ${timestamp}`,
    text: `Correo de prueba generado por ${triggeredBy} a las ${timestamp}.`,
    html: `
      <div style="font-family: sans-serif; color: #18181b;">
        <h2 style="margin-bottom: 8px;">Email Healthcheck</h2>
        <p>Este correo confirma que el envío con ZeptoMail está operativo.</p>
        <ul style="color:#52525b;font-size:14px;">
          <li><strong>Timestamp:</strong> ${timestamp}</li>
          <li><strong>Disparado por:</strong> ${triggeredBy}</li>
          <li><strong>From:</strong> ${config.fromEmail}</li>
          <li><strong>API URL:</strong> ${config.apiUrl}</li>
        </ul>
      </div>
    `,
  })

  const latencyMs = Date.now() - startedAt

  if (!result.success) {
    return NextResponse.json(
      {
        status: "error",
        timestamp,
        latencyMs,
        recipient,
        config,
        error: result.error,
      },
      { status: 502 }
    )
  }

  return NextResponse.json({
    status: "ok",
    timestamp,
    latencyMs,
    recipient,
    config,
  })
}
