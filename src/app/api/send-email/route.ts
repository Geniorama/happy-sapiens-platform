import { NextResponse } from "next/server"
import { z } from "zod"
import { sendEmail } from "@/lib/email"

const bodySchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1, "El asunto es requerido"),
  text: z.string().optional(),
  html: z.string().optional(),
  replyTo: z.string().email().optional(),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
}).refine((data) => data.text || data.html, {
  message: "Debes enviar al menos 'text' o 'html'",
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.flatten().fieldErrors
      const message = Object.values(firstError).flat().join(" ") || "Datos inválidos"
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const { to, subject, text, html, replyTo, cc, bcc } = parsed.data
    const result = await sendEmail({ to, subject, text, html, replyTo, cc, bcc })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Error al enviar el correo" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("API send-email error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
