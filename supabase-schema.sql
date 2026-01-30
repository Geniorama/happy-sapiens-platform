-- ============================================
-- Schema de Base de Datos para NextAuth + Supabase
-- ============================================
-- 
-- Instrucciones:
-- 1. Ve a tu proyecto en Supabase
-- 2. Ve a SQL Editor
-- 3. Copia y pega todo este archivo
-- 4. Ejecuta el script
-- ============================================

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE,
  email_verified TIMESTAMPTZ,
  image TEXT,
  password TEXT, -- Para autenticación con credenciales
  
  -- Información de suscripción
  subscription_status TEXT DEFAULT 'inactive', -- inactive, active, cancelled, past_due
  subscription_id TEXT, -- ID de suscripción en Mercado Pago
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  mercadopago_customer_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Cuentas (para OAuth providers)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- Tabla de Sesiones
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Tokens de Verificación
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Tabla de Transacciones de Pago
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mercadopago_payment_id TEXT UNIQUE,
  mercadopago_preference_id TEXT,
  status TEXT NOT NULL, -- pending, approved, rejected, cancelled
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'ARS',
  payment_method TEXT,
  payment_date TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Historial de Suscripciones
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id TEXT,
  action TEXT NOT NULL, -- created, renewed, cancelled, expired
  previous_status TEXT,
  new_status TEXT,
  amount DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts(user_id);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_session_token_idx ON sessions(session_token);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_subscription_status_idx ON users(subscription_status);
CREATE INDEX IF NOT EXISTS payment_transactions_user_id_idx ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS payment_transactions_mp_payment_id_idx ON payment_transactions(mercadopago_payment_id);
CREATE INDEX IF NOT EXISTS subscription_history_user_id_idx ON subscription_history(user_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para users
-- Los usuarios pueden ver y actualizar su propia información
CREATE POLICY "Usuarios pueden ver su propia información"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "Usuarios pueden actualizar su propia información"
  ON users FOR UPDATE
  USING (auth.uid()::text = id::text);

-- Políticas RLS para accounts
CREATE POLICY "Usuarios pueden ver sus propias cuentas"
  ON accounts FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Políticas RLS para sessions
CREATE POLICY "Usuarios pueden ver sus propias sesiones"
  ON sessions FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Insertar usuario de prueba (opcional - puedes comentar o eliminar)
-- Contraseña: password123
-- INSERT INTO users (name, email, password) VALUES 
-- ('Usuario de Prueba', 'test@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYAT8jl0F5e');

-- ============================================
-- ¡Listo! Las tablas han sido creadas
-- ============================================
