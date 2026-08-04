import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'

// Notificaciones internas para el equipo (no van al cliente).

// Destinatarios: por defecto, todos los usuarios con rol `admin`. La variable
// ADMIN_NOTIFICATION_EMAILS (lista separada por comas) los reemplaza cuando se
// prefiere un buzón compartido en vez de las cuentas personales.
export async function getAdminNotificationRecipients(): Promise<string[]> {
  const override = process.env.ADMIN_NOTIFICATION_EMAILS
  if (override && override.trim()) {
    return override
      .split(',')
      .map((address) => address.trim())
      .filter(Boolean)
  }

  const admins = await prisma.user.findMany({
    where: { role: 'admin' },
    select: { email: true },
  })

  return admins
    .map((admin) => admin.email)
    .filter((address): address is string => !!address)
}

function formatMoney(amount: number | null | undefined, currency = 'COP') {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: Date | null | undefined) {
  if (!date) return '—'
  return date.toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

type Row = [label: string, value: string]

// Envía un aviso interno con la plantilla común. Nunca lanza: si el envío falla,
// se registra y se devuelve el error — una notificación caída no puede tumbar el
// flujo que la disparó (una activación, un cobro).
async function sendAdminNotification({
  subject,
  heading,
  rows,
  alert,
}: {
  subject: string
  heading: string
  rows: Row[]
  alert?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const recipients = await getAdminNotificationRecipients()
    if (recipients.length === 0) {
      return { success: false, error: 'sin destinatarios' }
    }

    const appUrl = (process.env.NEXTAUTH_URL || 'https://happysapiens.co').replace(/\/$/, '')

    const html = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #18181b;">
        <h2 style="margin-bottom: 4px;">${heading}</h2>
        <p style="color:#71717a;margin-top:0;font-size:14px;">
          ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })} (hora Colombia)
        </p>
        ${
          alert
            ? `<p style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;color:#991b1b;font-size:14px;">${alert}</p>`
            : ''
        }
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
          ${rows
            .map(
              ([label, value]) => `
            <tr>
              <td style="padding:8px 0;color:#71717a;width:40%;vertical-align:top;">${label}</td>
              <td style="padding:8px 0;font-weight:600;">${value}</td>
            </tr>`
            )
            .join('')}
        </table>
        <a
          href="${appUrl}/admin/aprovisionamiento"
          style="display:inline-block;margin-top:8px;padding:10px 24px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;"
        >
          Abrir panel de administración
        </a>
      </div>
    `

    const text = [heading, '', ...rows.map(([label, value]) => `${label}: ${value}`)].join('\n')

    const result = await sendEmail({ to: recipients, subject, html, text })
    if (!result.success) {
      console.error('[admin-notifications] error enviando aviso:', subject, result.error)
    }
    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin-notifications] error enviando aviso:', subject, message)
    return { success: false, error: message }
  }
}

// ---------------------------------------------------------------------------
// Nueva suscripción
// ---------------------------------------------------------------------------

export type NewSubscriptionNotification = {
  email: string
  name: string
  planTitle: string | null
  productId: string | null
  price?: number | null
  currency?: string
  userCreated: boolean
  preApprovalId: string
  referralCode?: string | null
  order:
    | { status: 'created'; orderNumber: number | null }
    | { status: 'skipped'; orderNumber: number | null }
    | { status: 'none' }
    | { status: 'error'; error: string }
}

function describeOrder(order: NewSubscriptionNotification['order']) {
  switch (order.status) {
    case 'created':
      return order.orderNumber ? `Creado — #${order.orderNumber}` : 'Creado'
    case 'skipped':
      return order.orderNumber ? `Ya existía — #${order.orderNumber}` : 'Ya existía'
    case 'none':
      return 'Sin pedido (el plan no tiene variante de Shopify)'
    case 'error':
      return `Falló — ${order.error}`
  }
}

// Avisa al equipo cuando se activa una suscripción NUEVA (no renovaciones ni
// re-entregas del webhook).
export async function notifyAdminsNewSubscription(
  data: NewSubscriptionNotification
): Promise<{ success: boolean; error?: string }> {
  const orderFailed = data.order.status === 'error'
  const plan = data.planTitle || data.productId || '—'

  const rows: Row[] = [
    ['Cliente', data.name],
    ['Email', data.email],
    ['Plan', plan],
    ['Valor', formatMoney(data.price, data.currency)],
    ['Cuenta', data.userCreated ? 'Nueva' : 'Usuario existente'],
    ['Pedido Shopify', describeOrder(data.order)],
    ...(data.referralCode ? ([['Código de referido', data.referralCode]] as Row[]) : []),
    ['Preaprobación MP', data.preApprovalId],
  ]

  return sendAdminNotification({
    subject: orderFailed
      ? `⚠️ Nueva suscripción con pedido fallido — ${data.name} (${plan})`
      : `Nueva suscripción — ${data.name} (${plan})`,
    heading: 'Nueva suscripción activada',
    rows,
    alert: orderFailed
      ? 'El pedido de Shopify no se pudo completar. Revisa «Pedidos por conciliar» en el panel de administración.'
      : undefined,
  })
}

// ---------------------------------------------------------------------------
// Cobro recurrente
// ---------------------------------------------------------------------------

export type RecurringOrderNotification = {
  email: string
  name: string
  planTitle: string | null
  productId: string | null
  amount?: number | null
  currency?: string
  mpPaymentId: string
  nextChargeDate?: Date | null
  order:
    | { status: 'created'; orderNumber: number | null }
    | { status: 'error'; error: string }
    | { status: 'no_variant' }
}

// Avisa al equipo cuando un cobro mensual genera su pedido de reposición.
// No se dispara en re-entregas del webhook (dispatch idempotente `skipped`) ni
// cuando la suscripción está pausada (ese mes no se despacha a propósito).
export async function notifyAdminsRecurringOrder(
  data: RecurringOrderNotification
): Promise<{ success: boolean; error?: string }> {
  const plan = data.planTitle || data.productId || '—'
  const failed = data.order.status !== 'created'

  const orderValue =
    data.order.status === 'created'
      ? data.order.orderNumber
        ? `Creado — #${data.order.orderNumber}`
        : 'Creado'
      : data.order.status === 'no_variant'
        ? 'Sin crear — la suscripción no tiene variante de Shopify'
        : `Falló — ${data.order.error}`

  const rows: Row[] = [
    ['Cliente', data.name],
    ['Email', data.email],
    ['Plan', plan],
    ['Valor cobrado', formatMoney(data.amount, data.currency)],
    ['Pedido Shopify', orderValue],
    ['Pago MP', `#${data.mpPaymentId}`],
    ...(data.nextChargeDate ? ([['Próximo cobro', formatDate(data.nextChargeDate)]] as Row[]) : []),
  ]

  const alert =
    data.order.status === 'error'
      ? 'El pedido de Shopify no se pudo completar pese al cobro exitoso. Revisa «Pedidos por conciliar» en el panel de administración.'
      : data.order.status === 'no_variant'
        ? 'Se cobró la mensualidad pero la suscripción no tiene variante de Shopify asignada, así que no se generó pedido. Hay que asignarla y despachar manualmente.'
        : undefined

  return sendAdminNotification({
    subject: failed
      ? `⚠️ Cobro recurrente sin pedido — ${data.name} (${plan})`
      : `Cobro recurrente — ${data.name} (${plan})`,
    heading: 'Cobro recurrente procesado',
    rows,
    alert,
  })
}
