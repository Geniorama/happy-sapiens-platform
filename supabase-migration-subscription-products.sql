-- Migración: campos de producto de suscripción en tabla users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS subscription_product TEXT,
  ADD COLUMN IF NOT EXISTS subscription_variant_id TEXT;
