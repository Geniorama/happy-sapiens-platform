-- ============================================
-- Script para Admins: Agregar Cupones
-- ============================================
-- Usa este script para agregar cupones a cualquier marca
-- ============================================

-- OPCIÓN 1: Agregar cupones uno por uno
-- Reemplaza 'PARTNER_ID_AQUI' con el ID de la marca

INSERT INTO coupons (partner_id, coupon_code) VALUES
  ('PARTNER_ID_AQUI'::UUID, 'NIKE-ABC123XY'),
  ('PARTNER_ID_AQUI'::UUID, 'NIKE-DEF456ZW'),
  ('PARTNER_ID_AQUI'::UUID, 'NIKE-GHI789UV');

-- OPCIÓN 2: Generar múltiples cupones automáticamente
-- Este script genera 20 cupones para Nike

INSERT INTO coupons (partner_id, coupon_code) 
SELECT 
  p.id,
  'NIKE-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
FROM partners p
CROSS JOIN generate_series(1, 20) -- Cambia 20 por la cantidad que necesites
WHERE p.name = 'Nike';

-- OPCIÓN 3: Ver todas las marcas disponibles y sus IDs

SELECT 
  id,
  name,
  category,
  discount_percentage
FROM partners
ORDER BY name;

-- OPCIÓN 4: Ver estadísticas de cupones por marca

SELECT 
  p.name as marca,
  p.discount_percentage as descuento,
  COUNT(c.id) as total_cupones,
  COUNT(c.id) FILTER (WHERE c.is_assigned = false) as disponibles,
  COUNT(c.id) FILTER (WHERE c.is_assigned = true AND c.used_at IS NULL) as asignados_sin_usar,
  COUNT(c.id) FILTER (WHERE c.used_at IS NOT NULL) as usados
FROM partners p
LEFT JOIN coupons c ON c.partner_id = p.id
GROUP BY p.id, p.name, p.discount_percentage
ORDER BY p.name;

-- OPCIÓN 5: Ver cupones disponibles de una marca específica

SELECT 
  c.id,
  c.coupon_code,
  c.is_assigned,
  c.created_at
FROM coupons c
JOIN partners p ON p.id = c.partner_id
WHERE p.name = 'Nike'
  AND c.is_assigned = false
ORDER BY c.created_at DESC;

-- OPCIÓN 6: Liberar un cupón asignado (devolverlo al pool disponible)
-- Usar solo en casos especiales

UPDATE coupons
SET 
  user_id = NULL,
  is_assigned = false,
  assigned_at = NULL,
  used_at = NULL,
  expires_at = NULL
WHERE coupon_code = 'CODIGO-DEL-CUPON-AQUI';

-- OPCIÓN 7: Eliminar cupones que nunca fueron asignados

DELETE FROM coupons
WHERE is_assigned = false
  AND partner_id = 'PARTNER_ID_AQUI'::UUID;
