-- ============================================
-- TEST: Agregar Cupones Personalizados
-- ============================================
-- Script simple para probar cupones personalizados
-- Ejecuta UNA query a la vez
-- ============================================

-- PASO 1: Verificar que existan las marcas
SELECT id, name FROM partners WHERE is_active = true;

-- PASO 2: Crear 1 cupón personalizado de Nike (Black Friday)
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) VALUES (
  (SELECT id FROM partners WHERE name = 'Nike' LIMIT 1),
  'NIKE-BF-TEST1',
  'Black Friday Running',
  '30% OFF en toda la colección de running',
  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=400&fit=crop'
);

-- PASO 3: Crear 1 cupón personalizado de MyProtein
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) VALUES (
  (SELECT id FROM partners WHERE name = 'MyProtein' LIMIT 1),
  'MYP-PACK-TEST1',
  'Pack Proteínas Premium',
  '40% OFF comprando 2 o más productos',
  'https://images.unsplash.com/photo-1579722821273-0f6c7d6ba513?w=800&h=400&fit=crop'
);

-- PASO 4: Crear 1 cupón estándar de Nike (sin personalizar)
INSERT INTO coupons (partner_id, coupon_code) 
VALUES (
  (SELECT id FROM partners WHERE name = 'Nike' LIMIT 1),
  'NIKE-STD-TEST1'
);

-- PASO 5: Verificar los cupones creados
SELECT 
  c.coupon_code,
  c.title,
  c.description,
  CASE 
    WHEN c.cover_image_url IS NOT NULL THEN 'Imagen propia'
    ELSE 'Usa imagen de marca'
  END as tipo_imagen,
  p.name as marca,
  c.is_assigned
FROM coupons c
JOIN partners p ON p.id = c.partner_id
WHERE c.coupon_code LIKE '%-TEST%'
ORDER BY c.created_at DESC;

-- PASO 6 (OPCIONAL): Limpiar cupones de prueba
-- Descomenta para eliminar los cupones de test
/*
DELETE FROM coupons WHERE coupon_code LIKE '%-TEST%';
*/
