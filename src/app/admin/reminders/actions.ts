"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { logAdminAction } from "@/lib/log"

async function getAdminSession() {
  const session = await auth()
  if (!session?.user?.id) return null
  if (session.user.role !== "admin") return null
  return session
}

export interface ReminderRuleData {
  key: string
  name: string
  hoursBefore: number
  windowMinutes: number
  isActive: boolean
  sendToUser: boolean
  sendToCoach: boolean
  subjectUser: string
  bodyUser: string
  subjectCoach: string
  bodyCoach: string
}

function validate(data: ReminderRuleData): string | null {
  if (!data.key?.trim()) return "La clave es requerida"
  if (!/^[a-z0-9-]+$/.test(data.key.trim())) {
    return "La clave solo puede tener minúsculas, números y guiones"
  }
  if (!data.name?.trim()) return "El nombre es requerido"
  if (!Number.isFinite(data.hoursBefore) || data.hoursBefore <= 0) {
    return "La antelación debe ser un número mayor a 0"
  }
  if (!Number.isInteger(data.windowMinutes) || data.windowMinutes < 5 || data.windowMinutes > 360) {
    return "La ventana debe ser entre 5 y 360 minutos"
  }
  if (data.sendToUser) {
    if (!data.subjectUser?.trim()) return "El asunto para el usuario es requerido"
    if (!data.bodyUser?.trim()) return "El cuerpo para el usuario es requerido"
  }
  if (data.sendToCoach) {
    if (!data.subjectCoach?.trim()) return "El asunto para el coach es requerido"
    if (!data.bodyCoach?.trim()) return "El cuerpo para el coach es requerido"
  }
  if (!data.sendToUser && !data.sendToCoach) {
    return "El recordatorio debe enviarse al menos a una de las partes"
  }
  return null
}

export async function createReminderRule(data: ReminderRuleData) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const errMsg = validate(data)
  if (errMsg) return { error: errMsg }

  try {
    const existing = await prisma.appointmentReminderRule.findUnique({
      where: { key: data.key.trim() },
    })
    if (existing) return { error: "Ya existe una regla con esa clave" }

    const created = await prisma.appointmentReminderRule.create({
      data: {
        key: data.key.trim(),
        name: data.name.trim(),
        hoursBefore: data.hoursBefore,
        windowMinutes: data.windowMinutes,
        isActive: data.isActive,
        sendToUser: data.sendToUser,
        sendToCoach: data.sendToCoach,
        subjectUser: data.subjectUser.trim(),
        bodyUser: data.bodyUser.trim(),
        subjectCoach: data.subjectCoach.trim(),
        bodyCoach: data.bodyCoach.trim(),
      },
    })

    await logAdminAction({
      actorId: session.user.id!,
      actorEmail: session.user.email ?? "",
      action: "reminder_rule.create",
      entityType: "reminder_rule",
      entityId: created.id,
      metadata: { key: created.key, hoursBefore: data.hoursBefore },
    })
  } catch (err) {
    console.error("Error creando regla de recordatorio:", err)
    return { error: "No se pudo crear la regla" }
  }

  revalidatePath("/admin/reminders")
  return { success: true }
}

export async function updateReminderRule(id: string, data: ReminderRuleData) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const errMsg = validate(data)
  if (errMsg) return { error: errMsg }

  try {
    const existing = await prisma.appointmentReminderRule.findUnique({ where: { id } })
    if (!existing) return { error: "La regla no existe" }

    // Si cambian la key, verificar que no choque con otra
    if (existing.key !== data.key.trim()) {
      const dup = await prisma.appointmentReminderRule.findUnique({
        where: { key: data.key.trim() },
      })
      if (dup) return { error: "Ya existe otra regla con esa clave" }
    }

    await prisma.appointmentReminderRule.update({
      where: { id },
      data: {
        key: data.key.trim(),
        name: data.name.trim(),
        hoursBefore: data.hoursBefore,
        windowMinutes: data.windowMinutes,
        isActive: data.isActive,
        sendToUser: data.sendToUser,
        sendToCoach: data.sendToCoach,
        subjectUser: data.subjectUser.trim(),
        bodyUser: data.bodyUser.trim(),
        subjectCoach: data.subjectCoach.trim(),
        bodyCoach: data.bodyCoach.trim(),
      },
    })

    await logAdminAction({
      actorId: session.user.id!,
      actorEmail: session.user.email ?? "",
      action: "reminder_rule.update",
      entityType: "reminder_rule",
      entityId: id,
      metadata: {
        before: {
          hoursBefore: Number(existing.hoursBefore),
          isActive: existing.isActive,
        },
        after: { hoursBefore: data.hoursBefore, isActive: data.isActive },
      },
    })
  } catch (err) {
    console.error("Error actualizando regla de recordatorio:", err)
    return { error: "No se pudo actualizar la regla" }
  }

  revalidatePath("/admin/reminders")
  return { success: true }
}

export async function toggleReminderRuleActive(id: string, isActive: boolean) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  try {
    const existing = await prisma.appointmentReminderRule.findUnique({ where: { id } })
    if (!existing) return { error: "La regla no existe" }
    if (existing.isActive === isActive) return { success: true }

    await prisma.appointmentReminderRule.update({
      where: { id },
      data: { isActive },
    })

    await logAdminAction({
      actorId: session.user.id!,
      actorEmail: session.user.email ?? "",
      action: isActive ? "reminder_rule.activate" : "reminder_rule.deactivate",
      entityType: "reminder_rule",
      entityId: id,
      metadata: { isActive },
    })
  } catch (err) {
    console.error("Error cambiando estado de regla:", err)
    return { error: "No se pudo cambiar el estado" }
  }

  revalidatePath("/admin/reminders")
  return { success: true }
}

export async function deleteReminderRule(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  try {
    const existing = await prisma.appointmentReminderRule.findUnique({ where: { id } })
    if (!existing) return { error: "La regla no existe" }

    await prisma.appointmentReminderRule.delete({ where: { id } })

    await logAdminAction({
      actorId: session.user.id!,
      actorEmail: session.user.email ?? "",
      action: "reminder_rule.delete",
      entityType: "reminder_rule",
      entityId: id,
      metadata: { key: existing.key, name: existing.name },
    })
  } catch (err) {
    console.error("Error eliminando regla:", err)
    return { error: "No se pudo eliminar la regla" }
  }

  revalidatePath("/admin/reminders")
  return { success: true }
}
