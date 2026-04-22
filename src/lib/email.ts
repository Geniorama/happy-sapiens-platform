const apiUrl = process.env.ZEPTOMAIL_API_URL || "https://api.zeptomail.com/v1.1/email"
const apiToken = process.env.ZEPTOMAIL_API_TOKEN
const fromAddress = process.env.ZEPTOMAIL_FROM_EMAIL
const fromName = process.env.ZEPTOMAIL_FROM_NAME || "Happy Sapiens"

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
}

function toRecipients(value: string | string[] | undefined) {
  if (!value) return undefined
  const list = Array.isArray(value) ? value : [value]
  return list.map((address) => ({ email_address: { address } }))
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!apiToken) {
    const message = "ZEPTOMAIL_API_TOKEN no está configurado"
    console.error("Email send error:", message)
    return { success: false, error: message }
  }
  if (!fromAddress) {
    const message = "ZEPTOMAIL_FROM_EMAIL no está configurado"
    console.error("Email send error:", message)
    return { success: false, error: message }
  }

  const payload = {
    from: { address: fromAddress, name: fromName },
    to: toRecipients(options.to),
    cc: toRecipients(options.cc),
    bcc: toRecipients(options.bcc),
    reply_to: options.replyTo ? [{ address: options.replyTo }] : undefined,
    subject: options.subject,
    htmlbody: options.html,
    textbody: options.text,
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Zoho-enczapikey ${apiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const raw = await res.text()
      let detail = raw
      try {
        const json = JSON.parse(raw)
        detail = json?.error?.message || json?.message || raw
      } catch {
        // raw queda como está
      }
      const message = `ZeptoMail API ${res.status}: ${detail || "(body vacío)"}`
      console.error("Email send error:", message, {
        url: apiUrl,
        contentType: res.headers.get("content-type"),
        rawBodyPreview: raw.slice(0, 300),
      })
      return { success: false, error: message }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al enviar el correo"
    console.error("Email send error:", err)
    return { success: false, error: message }
  }
}
