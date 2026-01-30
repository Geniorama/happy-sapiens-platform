-- ============================================
-- MIGRACIÓN: Límite de Cupones por Usuario
-- ============================================
-- Permite definir cuántos cupones de cada
-- campaña puede obtener cada usuario
-- ============================================

-- Agregar campo max_per_user a coupons
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_per_user INTEGER DEFAULT NULL;

-- NULL = sin límite
-- 1 = máximo 1 cupón por usuario
-- 2 = máximo 2 cupones por usuario
-- etc.

-- Comentario para claridad
COMMENT ON COLUMN coupons.max_per_user IS 'Máximo de cupones de esta campaña que puede obtener cada usuario. NULL = sin límite';

-- Actualizar cupones existentes con límites sugeridos
-- (Opcional - ajusta según tus necesidades)

-- Cupones VIP: 1 por usuario
UPDATE coupons 
SET max_per_user = 1
WHERE title LIKE '%VIP%' OR title LIKE '%Exclusivo%';

-- Cupones de Black Friday o promociones especiales: 2 por usuario
UPDATE coupons 
SET max_per_user = 2
WHERE title LIKE '%Black Friday%' OR title LIKE '%Especial%';

-- Cupones estándar sin título personalizado: sin límite
UPDATE coupons 
SET max_per_user = NULL
WHERE title IS NULL;

-- Verificar la migración
SELECT 
  COALESCE(title, 'Estándar') as campaña,
  COUNT(*) as total_cupones,
  max_per_user as limite_por_usuario
FROM coupons
GROUP BY title, max_per_user
ORDER BY title;
