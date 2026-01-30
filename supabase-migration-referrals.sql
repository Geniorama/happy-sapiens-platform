-- ============================================
-- MIGRACIÓN: Sistema de Referidos
-- ============================================
-- Ejecuta este script en Supabase SQL Editor
-- ============================================

-- Agregar columnas de referidos a la tabla users
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS users_referral_code_idx ON users(referral_code);
CREATE INDEX IF NOT EXISTS users_referred_by_idx ON users(referred_by);

-- Función para generar código de referido único
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Sin caracteres confusos (0,O,1,I)
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    -- Generar código de 8 caracteres
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Verificar si el código ya existe
    SELECT EXISTS(SELECT 1 FROM users WHERE referral_code = result) INTO code_exists;
    
    -- Si no existe, salir del loop
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar código de referido automáticamente al crear usuario
CREATE OR REPLACE FUNCTION set_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_referral_code_trigger ON users;
CREATE TRIGGER generate_referral_code_trigger
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_referral_code();

-- Generar códigos para usuarios existentes que no tengan
UPDATE users
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- Tabla para estadísticas de referidos (opcional)
CREATE TABLE IF NOT EXISTS referral_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_referrals INTEGER DEFAULT 0,
  active_referrals INTEGER DEFAULT 0,
  total_earnings DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS referral_stats_user_id_idx ON referral_stats(user_id);

-- Trigger para actualizar stats automáticamente
CREATE OR REPLACE FUNCTION update_referral_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referred_by IS NOT NULL THEN
    -- Insertar o actualizar estadísticas del referidor
    INSERT INTO referral_stats (user_id, total_referrals, active_referrals)
    VALUES (NEW.referred_by, 1, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      total_referrals = referral_stats.total_referrals + 1,
      active_referrals = referral_stats.active_referrals + 1,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_referral_stats_trigger ON users;
CREATE TRIGGER update_referral_stats_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_stats();

-- Vista para ver referidos de un usuario
CREATE OR REPLACE VIEW user_referrals AS
SELECT 
  u1.id as referrer_id,
  u1.name as referrer_name,
  u1.email as referrer_email,
  u1.referral_code,
  u2.id as referred_user_id,
  u2.name as referred_user_name,
  u2.email as referred_user_email,
  u2.subscription_status as referred_user_subscription,
  u2.created_at as referred_at
FROM users u1
LEFT JOIN users u2 ON u2.referred_by = u1.id
WHERE u2.id IS NOT NULL
ORDER BY u2.created_at DESC;

-- Verificar la migración
SELECT 
  COUNT(*) as total_users,
  COUNT(referral_code) as users_with_code,
  COUNT(referred_by) as users_referred
FROM users;

-- Ver algunos códigos generados
SELECT id, name, email, referral_code, referred_by 
FROM users 
LIMIT 10;
