-- Migración: Historia Clínica Nutricional - Nuevos campos
-- Ejecutar en Supabase SQL Editor después de tener user_health_profiles

-- 1. DATOS BÁSICOS (además de los existentes)
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS consultation_reason TEXT;
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS occupation TEXT;

-- 2. ANTECEDENTES MÉDICOS
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS supplements TEXT;
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS surgeries TEXT;
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS intolerances TEXT;
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS family_history TEXT;

-- 3. EVALUACIÓN ANTROPOMÉTRICA
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS waist_circumference DECIMAL(5, 2);
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS body_fat_percent DECIMAL(4, 2);

-- 5. ESTILO DE VIDA
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS exercise_type TEXT;
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS exercise_frequency TEXT;
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS sleep_hours DECIMAL(3, 1);
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS stress_level INTEGER;
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS work_type TEXT;

-- 6. EVALUACIÓN FUNCIONAL
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS energy_level INTEGER;
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS digestion TEXT;
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS mood TEXT;
ALTER TABLE user_health_profiles ADD COLUMN IF NOT EXISTS concentration TEXT;

COMMENT ON COLUMN user_health_profiles.consultation_reason IS 'Motivo de consulta';
COMMENT ON COLUMN user_health_profiles.occupation IS 'Ocupación';
COMMENT ON COLUMN user_health_profiles.stress_level IS 'Nivel de estrés 1-5';
COMMENT ON COLUMN user_health_profiles.energy_level IS 'Nivel de energía 1-5';
