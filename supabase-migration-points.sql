-- ============================================
-- MIGRACIÓN: Sistema de gamificación (puntos)
-- ============================================
-- Ejecuta este script en Supabase SQL Editor
-- ============================================

-- Tabla de transacciones de puntos (historial)
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT,
  reference_type TEXT,
  reference_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS point_transactions_user_id_idx ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS point_transactions_created_at_idx ON point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS point_transactions_action_type_idx ON point_transactions(action_type);

-- Tabla de saldo actual por usuario (evita sumar todo el historial)
CREATE TABLE IF NOT EXISTS user_points (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_points_user_id_idx ON user_points(user_id);

-- Trigger para actualizar updated_at en user_points
CREATE OR REPLACE FUNCTION update_user_points_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_points_updated_at_trigger ON user_points;
CREATE TRIGGER update_user_points_updated_at_trigger
  BEFORE UPDATE ON user_points
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points_updated_at();

-- Función para otorgar puntos (inserta transacción y actualiza saldo)
CREATE OR REPLACE FUNCTION award_points(
  p_user_id UUID,
  p_amount INTEGER,
  p_action_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount debe ser positivo';
  END IF;

  INSERT INTO point_transactions (user_id, amount, action_type, description, reference_type, reference_id, metadata)
  VALUES (p_user_id, p_amount, p_action_type, p_description, p_reference_type, p_reference_id, p_metadata)
  RETURNING id INTO v_transaction_id;

  INSERT INTO user_points (user_id, total_points)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET total_points = user_points.total_points + p_amount;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Función para descontar puntos (p. ej. canjear recompensas)
CREATE OR REPLACE FUNCTION spend_points(
  p_user_id UUID,
  p_amount INTEGER,
  p_action_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_current INTEGER;
  v_transaction_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount debe ser positivo';
  END IF;

  SELECT COALESCE(total_points, 0) INTO v_current FROM user_points WHERE user_id = p_user_id;

  IF v_current < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente: tiene %, necesita %', v_current, p_amount;
  END IF;

  INSERT INTO point_transactions (user_id, amount, action_type, description, reference_type, reference_id, metadata)
  VALUES (p_user_id, -p_amount, p_action_type, p_description, p_reference_type, p_reference_id, p_metadata)
  RETURNING id INTO v_transaction_id;

  UPDATE user_points SET total_points = total_points - p_amount WHERE user_id = p_user_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

-- Usuarios solo ven sus propias transacciones y saldo
CREATE POLICY "Usuarios ven sus propias transacciones de puntos"
  ON point_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios ven su propio saldo de puntos"
  ON user_points FOR SELECT
  USING (auth.uid() = user_id);

-- Solo el backend (service role) puede insertar/actualizar; las políticas anteriores son para anon/authenticated si usan RLS
-- Si solo usas service role desde la API, no necesitas políticas de INSERT/UPDATE para anon.
-- Para que el backend pueda escribir sin auth.uid(), el service role bypasea RLS por defecto.
