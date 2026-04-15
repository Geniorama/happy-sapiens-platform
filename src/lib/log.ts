import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"

interface LogParams {
  actorId: string
  actorEmail: string
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

/**
 * Registra una acción administrativa en system_logs.
 * Los errores de logging nunca deben interrumpir la operación principal.
 */
export async function logAdminAction(params: LogParams): Promise<void> {
  try {
    await prisma.systemLog.create({
      data: {
        actorId: params.actorId,
        actorEmail: params.actorEmail,
        action: params.action,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    })
  } catch (err) {
    console.error("[log] Failed to write system log:", err)
  }
}
