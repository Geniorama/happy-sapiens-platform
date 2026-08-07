"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { logAdminAction } from "@/lib/log"
import { revalidatePath } from "next/cache"
import { hash } from "bcryptjs"
import { ensureReferralCode } from "@/lib/referral-code"
import { ensureAffiliateShopifyDiscount } from "@/lib/affiliate"
import { sendSetPasswordInvite } from "@/lib/set-password-invite"

async function getAdminSession() {
  const session = await auth()
  if (!session?.user?.id) return null
  if (session.user.role !== "admin") return null
  return session
}

async function getUserEmail(userId: string): Promise<string | null> {
  const data = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  return data?.email ?? null
}

export interface UserSubscriptionDetail {
  current: {
    status: string | null
    productSlug: string | null
    planTitle: string | null
    price: number | null
    startDate: string | null
    endDate: string | null
    pauseEndsAt: string | null
    subscriptionId: string | null
    taxExempt: boolean
  }
  history: {
    id: string
    action: string
    previousStatus: string | null
    newStatus: string | null
    amount: number | null
    notes: string | null
    createdAt: string
  }[]
  payments: {
    id: string
    status: string
    amount: number | null
    currency: string | null
    paymentMethod: string | null
    paymentDate: string | null
    mercadopagoPaymentId: string | null
  }[]
}

/**
 * Detalle de suscripción de un usuario para el admin: plan/producto actual,
 * precio y fechas, más el historial de cambios de suscripción y los pagos.
 * Se carga bajo demanda al abrir la pestaña "Suscripción" de un usuario.
 */
export async function getUserSubscriptionDetail(
  userId: string
): Promise<{ data: UserSubscriptionDetail } | { error: string }> {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const [user, history, payments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        subscriptionProduct: true,
        subscriptionPrice: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        subscriptionPauseEndsAt: true,
        subscriptionId: true,
        subscriptionTaxExempt: true,
      },
    }),
    prisma.subscriptionHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.paymentTransaction.findMany({
      where: { userId },
      orderBy: { paymentDate: "desc" },
      take: 20,
    }),
  ])

  if (!user) return { error: "Usuario no encontrado" }

  let planTitle: string | null = null
  if (user.subscriptionProduct) {
    const plan = await prisma.subscriptionPlanConfig.findUnique({
      where: { slug: user.subscriptionProduct },
      select: { title: true },
    })
    planTitle = plan?.title ?? null
  }

  return {
    data: {
      current: {
        status: user.subscriptionStatus,
        productSlug: user.subscriptionProduct,
        planTitle,
        price: user.subscriptionPrice == null ? null : Number(user.subscriptionPrice),
        startDate: user.subscriptionStartDate ? user.subscriptionStartDate.toISOString() : null,
        endDate: user.subscriptionEndDate ? user.subscriptionEndDate.toISOString() : null,
        pauseEndsAt: user.subscriptionPauseEndsAt ? user.subscriptionPauseEndsAt.toISOString() : null,
        subscriptionId: user.subscriptionId,
        taxExempt: user.subscriptionTaxExempt === true,
      },
      history: history.map((h) => ({
        id: h.id,
        action: h.action,
        previousStatus: h.previousStatus,
        newStatus: h.newStatus,
        amount: h.amount == null ? null : Number(h.amount),
        notes: h.notes,
        createdAt: h.createdAt.toISOString(),
      })),
      payments: payments.map((p) => ({
        id: p.id,
        status: p.status,
        amount: p.amount == null ? null : Number(p.amount),
        currency: p.currency,
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate ? p.paymentDate.toISOString() : null,
        mercadopagoPaymentId: p.mercadopagoPaymentId,
      })),
    },
  }
}

export interface AdminUserRow {
  first_name: string
  last_name: string
  email: string
  role: "user" | "coach" | "admin" | "afiliado"
  subscription_status: "active" | "inactive"
  subscription_start_date?: string
  subscription_end_date?: string
}

export interface AdminUserPayload {
  id: string
  name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string | null
  phone: string | null
  birth_date: string | null
  gender: string | null
  subscription_status: string | null
  subscription_end_date: string | null
  image: string | null
  created_at: string
  coupons_count: number
  total_points: number
}

