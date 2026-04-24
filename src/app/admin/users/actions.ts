"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { logAdminAction } from "@/lib/log"
import { revalidatePath } from "next/cache"
import { hash } from "bcryptjs"
import { ensureReferralCode } from "@/lib/referral-code"
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

export async function createUser(data: {
  first_name: string
  last_name: string
  email: string
  role: "user" | "coach" | "admin"
  subscription_status: "active" | "inactive"
  subscription_start_date?: string
  subscription_end_date?: string
}) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const firstName = data.first_name?.trim()
  const lastName = data.last_name?.trim()

  if (!firstName) return { error: "El nombre es requerido" }
  if (!lastName) return { error: "El apellido es requerido" }
  if (!data.email?.trim()) return { error: "El email es requerido" }

  const fullName = `${firstName} ${lastName}`.trim()

  const isRegularUser = data.role === "user"

  if (isRegularUser && data.subscription_status === "active") {
    if (!data.subscription_start_date) return { error: "La fecha de inicio es requerida" }
    if (!data.subscription_end_date) return { error: "La fecha de vencimiento es requerida" }
    if (new Date(data.subscription_end_date) <= new Date(data.subscription_start_date))
      return { error: "La fecha de vencimiento debe ser posterior a la de inicio" }
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

  if (existing) return { error: "Ya existe un usuario con ese email" }

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
    return { error: "Error al crear el usuario" }
  }

  try {
    await ensureReferralCode(created.id)
  } catch (err) {
    console.error("Error generando código de referido:", err)
  }

  const inviteResult = await sendSetPasswordInvite({
    userId: created.id,
    email: created.email!,
    name: created.firstName ?? created.name,
  })

  await logAdminAction({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    action: "user.created",
    entityType: "user",
    entityId: created.id,
    metadata: {
      target_name: fullName,
      target_email: email,
      role: data.role,
      subscription_status: subscriptionStatus,
      invite_sent: inviteResult.success,
      invite_error: inviteResult.success ? null : inviteResult.error ?? null,
    },
  })

  const userPayload = {
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

  revalidatePath("/admin/users")
  return {
    success: true,
    user: userPayload,
    inviteSent: inviteResult.success,
    inviteError: inviteResult.success ? undefined : inviteResult.error,
  }
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

export async function changeUserRole(userId: string, role: "user" | "coach" | "admin") {
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
