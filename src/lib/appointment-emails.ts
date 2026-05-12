import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/email"

const LOGO_URL =
  process.env.EMAIL_LOGO_URL ||
  "https://cdn.shopify.com/s/files/1/0957/4632/6892/files/hsRecurso_1_1.png?v=1775847307"

type AppointmentRow = {
  id: string
  appointmentDate: Date
  appointmentTime: Date
  durationMinutes: number | null
  status: string | null
  meetingLink: string | null
  consultationReason: string | null
  user: { id: string; name: string | null; email: string | null } | null
  coach: { id: string; name: string | null; email: string | null } | null
}

async function fetchAppointment(id: string): Promise<AppointmentRow | null> {
  return prisma.appointment.findUnique({
    where: { id },
    select: {
      id: true,
      appointmentDate: true,
      appointmentTime: true,
      durationMinutes: true,
      status: true,
      meetingLink: true,
      consultationReason: true,
      user: { select: { id: true, name: true, email: true } },
      coach: { select: { id: true, name: true, email: true } },
    },
  })
}

function formatDateHuman(date: Date): string {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  return new Date(year, month, day).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatTimeHuman(time: Date): string {
  const h = time.getUTCHours()
  const m = time.getUTCMinutes()
  const suffix = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`
}

type Recipient = "user" | "coach"
type Kind = "confirmation" | "reminder-24h" | "reminder-1h"

function buildSubject(kind: Kind, recipient: Recipient, counterpartName: string): string {
  const partner = counterpartName || (recipient === "user" ? "tu coach" : "tu cliente")
  switch (kind) {
    case "confirmation":
      return recipient === "user"
        ? `Cita confirmada con ${partner}`
        : `Nueva cita agendada por ${partner}`
    case "reminder-24h":
      return recipient === "user"
        ? `Recordatorio: tu cita con ${partner} es mañana`
        : `Recordatorio: cita con ${partner} mañana`
    case "reminder-1h":
      return recipient === "user"
        ? `Tu cita con ${partner} empieza en 1 hora`
        : `Cita con ${partner} en 1 hora`
  }
}

function buildIntro(kind: Kind, recipient: Recipient, counterpartName: string): string {
  const partner = counterpartName || (recipient === "user" ? "el coach" : "el cliente")
  switch (kind) {
    case "confirmation":
      return recipient === "user"
        ? `Tu cita con <strong>${partner}</strong> quedó confirmada. Aquí están los detalles:`
        : `Se agendó una nueva cita contigo. <strong>${partner}</strong> reservó el siguiente espacio:`
    case "reminder-24h":
      return recipient === "user"
        ? `Te recordamos que tienes una cita con <strong>${partner}</strong> mañana. Aquí los detalles:`
        : `Te recordamos que tienes una cita con <strong>${partner}</strong> mañana:`
    case "reminder-1h":
      return recipient === "user"
        ? `Tu cita con <strong>${partner}</strong> empieza en aproximadamente 1 hora. No olvides conectarte a tiempo.`
        : `Tu cita con <strong>${partner}</strong> empieza en 1 hora. Prepárate para atenderla.`
  }
}

function buildHtml({
  kind,
  recipient,
  appointment,
  counterpartName,
}: {
  kind: Kind
  recipient: Recipient
  appointment: AppointmentRow
  counterpartName: string
}): { subject: string; html: string; text: string } {
  const dateStr = formatDateHuman(appointment.appointmentDate)
  const timeStr = formatTimeHuman(appointment.appointmentTime)
  const duration = appointment.durationMinutes ?? 60
  const reason = appointment.consultationReason?.trim()
  const meet = appointment.meetingLink

  const subject = buildSubject(kind, recipient, counterpartName)
  const intro = buildIntro(kind, recipient, counterpartName)

  const detailsRows = [
    `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Fecha</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;text-transform:capitalize;">${dateStr}</td></tr>`,
    `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Hora</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${timeStr}</td></tr>`,
    `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Duración</td><td style="padding:6px 0;color:#111827;font-size:14px;">${duration} minutos</td></tr>`,
    reason
      ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;vertical-align:top;">Motivo</td><td style="padding:6px 0;color:#111827;font-size:14px;">${escapeHtml(reason)}</td></tr>`
      : "",
  ]
    .filter(Boolean)
    .join("")

  const meetButton = meet
    ? `<tr><td style="padding:24px 0 8px;">
         <a href="${meet}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px;">Unirse a la videollamada</a>
       </td></tr>
       <tr><td style="padding:4px 0 0;color:#6b7280;font-size:12px;word-break:break-all;">${meet}</td></tr>`
    : `<tr><td style="padding:16px 0 0;color:#6b7280;font-size:12px;">${
        recipient === "coach"
          ? "Puedes agregar un enlace de videollamada desde el panel del coach."
          : "Tu coach te compartirá el enlace de la videollamada antes del inicio."
      }</td></tr>`

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="${LOGO_URL}" alt="Happy Sapiens" width="120" style="display:block;height:auto;" />
            </td>
          </tr>
          <tr>
            <td style="color:#111827;font-size:15px;line-height:1.55;">
              <p style="margin:0 0 16px;">${intro}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;margin:8px 0 12px;">
                ${detailsRows}
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${meetButton}</table>
              <p style="margin:24px 0 0;color:#6b7280;font-size:12px;line-height:1.5;">Si necesitas cancelar o reagendar, hazlo desde tu panel en Happy Sapiens lo antes posible.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body></html>`

  const text = [
    intro.replace(/<[^>]+>/g, ""),
    "",
    `Fecha: ${dateStr}`,
    `Hora: ${timeStr}`,
    `Duración: ${duration} minutos`,
    reason ? `Motivo: ${reason}` : "",
    meet ? `Videollamada: ${meet}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  return { subject, html, text }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

async function sendToParties(kind: Kind, appointment: AppointmentRow): Promise<void> {
  const userEmail = appointment.user?.email
  const coachEmail = appointment.coach?.email
  const userName = appointment.user?.name ?? ""
  const coachName = appointment.coach?.name ?? ""

  if (!userEmail) {
    console.warn(`[appointment-email ${kind}] cita ${appointment.id}: usuario sin email`)
  }
  if (!coachEmail) {
    console.warn(`[appointment-email ${kind}] cita ${appointment.id}: coach sin email`)
  }

  const jobs: Array<Promise<{ target: string; result: { success: boolean; error?: string } }>> = []

  if (userEmail) {
    const { subject, html, text } = buildHtml({
      kind,
      recipient: "user",
      appointment,
      counterpartName: coachName,
    })
    jobs.push(
      sendEmail({ to: userEmail, subject, html, text }).then((result) => ({
        target: `user<${userEmail}>`,
        result,
      }))
    )
  }

  if (coachEmail) {
    const { subject, html, text } = buildHtml({
      kind,
      recipient: "coach",
      appointment,
      counterpartName: userName,
    })
    jobs.push(
      sendEmail({ to: coachEmail, subject, html, text }).then((result) => ({
        target: `coach<${coachEmail}>`,
        result,
      }))
    )
  }

  const settled = await Promise.allSettled(jobs)
  for (const s of settled) {
    if (s.status === "fulfilled") {
      const { target, result } = s.value
      if (result.success) {
        console.log(`[appointment-email ${kind}] enviado a ${target}`)
      } else {
        console.error(`[appointment-email ${kind}] fallo a ${target}: ${result.error}`)
      }
    } else {
      console.error(`[appointment-email ${kind}] promise rejected:`, s.reason)
    }
  }
}

export async function sendAppointmentConfirmation(appointmentId: string): Promise<void> {
  try {
    const appt = await fetchAppointment(appointmentId)
    if (!appt) return
    await sendToParties("confirmation", appt)
  } catch (err) {
    console.error("[appointment-email] confirmation error:", err)
  }
}

export async function sendAppointmentReminder(
  appointmentId: string,
  kind: "reminder-24h" | "reminder-1h"
): Promise<void> {
  const appt = await fetchAppointment(appointmentId)
  if (!appt) return
  await sendToParties(kind, appt)
}

// ─────────────────────────────────────────────────────────────────────────────
// Recordatorios configurables (regla creada desde el admin)
// ─────────────────────────────────────────────────────────────────────────────

export interface ReminderRule {
  id: string
  name: string
  sendToUser: boolean
  sendToCoach: boolean
  subjectUser: string
  bodyUser: string
  subjectCoach: string
  bodyCoach: string
}

/** Sustituye placeholders {coachName}, {userName}, {date}, etc. en un texto */
function applyPlaceholders(
  template: string,
  appt: AppointmentRow
): string {
  const dateStr = formatDateHuman(appt.appointmentDate)
  const timeStr = formatTimeHuman(appt.appointmentTime)
  const duration = String(appt.durationMinutes ?? 60)
  const meet = appt.meetingLink ?? ""
  const reason = appt.consultationReason ?? ""
  const coachName = appt.coach?.name ?? "tu coach"
  const userName = appt.user?.name ?? "tu cliente"

  return template
    .replaceAll("{coachName}", coachName)
    .replaceAll("{userName}", userName)
    .replaceAll("{date}", dateStr)
    .replaceAll("{time}", timeStr)
    .replaceAll("{duration}", duration)
    .replaceAll("{meetingLink}", meet)
    .replaceAll("{reason}", reason)
}

/** Envuelve un cuerpo de texto plano en el HTML estándar (logo, botón Meet, etc.) */
function wrapBodyHtml(bodyText: string, appt: AppointmentRow, recipient: Recipient): string {
  // Convertir saltos de línea en <br> y escapar HTML del texto del admin
  const bodyHtml = escapeHtml(bodyText).replaceAll("\n", "<br>")

  const dateStr = formatDateHuman(appt.appointmentDate)
  const timeStr = formatTimeHuman(appt.appointmentTime)
  const duration = appt.durationMinutes ?? 60
  const reason = appt.consultationReason?.trim()
  const meet = appt.meetingLink

  const detailsRows = [
    `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Fecha</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;text-transform:capitalize;">${dateStr}</td></tr>`,
    `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Hora</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${timeStr}</td></tr>`,
    `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Duración</td><td style="padding:6px 0;color:#111827;font-size:14px;">${duration} minutos</td></tr>`,
    reason
      ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;vertical-align:top;">Motivo</td><td style="padding:6px 0;color:#111827;font-size:14px;">${escapeHtml(reason)}</td></tr>`
      : "",
  ]
    .filter(Boolean)
    .join("")

  const meetButton = meet
    ? `<tr><td style="padding:24px 0 8px;">
         <a href="${meet}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px;">Unirse a la videollamada</a>
       </td></tr>
       <tr><td style="padding:4px 0 0;color:#6b7280;font-size:12px;word-break:break-all;">${meet}</td></tr>`
    : `<tr><td style="padding:16px 0 0;color:#6b7280;font-size:12px;">${
        recipient === "coach"
          ? "Puedes agregar un enlace de videollamada desde el panel del coach."
          : "Tu coach te compartirá el enlace de la videollamada antes del inicio."
      }</td></tr>`

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="${LOGO_URL}" alt="Happy Sapiens" width="120" style="display:block;height:auto;" />
            </td>
          </tr>
          <tr>
            <td style="color:#111827;font-size:15px;line-height:1.55;">
              <p style="margin:0 0 16px;">${bodyHtml}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;margin:8px 0 12px;">
                ${detailsRows}
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${meetButton}</table>
              <p style="margin:24px 0 0;color:#6b7280;font-size:12px;line-height:1.5;">Si necesitas cancelar o reagendar, hazlo desde tu panel en Happy Sapiens lo antes posible.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body></html>`
}

function buildPlainText(bodyText: string, appt: AppointmentRow): string {
  const dateStr = formatDateHuman(appt.appointmentDate)
  const timeStr = formatTimeHuman(appt.appointmentTime)
  const duration = appt.durationMinutes ?? 60
  const reason = appt.consultationReason?.trim()
  const meet = appt.meetingLink

  return [
    bodyText,
    "",
    `Fecha: ${dateStr}`,
    `Hora: ${timeStr}`,
    `Duración: ${duration} minutos`,
    reason ? `Motivo: ${reason}` : "",
    meet ? `Videollamada: ${meet}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

/**
 * Envía un recordatorio aplicando una regla configurada en BD. La regla define
 * el asunto y cuerpo (con placeholders) para usuario y coach, y a qué partes
 * enviar. El cuerpo se envuelve en la plantilla HTML estándar.
 */
export async function sendReminderFromRule(
  appointmentId: string,
  rule: ReminderRule
): Promise<void> {
  const appt = await fetchAppointment(appointmentId)
  if (!appt) return

  const jobs: Array<Promise<{ target: string; result: { success: boolean; error?: string } }>> = []

  if (rule.sendToUser && appt.user?.email) {
    const subject = applyPlaceholders(rule.subjectUser, appt)
    const bodyText = applyPlaceholders(rule.bodyUser, appt)
    const html = wrapBodyHtml(bodyText, appt, "user")
    const text = buildPlainText(bodyText, appt)
    const to = appt.user.email
    jobs.push(
      sendEmail({ to, subject, html, text }).then((result) => ({
        target: `user<${to}>`,
        result,
      }))
    )
  }

  if (rule.sendToCoach && appt.coach?.email) {
    const subject = applyPlaceholders(rule.subjectCoach, appt)
    const bodyText = applyPlaceholders(rule.bodyCoach, appt)
    const html = wrapBodyHtml(bodyText, appt, "coach")
    const text = buildPlainText(bodyText, appt)
    const to = appt.coach.email
    jobs.push(
      sendEmail({ to, subject, html, text }).then((result) => ({
        target: `coach<${to}>`,
        result,
      }))
    )
  }

  const settled = await Promise.allSettled(jobs)
  for (const s of settled) {
    if (s.status === "fulfilled") {
      const { target, result } = s.value
      if (result.success) {
        console.log(`[reminder-rule ${rule.name}] enviado a ${target}`)
      } else {
        console.error(`[reminder-rule ${rule.name}] fallo a ${target}: ${result.error}`)
      }
    } else {
      console.error(`[reminder-rule ${rule.name}] promise rejected:`, s.reason)
    }
  }
}
