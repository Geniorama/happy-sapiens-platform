import nodemailer from "nodemailer"

const host = process.env.ZEPTOMAIL_SMTP_HOST || "smtp.zeptomail.com"
const port = Number(process.env.ZEPTOMAIL_SMTP_PORT) || 587
const user = process.env.ZEPTOMAIL_SMTP_USER
const pass = process.env.ZEPTOMAIL_SMTP_PASSWORD
const fromAddress = process.env.ZEPTOMAIL_FROM_EMAIL
const fromName = process.env.ZEPTOMAIL_FROM_NAME || "Happy Sapiens"

function getTransporter() {
  if (!user || !pass) {
    throw new Error("ZEPTOMAIL_SMTP_USER y ZEPTOMAIL_SMTP_PASSWORD deben estar configurados")
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter()
    const to = Array.isArray(options.to) ? options.to.join(", ") : options.to
    const from = fromAddress
      ? (fromName ? `"${fromName}" <${fromAddress}>` : fromAddress)
      : `"${fromName}" <${user}>`

    await transporter.sendMail({
      from,
      to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
    })
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al enviar el correo"
    console.error("Email send error:", err)
    return { success: false, error: message }
  }
}
