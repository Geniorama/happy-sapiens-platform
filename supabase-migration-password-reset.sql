-- Migración: columnas para recuperación de contraseña
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_token TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;

-- Índice para búsqueda rápida por token
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
