-- Columnas de facturación y envío en la tabla users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS billing_document_type TEXT,
  ADD COLUMN IF NOT EXISTS billing_document_number TEXT,
  ADD COLUMN IF NOT EXISTS billing_phone TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS billing_city TEXT,
  ADD COLUMN IF NOT EXISTS billing_department TEXT,
  ADD COLUMN IF NOT EXISTS shipping_full_name TEXT,
  ADD COLUMN IF NOT EXISTS shipping_phone TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address TEXT,
  ADD COLUMN IF NOT EXISTS shipping_city TEXT,
  ADD COLUMN IF NOT EXISTS shipping_department TEXT,
  ADD COLUMN IF NOT EXISTS shipping_same_as_billing BOOLEAN DEFAULT TRUE;

-- Tabla temporal para datos del checkout antes de la confirmación de MercadoPago
CREATE TABLE IF NOT EXISTS pending_checkout (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  product_id TEXT,
  referral_code TEXT,
  billing JSONB,
  shipping JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para lookup por email en el webhook
CREATE INDEX IF NOT EXISTS pending_checkout_email_idx ON pending_checkout(email);

-- Limpiar entradas antiguas de más de 48 horas (se puede correr periódicamente)
-- DELETE FROM pending_checkout WHERE created_at < NOW() - INTERVAL '48 hours';
