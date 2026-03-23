-- ============================================
-- MIGRACIÓN: Tabla de logs del sistema
-- ============================================
-- Ejecuta este script en Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS system_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT        NOT NULL,
  action      TEXT        NOT NULL,   -- 'user.created', 'user.deleted', etc.
  entity_type TEXT,                   -- 'user', 'subscription', 'coupon', 'partner', 'coach'
  entity_id   TEXT,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS system_logs_created_at_idx  ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS system_logs_action_idx      ON system_logs(action);
CREATE INDEX IF NOT EXISTS system_logs_actor_id_idx    ON system_logs(actor_id);
CREATE INDEX IF NOT EXISTS system_logs_entity_type_idx ON system_logs(entity_type);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
-- El admin accede vía supabaseAdmin (service role) que bypasea RLS.
-- No se necesitan políticas para usuarios normales.
