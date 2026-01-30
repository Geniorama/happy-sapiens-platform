-- ============================================
-- MIGRACIÓN: Agregar campos de perfil
-- ============================================
-- Ejecuta este script en Supabase SQL Editor
-- para agregar campos de fecha de nacimiento,
-- teléfono y género a la tabla users
-- ============================================

-- Agregar columna birth_date
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Agregar columna phone
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Agregar columna gender
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;

-- Crear índice para búsquedas por teléfono
CREATE INDEX IF NOT EXISTS users_phone_idx ON users(phone);

-- Verificar las columnas creadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('phone', 'birth_date', 'gender')
ORDER BY column_name;
