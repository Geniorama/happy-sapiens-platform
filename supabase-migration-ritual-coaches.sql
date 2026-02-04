-- Migración para el módulo de Ritual Coaches
-- Ejecutar en Supabase SQL Editor

-- Agregar campos de coach a la tabla users (si no existen)
-- Ejecutar cada ALTER TABLE individualmente para evitar errores

-- Agregar campo role si no existe
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Agregar campo bio si no existe
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Agregar campo specialization si no existe
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization VARCHAR(255);

-- Agregar campo phone si no existe
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Agregar campo is_coach_active si no existe
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_coach_active BOOLEAN DEFAULT false;

-- Tabla de disponibilidad de coaches (horarios disponibles)
CREATE TABLE IF NOT EXISTS coach_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(coach_id, day_of_week, start_time)
);

-- Tabla de reservas/citas
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60, -- Duración en minutos
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show
  notes TEXT, -- Notas del usuario o del coach
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show'))
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_coach_active ON users(is_coach_active) WHERE role = 'coach';
CREATE INDEX IF NOT EXISTS idx_coach_availability_coach ON coach_availability(coach_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_coach ON appointments(coach_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- RLS (Row Level Security)
ALTER TABLE coach_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Políticas para coaches (todos pueden ver coaches activos)
-- Nota: Los coaches son usuarios con role='coach', así que usamos la política de users
-- Si necesitas políticas específicas, puedes agregarlas aquí

-- Políticas para disponibilidad (todos pueden ver disponibilidad de coaches activos)
DROP POLICY IF EXISTS "Anyone can view availability of active coaches" ON coach_availability;

CREATE POLICY "Anyone can view availability of active coaches"
  ON coach_availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = coach_availability.coach_id 
      AND users.role = 'coach'
      AND users.is_coach_active = true
    )
  );

-- Políticas para appointments
-- Los usuarios pueden ver sus propias citas
CREATE POLICY "Users can view their own appointments"
  ON appointments FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden crear sus propias citas
CREATE POLICY "Users can create their own appointments"
  ON appointments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propias citas (solo si están programadas)
CREATE POLICY "Users can update their own scheduled appointments"
  ON appointments FOR UPDATE
  USING (auth.uid() = user_id AND status = 'scheduled')
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden cancelar sus propias citas
CREATE POLICY "Users can cancel their own appointments"
  ON appointments FOR UPDATE
  USING (auth.uid() = user_id AND status = 'scheduled')
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at de appointments
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Nota: El trigger para users.updated_at ya debería existir en el schema principal

-- Datos de ejemplo (opcional)
-- Nota: Estos usuarios deben crearse primero en la tabla users con role='coach'
-- Ejemplo de cómo crear un coach:
-- INSERT INTO users (name, email, role, bio, specialization, phone, is_coach_active) 
-- VALUES 
--   ('María González', 'maria.gonzalez@happysapiens.com', 'coach', 
--    'Especialista en nutrición deportiva con más de 10 años de experiencia ayudando a atletas a alcanzar sus objetivos.', 
--    'Nutrición', '+34 600 123 456', true)
-- ON CONFLICT (email) DO UPDATE SET 
--   role = 'coach',
--   bio = EXCLUDED.bio,
--   specialization = EXCLUDED.specialization,
--   phone = EXCLUDED.phone,
--   is_coach_active = EXCLUDED.is_coach_active;

-- Disponibilidad de ejemplo (Lunes a Viernes, 9:00 - 18:00)
-- INSERT INTO coach_availability (coach_id, day_of_week, start_time, end_time)
-- SELECT 
--   id,
--   day,
--   '09:00'::TIME,
--   '18:00'::TIME
-- FROM users, generate_series(1, 5) AS day
-- WHERE role = 'coach' AND is_coach_active = true
-- ON CONFLICT DO NOTHING;
