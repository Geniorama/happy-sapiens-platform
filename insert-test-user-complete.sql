-- ============================================
-- Insertar o actualizar usuario de prueba completo
-- ============================================
-- Email: test@example.com
-- Contraseña: password123
-- ============================================

-- Insertar/actualizar usuario con todos los campos
INSERT INTO users (
  name, 
  email, 
  password, 
  subscription_status,
  phone,
  birth_date,
  gender
) 
VALUES (
  'Juan Pérez',
  'test@example.com',
  '$2b$12$3dVOZEsVOz2Wf8PxvCukku4IelRCCAXweEHFnK1WU/y2/hXiOXS..',
  'inactive',
  '+54 9 11 1234 5678',
  '1990-05-15',
  'male'
)
ON CONFLICT (email) 
DO UPDATE SET 
  password = '$2b$12$3dVOZEsVOz2Wf8PxvCukku4IelRCCAXweEHFnK1WU/y2/hXiOXS..',
  phone = '+54 9 11 1234 5678',
  birth_date = '1990-05-15',
  gender = 'male',
  updated_at = NOW();

-- Verificar el usuario insertado
SELECT 
  id, 
  name, 
  email, 
  phone,
  birth_date,
  gender,
  subscription_status,
  created_at
FROM users 
WHERE email = 'test@example.com';
