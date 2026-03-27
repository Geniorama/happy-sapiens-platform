-- Migración: campos de suscripción Shopify en tabla users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS shopify_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT CHECK (
    subscription_status IN ('active', 'paused', 'cancelled', 'expired')
  ),
  ADD COLUMN IF NOT EXISTS subscription_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_shopify_customer_id ON users(shopify_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
