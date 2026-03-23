import { supabaseAdmin } from "./supabase"

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
    await supabaseAdmin.from("system_logs").insert({
      actor_id: params.actorId,
      actor_email: params.actorEmail,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      metadata: params.metadata ?? {},
    })
  } catch (err) {
    console.error("[log] Failed to write system log:", err)
  }
}
