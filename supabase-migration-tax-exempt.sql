-- Agregar columna subscription_tax_exempt a la tabla users
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tax_exempt boolean DEFAULT false;
