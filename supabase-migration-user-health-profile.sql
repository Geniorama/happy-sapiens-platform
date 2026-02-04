-- Migración para el perfil de salud del usuario
-- Ejecutar en Supabase SQL Editor

-- Tabla de perfil de salud del usuario
CREATE TABLE IF NOT EXISTS user_health_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Datos físicos
  weight DECIMAL(5, 2), -- Peso en kg
  height DECIMAL(5, 2), -- Talla/altura en cm
  age INTEGER,
  gender VARCHAR(50), -- male, female, other, prefer-not-say
  
  -- Información médica
  diseases TEXT, -- Enfermedades o condiciones médicas
  medications TEXT, -- Medicamentos actuales
  allergies TEXT, -- Alergias
  
  -- Objetivos y actividad
  objectives TEXT, -- Objetivos del usuario (puede ser múltiple)
  activity_level VARCHAR(50), -- sedentary, light, moderate, active, very_active
  current_exercise_routine TEXT, -- Rutina de ejercicio actual
  
  -- Información adicional
  previous_injuries TEXT, -- Lesiones previas
  dietary_restrictions TEXT, -- Restricciones dietéticas
  additional_notes TEXT, -- Notas adicionales
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_health_profiles_user ON user_health_profiles(user_id);

-- RLS (Row Level Security)
ALTER TABLE user_health_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view their own health profile"
  ON user_health_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden crear su propio perfil
CREATE POLICY "Users can create their own health profile"
  ON user_health_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update their own health profile"
  ON user_health_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_user_health_profiles_updated_at
  BEFORE UPDATE ON user_health_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
