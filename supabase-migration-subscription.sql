-- ============================================
-- MIGRACIÓN: Agregar campos de suscripción
-- ============================================
-- Ejecuta este script si tu tabla users ya existe
-- y necesitas agregar los campos de suscripción
-- ============================================

-- Agregar columnas de suscripción a la tabla users (si no existen)
DO $$ 
BEGIN
  -- subscription_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'inactive';
  END IF;

  -- subscription_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'subscription_id'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_id TEXT;
  END IF;

  -- subscription_start_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'subscription_start_date'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_start_date TIMESTAMPTZ;
  END IF;

  -- subscription_end_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'subscription_end_date'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_end_date TIMESTAMPTZ;
  END IF;

  -- mercadopago_customer_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'mercadopago_customer_id'
  ) THEN
    ALTER TABLE users ADD COLUMN mercadopago_customer_id TEXT;
  END IF;
END $$;

-- Crear tabla de transacciones de pago (si no existe)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mercadopago_payment_id TEXT UNIQUE,
  mercadopago_preference_id TEXT,
  status TEXT NOT NULL,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'ARS',
  payment_method TEXT,
  payment_date TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla de historial de suscripciones (si no existe)
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id TEXT,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  amount DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices (si no existen)
CREATE INDEX IF NOT EXISTS users_subscription_status_idx ON users(subscription_status);
CREATE INDEX IF NOT EXISTS payment_transactions_user_id_idx ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS payment_transactions_mp_payment_id_idx ON payment_transactions(mercadopago_payment_id);
CREATE INDEX IF NOT EXISTS subscription_history_user_id_idx ON subscription_history(user_id);

-- Crear trigger para updated_at en payment_transactions (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_payment_transactions_updated_at'
  ) THEN
    CREATE TRIGGER update_payment_transactions_updated_at
      BEFORE UPDATE ON payment_transactions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Migración completada exitosamente!';
  RAISE NOTICE 'Columnas de suscripción agregadas a tabla users';
  RAISE NOTICE 'Tablas payment_transactions y subscription_history creadas';
END $$;
