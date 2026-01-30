-- ============================================
-- PRUEBA: Sistema de Referidos
-- ============================================
-- Script para probar el sistema de referidos
-- ============================================

-- 1. Verificar que la migración se ejecutó correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('referral_code', 'referred_by')
ORDER BY column_name;

-- 2. Ver códigos de referido de usuarios existentes
SELECT 
  id, 
  name, 
  email, 
  referral_code, 
  referred_by,
  created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Ver estadísticas de referidos
SELECT 
  u.name,
  u.email,
  u.referral_code,
  rs.total_referrals,
  rs.active_referrals,
  rs.created_at
FROM users u
LEFT JOIN referral_stats rs ON rs.user_id = u.id
ORDER BY rs.total_referrals DESC NULLS LAST;

-- 4. Ver todos los referidos (usando la vista)
SELECT 
  referrer_name,
  referrer_email,
  referral_code,
  referred_user_name,
  referred_user_email,
  referred_user_subscription,
  referred_at
FROM user_referrals
ORDER BY referred_at DESC;

-- 5. Buscar un usuario por su código de referido (simular validación)
SELECT id, name, email, referral_code
FROM users
WHERE referral_code = 'TU_CODIGO_AQUI'; -- Reemplaza con un código real

-- 6. Ver quién refirió a un usuario específico
SELECT 
  u.name as usuario_actual,
  u.email as email_actual,
  u.referral_code as su_codigo,
  r.name as referido_por,
  r.email as email_referidor,
  r.referral_code as codigo_usado
FROM users u
LEFT JOIN users r ON r.id = u.referred_by
WHERE u.email = 'test@example.com'; -- Reemplaza con un email real

-- 7. Top 10 referidores
SELECT 
  u.name,
  u.email,
  u.referral_code,
  COALESCE(rs.total_referrals, 0) as total_referidos,
  COALESCE(rs.active_referrals, 0) as referidos_activos
FROM users u
LEFT JOIN referral_stats rs ON rs.user_id = u.id
ORDER BY rs.total_referrals DESC NULLS LAST
LIMIT 10;

-- 8. Ver cadena de referidos (quién refirió a quién)
WITH RECURSIVE referral_chain AS (
  -- Usuarios sin referidor (nivel 0)
  SELECT 
    id,
    name,
    email,
    referral_code,
    referred_by,
    0 as level,
    ARRAY[id] as chain
  FROM users
  WHERE referred_by IS NULL
  
  UNION ALL
  
  -- Usuarios referidos (niveles siguientes)
  SELECT 
    u.id,
    u.name,
    u.email,
    u.referral_code,
    u.referred_by,
    rc.level + 1,
    rc.chain || u.id
  FROM users u
  INNER JOIN referral_chain rc ON u.referred_by = rc.id
)
SELECT 
  level,
  name,
  email,
  referral_code,
  array_length(chain, 1) as chain_length
FROM referral_chain
WHERE level > 0
ORDER BY level, name;

-- 9. Verificar que los triggers funcionan
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND trigger_name IN ('generate_referral_code_trigger', 'update_referral_stats_trigger');

-- 10. Prueba: Insertar un usuario y ver si se genera el código automáticamente
-- (NOTA: Esto creará un usuario de prueba, comentalo si no quieres ejecutarlo)
/*
INSERT INTO users (name, email, password)
VALUES ('Test Referral', 'test-ref@example.com', '$2b$12$dummyHashedPasswordHere')
RETURNING id, name, email, referral_code, created_at;
*/

-- 11. Prueba: Crear un usuario referido
-- (NOTA: Reemplaza 'CODIGO_REAL' con un código existente)
/*
INSERT INTO users (name, email, password, referred_by)
VALUES (
  'Usuario Referido',
  'referred-test@example.com',
  '$2b$12$dummyHashedPasswordHere',
  (SELECT id FROM users WHERE referral_code = 'CODIGO_REAL')
)
RETURNING id, name, email, referral_code, referred_by, created_at;
*/

-- 12. Verificar las estadísticas después de crear un referido
/*
SELECT 
  u.name,
  u.email,
  u.referral_code,
  rs.total_referrals,
  rs.active_referrals
FROM users u
LEFT JOIN referral_stats rs ON rs.user_id = u.id
WHERE u.referral_code = 'CODIGO_REAL';
*/
