-- Fecha de fin de pausa para reactivación automática
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_pause_ends_at TIMESTAMPTZ;
