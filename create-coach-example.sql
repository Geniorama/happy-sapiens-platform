-- Script para crear coaches de ejemplo
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- OPCIÓN 1: Crear nuevos usuarios como coaches
-- ============================================

-- Coach 1: Nutrición
INSERT INTO users (name, email, role, bio, specialization, phone, is_coach_active)
VALUES (
  'María González',
  'maria.gonzalez@happysapiens.com',
  'coach',
  'Especialista en nutrición deportiva con más de 10 años de experiencia ayudando a atletas a alcanzar sus objetivos. Certificada en nutrición deportiva y bienestar integral.',
  'Nutrición',
  '+34 600 123 456',
  true
)
ON CONFLICT (email) DO UPDATE SET 
  role = 'coach',
  bio = EXCLUDED.bio,
  specialization = EXCLUDED.specialization,
  phone = EXCLUDED.phone,
  is_coach_active = EXCLUDED.is_coach_active;

-- Coach 2: Entrenamiento
INSERT INTO users (name, email, role, bio, specialization, phone, is_coach_active)
VALUES (
  'Carlos Ruiz',
  'carlos.ruiz@happysapiens.com',
  'coach',
  'Entrenador personal certificado especializado en fuerza y acondicionamiento físico. Ayudo a personas a alcanzar sus metas de fitness de manera segura y efectiva.',
  'Entrenamiento',
  '+34 600 234 567',
  true
)
ON CONFLICT (email) DO UPDATE SET 
  role = 'coach',
  bio = EXCLUDED.bio,
  specialization = EXCLUDED.specialization,
  phone = EXCLUDED.phone,
  is_coach_active = EXCLUDED.is_coach_active;

-- Coach 3: Bienestar Mental
INSERT INTO users (name, email, role, bio, specialization, phone, is_coach_active)
VALUES (
  'Ana Martínez',
  'ana.martinez@happysapiens.com',
  'coach',
  'Psicóloga deportiva enfocada en el bienestar mental y rendimiento óptimo. Especializada en manejo del estrés, motivación y desarrollo personal.',
  'Bienestar Mental',
  '+34 600 345 678',
  true
)
ON CONFLICT (email) DO UPDATE SET 
  role = 'coach',
  bio = EXCLUDED.bio,
  specialization = EXCLUDED.specialization,
  phone = EXCLUDED.phone,
  is_coach_active = EXCLUDED.is_coach_active;

-- ============================================
-- Agregar disponibilidad a los coaches
-- ============================================

-- Disponibilidad para todos los coaches activos (Lunes a Viernes, 9:00 - 18:00)
INSERT INTO coach_availability (coach_id, day_of_week, start_time, end_time)
SELECT 
  u.id,
  day,
  '09:00'::TIME,
  '18:00'::TIME
FROM users u, generate_series(1, 5) AS day
WHERE u.role = 'coach' 
  AND u.is_coach_active = true
  AND NOT EXISTS (
    SELECT 1 FROM coach_availability ca
    WHERE ca.coach_id = u.id 
    AND ca.day_of_week = day
    AND ca.start_time = '09:00'::TIME
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- OPCIÓN 2: Convertir un usuario existente en coach
-- ============================================

-- Descomenta y reemplaza 'usuario@example.com' con el email del usuario
-- UPDATE users 
-- SET 
--   role = 'coach',
--   bio = 'Biografía del coach aquí',
--   specialization = 'Tu especialización',
--   phone = '+34 600 000 000',
--   is_coach_active = true
-- WHERE email = 'usuario@example.com';

-- ============================================
-- Verificar coaches creados
-- ============================================

-- Ejecuta esto para ver todos los coaches activos:
-- SELECT id, name, email, specialization, is_coach_active 
-- FROM users 
-- WHERE role = 'coach' 
-- ORDER BY name;