const VALID_ROLES: AdminUserRow["role"][] = ["user", "coach", "admin", "afiliado"]

type InviteResult = { success: boolean; error?: string; skipped?: boolean }

/**
 * Crea un único usuario desde el panel admin: valida la fila, verifica unicidad
 * de email, hace el `create` (sin password), asegura el código de referido y el
 * descuento de afiliado, y opcionalmente envía la invitación de "establece tu
 * contraseña". Fuente de verdad compartida por `createUser` y `bulkCreateUsers`.
 * NO escribe en SystemLog ni revalida — eso queda a cargo del caller.
 */
async function provisionAdminUser(
  data: AdminUserRow,
  opts: { sendInvite: boolean }
): Promise<
  | { ok: true; user: AdminUserPayload; inviteResult: InviteResult }
  | { ok: false; reason: string }
> {
  const firstName = data.first_name?.trim()
  const lastName = data.last_name?.trim()

  if (!firstName) return { ok: false, reason: "El nombre es requerido" }
  if (!lastName) return { ok: false, reason: "El apellido es requerido" }
  if (!data.email?.trim()) return { ok: false, reason: "El email es requerido" }
  if (!VALID_ROLES.includes(data.role)) return { ok: false, reason: "Rol inválido" }

  const fullName = `${firstName} ${lastName}`.trim()

  const isRegularUser = data.role === "user"

  if (isRegularUser && data.subscription_status === "active") {
    if (!data.subscription_start_date) return { ok: false, reason: "La fecha de inicio es requerida" }
    if (!data.subscription_end_date) return { ok: false, reason: "La fecha de vencimiento es requerida" }
    if (new Date(data.subscription_end_date) <= new Date(data.subscription_start_date))
      return { ok: false, reason: "La fecha de vencimiento debe ser posterior a la de inicio" }
  }

  const subscriptionStatus = isRegularUser ? data.subscription_status : "inactive"
  const subscriptionStartDate =
    isRegularUser && data.subscription_status === "active"
      ? new Date(data.subscription_start_date!)
      : null
  const subscriptionEndDate =
    isRegularUser && data.subscription_status === "active"
      ? new Date(data.subscription_end_date!)
      : null

  const email = data.email.trim().toLowerCase()

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (existing) return { ok: false, reason: "Ya existe un usuario con ese email" }

  let created
  try {
    created = await prisma.user.create({
      data: {
        name: fullName,
        firstName,
        lastName,
        email,
        password: null,
        role: data.role,
        subscriptionStatus,
        subscriptionStartDate,
        subscriptionEndDate,
        isCoachActive: data.role === "coach",
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        phone: true,
        birthDate: true,
        gender: true,
        subscriptionStatus: true,
        subscriptionEndDate: true,
        image: true,
        createdAt: true,
      },
    })
  } catch (err) {
    console.error("Error creando usuario:", err)
    return { ok: false, reason: "Error al crear el usuario" }
  }

  try {
    await ensureReferralCode(created.id)
  } catch (err) {
    console.error("Error generando código de referido:", err)
  }

  // Afiliado nuevo: crear su código de descuento espejo (0%) en Shopify para trackear
  // compras en la tienda. No bloquea la creación si Shopify falla (registra el error).
  if (created.role === "afiliado") {
    await ensureAffiliateShopifyDiscount(created.id)
  }

  const inviteResult: InviteResult = opts.sendInvite
    ? await sendSetPasswordInvite({
        userId: created.id,
        email: created.email!,
        name: created.firstName ?? created.name,
      })
    : { success: false, skipped: true }

  const user: AdminUserPayload = {
    id: created.id,
    name: created.name,
    first_name: created.firstName,
    last_name: created.lastName,
    email: created.email,
    role: created.role,
    phone: created.phone,
    birth_date: created.birthDate ? created.birthDate.toISOString().slice(0, 10) : null,
    gender: created.gender,
    subscription_status: created.subscriptionStatus,
    subscription_end_date: created.subscriptionEndDate
      ? created.subscriptionEndDate.toISOString()
      : null,
    image: created.image,
    created_at: created.createdAt.toISOString(),
    coupons_count: 0,
    total_points: 0,
  }

  return { ok: true, user, inviteResult }
}

