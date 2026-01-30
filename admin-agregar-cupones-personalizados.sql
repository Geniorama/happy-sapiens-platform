-- ============================================
-- ADMIN: Agregar Cupones Personalizados
-- ============================================
-- Script para que los admins agreguen cupones
-- con imágenes y descripciones personalizadas
-- ============================================

-- ========================================
-- OPCIÓN 1: Cupones Estándar (sin personalizar)
-- ========================================
-- Usan la imagen y descripción de la marca

-- Agregar 10 cupones estándar de Nike
INSERT INTO coupons (partner_id, coupon_code) 
SELECT 
  (SELECT id FROM partners WHERE name = 'Nike' LIMIT 1),
  'NIKE-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || gs.n::TEXT) FROM 1 FOR 8))
FROM generate_series(1, 10) gs(n)
WHERE EXISTS (SELECT 1 FROM partners WHERE name = 'Nike');

-- ========================================
-- OPCIÓN 2: Cupones Personalizados
-- ========================================
-- Con título, descripción e imagen específica

-- Ejemplo 1: Cupón especial "Black Friday Nike"
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) 
SELECT 
  (SELECT id FROM partners WHERE name = 'Nike' LIMIT 1),
  'NIKE-BF-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || gs.n::TEXT) FROM 1 FOR 6)),
  'Black Friday Running',
  '30% OFF en toda la colección de running - Solo por tiempo limitado',
  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=400&fit=crop'
FROM generate_series(1, 5) gs(n)
WHERE EXISTS (SELECT 1 FROM partners WHERE name = 'Nike');

-- Ejemplo 2: Cupón especial "Pack Proteínas MyProtein"
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) 
SELECT 
  (SELECT id FROM partners WHERE name = 'MyProtein' LIMIT 1),
  'MYP-PACK-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || gs.n::TEXT) FROM 1 FOR 6)),
  'Pack Proteínas Premium',
  '40% OFF comprando 2 o más productos de proteína',
  'https://images.unsplash.com/photo-1579722821273-0f6c7d6ba513?w=800&h=400&fit=crop'
FROM generate_series(1, 5) gs(n)
WHERE EXISTS (SELECT 1 FROM partners WHERE name = 'MyProtein');

-- Ejemplo 3: Cupón especial "Smartwatches Garmin"
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) 
SELECT 
  (SELECT id FROM partners WHERE name = 'Garmin' LIMIT 1),
  'GAR-WATCH-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || gs.n::TEXT) FROM 1 FOR 6)),
  'Relojes Inteligentes',
  '15% OFF en la serie Forerunner y Fenix',
  'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&h=400&fit=crop'
FROM generate_series(1, 5) gs(n)
WHERE EXISTS (SELECT 1 FROM partners WHERE name = 'Garmin');

-- Ejemplo 4: Cupón especial "Verano Under Armour"
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) 
SELECT 
  (SELECT id FROM partners WHERE name = 'Under Armour' LIMIT 1),
  'UA-SUMMER-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || gs.n::TEXT) FROM 1 FOR 6)),
  'Colección Verano',
  '25% OFF en toda la ropa deportiva de verano',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=400&fit=crop'
FROM generate_series(1, 5) gs(n)
WHERE EXISTS (SELECT 1 FROM partners WHERE name = 'Under Armour');

-- Ejemplo 5: Cupón especial "Outdoor Decathlon"
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) 
SELECT 
  (SELECT id FROM partners WHERE name = 'Decathlon' LIMIT 1),
  'DEC-OUTDOOR-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || gs.n::TEXT) FROM 1 FOR 6)),
  'Aventura Outdoor',
  '20% OFF en equipamiento para camping y senderismo',
  'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&h=400&fit=crop'
FROM generate_series(1, 5) gs(n)
WHERE EXISTS (SELECT 1 FROM partners WHERE name = 'Decathlon');

-- ========================================
-- OPCIÓN 3: Cupón Individual Personalizado
-- ========================================
-- Para crear un solo cupón específico

INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url,
  expires_at
) VALUES (
  (SELECT id FROM partners WHERE name = 'Nike' LIMIT 1),
  'NIKE-VIP-2024',
  'Cupón VIP Exclusivo',
  '50% OFF - Solo para miembros premium',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=400&fit=crop',
  NOW() + INTERVAL '30 days'
);

-- ========================================
-- VERIFICAR CUPONES CREADOS
-- ========================================

-- Ver todos los cupones disponibles por marca
SELECT 
  p.name as marca,
  COUNT(c.id) as total_cupones,
  COUNT(c.id) FILTER (WHERE c.is_assigned = false) as disponibles,
  COUNT(c.id) FILTER (WHERE c.is_assigned = true) as asignados,
  COUNT(c.id) FILTER (WHERE c.title IS NOT NULL) as personalizados
FROM partners p
LEFT JOIN coupons c ON c.partner_id = p.id
GROUP BY p.name
ORDER BY p.name;

-- Ver cupones personalizados
SELECT 
  p.name as marca,
  c.coupon_code,
  c.title,
  c.description,
  CASE 
    WHEN c.cover_image_url IS NOT NULL THEN 'Sí'
    ELSE 'No'
  END as tiene_imagen_propia,
  c.is_assigned
FROM coupons c
JOIN partners p ON p.id = c.partner_id
WHERE c.title IS NOT NULL
ORDER BY p.name, c.created_at DESC;

-- Ver cupones disponibles (no asignados)
SELECT 
  p.name as marca,
  c.coupon_code,
  COALESCE(c.title, 'Estándar') as tipo,
  c.is_assigned
FROM coupons c
JOIN partners p ON p.id = c.partner_id
WHERE c.is_assigned = false
ORDER BY p.name, c.created_at DESC
LIMIT 20;

-- ========================================
-- ACTUALIZAR CUPONES EXISTENTES
-- ========================================

-- Personalizar un cupón existente
UPDATE coupons
SET 
  title = 'Oferta Especial',
  description = 'Descuento exclusivo por tiempo limitado',
  cover_image_url = 'https://images.unsplash.com/photo-XXXXXX?w=800&h=400&fit=crop'
WHERE coupon_code = 'CODIGO-AQUI';

-- Remover personalización (volver a usar datos de la marca)
UPDATE coupons
SET 
  title = NULL,
  description = NULL,
  cover_image_url = NULL
WHERE coupon_code = 'CODIGO-AQUI';

-- ========================================
-- SUGERENCIAS DE IMÁGENES POR CATEGORÍA
-- ========================================

/*
DEPORTES / RUNNING:
- photo-1552674605-db6ffd4facb5 (persona corriendo)
- photo-1461896836934-ffe607ba8211 (runner en acción)
- photo-1483721310020-03333e577078 (zapatillas running)

FITNESS / GYM:
- photo-1517836357463-d25dfeac3438 (mujer en gym)
- photo-1534438327276-14e5300c3a48 (hombre entrenando)
- photo-1571019614242-c5c5dee9f50b (gym equipment)

NUTRICIÓN / PROTEÍNAS:
- photo-1579722821273-0f6c7d6ba513 (batido de proteína)
- photo-1593095948071-474c5cc2989d (suplementos)
- photo-1556909114-f6e7ad7d3136 (comida saludable)

TECNOLOGÍA / SMARTWATCHES:
- photo-1579586337278-3befd40fd17a (smartwatch)
- photo-1551958219-acbc608c6377 (runner con watch)
- photo-1434493789847-2f02dc6ca35d (tech fitness)

OUTDOOR / AVENTURA:
- photo-1504280390367-361c6d9f38f4 (camping)
- photo-1551632811-561732d1e306 (hiking)
- photo-1571902943202-507ec2618e8f (outdoor activity)

YOGA / WELLNESS:
- photo-1544367567-0f2fcb009e0b (yoga)
- photo-1506126613408-eca07ce68773 (meditación)
- photo-1599901860904-17e6ed7083a0 (wellness)

URL completa: https://images.unsplash.com/photo-XXXXXX?w=800&h=400&fit=crop
*/
