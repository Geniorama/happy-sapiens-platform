-- Motivo de consulta y datos por cita (historial de cada consulta)
-- Ejecutar en Supabase SQL Editor

-- Motivo de consulta (obligatorio al agendar)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_reason TEXT;

-- Snapshot de datos que varían en cada consulta (historial)
-- Ej: peso, circunferencia, estrés, energía, sueño, etc.
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_snapshot JSONB DEFAULT '{}';

COMMENT ON COLUMN appointments.consultation_reason IS 'Motivo de consulta de esta cita (diligenciado al agendar)';
COMMENT ON COLUMN appointments.consultation_snapshot IS 'Datos que varían por consulta: weight, waist_circumference, stress_level, energy_level, sleep_hours, digestion, mood, concentration, etc.';