export async function createUser(data: AdminUserRow) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const result = await provisionAdminUser(data, { sendInvite: true })
  if (!result.ok) return { error: result.reason }

  const { user, inviteResult } = result

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: "user.created",
    entityType: "user",
    entityId: user.id,
    metadata: {
      target_name: user.name,
      target_email: user.email,
      role: user.role,
      subscription_status: user.subscription_status,
      invite_sent: inviteResult.success,
      invite_error: inviteResult.success ? null : inviteResult.error ?? null,
    },
  })

  revalidatePath("/admin/users")
  return {
    success: true,
    user,
    inviteSent: inviteResult.success,
    inviteError: inviteResult.success ? undefined : inviteResult.error,
  }
}

const BULK_MAX_ROWS = 500

export interface BulkCreateResult {
  success: true
  created: AdminUserPayload[]
  skipped: { row: number; email: string; reason: string }[]
  invitesSent: number
  invitesFailed: number
}

export async function bulkCreateUsers(
  rows: AdminUserRow[],
  opts: { sendInvites: boolean }
): Promise<{ error: string } | BulkCreateResult> {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!Array.isArray(rows) || rows.length === 0)
    return { error: "No hay filas para cargar" }
  if (rows.length > BULK_MAX_ROWS)
    return { error: `Máximo ${BULK_MAX_ROWS} usuarios por carga (recibidas ${rows.length})` }

  const created: AdminUserPayload[] = []
  const skipped: { row: number; email: string; reason: string }[] = []
  let invitesSent = 0
  let invitesFailed = 0

  // Secuencial: los invites son llamadas de red; evita saturar ZeptoMail.
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const result = await provisionAdminUser(row, { sendInvite: opts.sendInvites })
    if (!result.ok) {
      skipped.push({ row: i + 1, email: row?.email?.trim() ?? "", reason: result.reason })
      continue
    }
    created.push(result.user)
    if (opts.sendInvites) {
      if (result.inviteResult.success) invitesSent++
      else invitesFailed++
    }
  }

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: "user.bulk_created",
    entityType: "user",
    metadata: {
      total: rows.length,
      created: created.length,
      skipped: skipped.length,
      invites_sent: invitesSent,
      invites_failed: invitesFailed,
      emails: created.map((u) => u.email),
    },
  })

  revalidatePath("/admin/users")
  return { success: true, created, skipped, invitesSent, invitesFailed }
}

export async function updateUser(
  userId: string,
  data: {
    first_name: string
    last_name: string
    email: string
    phone?: string
    birth_date?: string
    gender?: string
  }
) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const firstName = data.first_name?.trim()
  const lastName = data.last_name?.trim()

  if (!firstName) return { error: "El nombre es requerido" }
  if (!lastName) return { error: "El apellido es requerido" }
  if (!data.email?.trim()) return { error: "El email es requerido" }

  const email = data.email.trim().toLowerCase()
  const fullName = `${firstName} ${lastName}`.trim()

  const existing = await prisma.user.findFirst({
    where: { email, NOT: { id: userId } },
    select: { id: true },
  })

  if (existing) return { error: "El email ya está en uso por otro usuario" }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: fullName,
        firstName,
        lastName,
        email,
        phone: data.phone?.trim() || null,
        birthDate: data.birth_date ? new Date(data.birth_date) : null,
        gender: data.gender || null,
      },
    })
  } catch (err) {
    console.error("Error actualizando usuario:", err)
    return { error: "Error al actualizar el usuario" }
  }

  revalidatePath("/admin/users")
  return { success: true }
}

export async function changeUserRole(userId: string, role: "user" | "coach" | "admin" | "afiliado") {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (userId === session.user.id) return { error: "No puedes cambiar tu propio rol" }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true },
  })

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        role,
        isCoachActive: role === "coach",
      },
    })
  } catch (err) {
    console.error("Error cambiando rol:", err)
    return { error: "Error al cambiar el rol" }
  }

  // Promovido a afiliado: asegurar su referralCode + código de descuento en Shopify.
  // Tolerante a fallos (no revierte el cambio de rol si Shopify falla).
  if (role === "afiliado") {
    await ensureAffiliateShopifyDiscount(userId)
  }

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: "user.role_changed",
    entityType: "user",
    entityId: userId,
    metadata: {
      target_email: target?.email ?? null,
      old_role: target?.role ?? null,
      new_role: role,
    },
  })

  revalidatePath("/admin/users")
  return { success: true }
}

export async function setSubscription(
  userId: string,
  status: "active" | "inactive",
  endDate?: string
) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const targetEmail = await getUserEmail(userId)

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: status,
        subscriptionStartDate: status === "active" ? new Date() : null,
        subscriptionEndDate:
          status === "active"
            ? endDate
              ? new Date(endDate)
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            : null,
      },
    })
  } catch (err) {
    console.error("Error actualizando suscripción:", err)
    return { error: "Error al actualizar la suscripción" }
  }

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: "user.subscription_changed",
    entityType: "user",
    entityId: userId,
    metadata: {
      target_email: targetEmail,
      status,
      end_date: endDate ?? null,
    },
  })

  revalidatePath("/admin/users")
  return { success: true }
}

export async function resetPassword(userId: string, newPassword: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!newPassword || newPassword.length < 6)
    return { error: "La contraseña debe tener al menos 6 caracteres" }

  const targetEmail = await getUserEmail(userId)
  const hashedPassword = await hash(newPassword, 10)

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })
  } catch (err) {
    console.error("Error reseteando contraseña:", err)
    return { error: "Error al resetear la contraseña" }
  }

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: "user.password_reset",
    entityType: "user",
    entityId: userId,
    metadata: { target_email: targetEmail },
  })

  return { success: true }
}

export async function bulkDeleteUsers(ids: string[]) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const safeIds = ids.filter((id) => id !== session.user.id)
  if (safeIds.length === 0) return { error: "No puedes eliminar tu propia cuenta" }

  // Obtener emails antes de borrar
  const targets = await prisma.user.findMany({
    where: { id: { in: safeIds } },
    select: { email: true },
  })

  try {
    await prisma.user.deleteMany({ where: { id: { in: safeIds } } })
  } catch (err) {
    console.error("Error en bulk delete users:", err)
    return { error: "Error al eliminar los usuarios" }
  }

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: "user.bulk_deleted",
    entityType: "user",
    metadata: {
      count: safeIds.length,
      target_emails: targets.map((t) => t.email),
    },
  })

  revalidatePath("/admin/users")
  return { success: true, deletedCount: safeIds.length }
}

export async function bulkSetSubscription(ids: string[], status: "active" | "inactive") {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const now = new Date()
  const data =
    status === "active"
      ? {
          subscriptionStatus: "active",
          subscriptionStartDate: now,
          subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }
      : {
          subscriptionStatus: "inactive",
          subscriptionStartDate: null,
          subscriptionEndDate: null,
        }

  try {
    await prisma.user.updateMany({
      where: { id: { in: ids } },
      data,
    })
  } catch (err) {
    console.error("Error en bulk set subscription:", err)
    return { error: "Error al actualizar la suscripción" }
  }

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: "user.bulk_subscription_changed",
    entityType: "user",
    metadata: { count: ids.length, status },
  })

  revalidatePath("/admin/users")
  return { success: true }
}

export async function resendSetPasswordInvite(userId: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, firstName: true, email: true },
  })

  if (!target?.email) return { error: "El usuario no tiene email registrado" }

  const result = await sendSetPasswordInvite({
    userId: target.id,
    email: target.email,
    name: target.firstName ?? target.name,
  })

  if (!result.success) {
    return { error: result.error || "No se pudo enviar el correo" }
  }

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: "user.invite_resent",
    entityType: "user",
    entityId: userId,
    metadata: { target_email: target.email },
  })

  return { success: true }
}

export async function deleteUser(userId: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (userId === session.user.id) return { error: "No puedes eliminar tu propia cuenta" }

  const targetEmail = await getUserEmail(userId)

  try {
    await prisma.user.delete({ where: { id: userId } })
  } catch (err) {
    console.error("Error eliminando usuario:", err)
    return { error: "Error al eliminar el usuario" }
  }

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: "user.deleted",
    entityType: "user",
    entityId: userId,
    metadata: { target_email: targetEmail },
  })

  revalidatePath("/admin/users")
  return { success: true }
}
