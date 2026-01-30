-- ============================================
-- CREAR CUPONES DE EJEMPLO (VERSION FRESH)
-- ============================================
-- Este script puede ejecutarse múltiples veces
-- Genera códigos únicos cada vez
-- ============================================

-- PASO 1: Limpiar cupones de ejemplo anteriores (OPCIONAL)
-- Descomenta si quieres eliminar cupones anteriores
/*
DELETE FROM coupons 
WHERE coupon_code LIKE 'NIKE-BF%'
   OR coupon_code LIKE 'NIKE-PREM%'
   OR coupon_code LIKE 'NIKE-STD%'
   OR coupon_code LIKE 'NIKE-VIP%'
   OR coupon_code LIKE 'MYP-PACK%'
   OR coupon_code LIKE 'MYP-NUT%'
   OR coupon_code LIKE 'MYP-VIP%'
   OR coupon_code LIKE 'GAR-WATCH%'
   OR coupon_code LIKE 'GAR-RUN%'
   OR coupon_code LIKE 'UA-SUMMER%'
   OR coupon_code LIKE 'UA-TRAIN%'
   OR coupon_code LIKE 'DEC-OUT%'
   OR coupon_code LIKE 'DEC-MOUNT%'
   OR coupon_code LIKE 'DEC-STD%';
*/

-- ========================================
-- CUPONES NIKE
-- ========================================

-- 1. Black Friday Running (límite: 2 por usuario)
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url,
  max_per_user,
  expires_at
) VALUES (
  (SELECT id FROM partners WHERE name = 'Nike' LIMIT 1),
  'NIKE-BF-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 6)),
  'Black Friday Running',
  '30% OFF en toda la colección de running - Solo 48 horas',
  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=400&fit=crop',
  2,
  NOW() + INTERVAL '30 days'
);

-- 2. Zapatillas Premium (límite: 1 por usuario)
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url,
  max_per_user
) VALUES (
  (SELECT id FROM partners WHERE name = 'Nike' LIMIT 1),
  'NIKE-PREM-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 5)),
  'Zapatillas Premium',
  '20% OFF en Air Max y Jordan - Edición limitada',
  'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&h=400&fit=crop',
  1
);

-- 3. Cupón Estándar Nike
INSERT INTO coupons (partner_id, coupon_code) 
VALUES (
  (SELECT id FROM partners WHERE name = 'Nike' LIMIT 1),
  'NIKE-STD-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 5))
);

-- 4. VIP Exclusivo (límite: 1 por usuario - muy exclusivo)
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url,
  max_per_user,
  expires_at
) VALUES (
  (SELECT id FROM partners WHERE name = 'Nike' LIMIT 1),
  'NIKE-VIP-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 5)),
  'Acceso VIP Exclusivo',
  '50% OFF - Solo para miembros premium Happy Sapiens',
  'https://images.unsplash.com/photo-1515238152791-8216bfdf89a7?w=800&h=400&fit=crop',
  1,
  NOW() + INTERVAL '15 days'
);

-- ========================================
-- CUPONES MYPROTEIN
-- ========================================

-- 5. Pack Proteínas (límite: 3 por usuario)
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url,
  max_per_user
) VALUES (
  (SELECT id FROM partners WHERE name = 'MyProtein' LIMIT 1),
  'MYP-PACK-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 5)),
  'Pack Proteínas Premium',
  '40% OFF comprando 2 o más productos de proteína whey',
  'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800&h=400&fit=crop',
  3
);

-- 6. Nutrición Deportiva
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) VALUES (
  (SELECT id FROM partners WHERE name = 'MyProtein' LIMIT 1),
  'MYP-NUT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 5)),
  'Nutrición Deportiva Completa',
  '30% OFF en vitaminas, proteínas y suplementos',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop'
);

-- 7. Bienvenida Premium
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url,
  expires_at
) VALUES (
  (SELECT id FROM partners WHERE name = 'MyProtein' LIMIT 1),
  'MYP-VIP-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 5)),
  'Bienvenida Premium',
  '35% OFF en tu primera compra - Código VIP',
  'https://images.unsplash.com/photo-1532384816664-01b8b7238c8d?w=800&h=400&fit=crop',
  NOW() + INTERVAL '20 days'
);

-- ========================================
-- CUPONES GARMIN
-- ========================================

-- 8. Smartwatches Premium
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url,
  expires_at
) VALUES (
  (SELECT id FROM partners WHERE name = 'Garmin' LIMIT 1),
  'GAR-WATCH-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 4)),
  'Relojes Inteligentes',
  '15% OFF en Forerunner y Fenix - Hasta agotar stock',
  'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&h=400&fit=crop',
  NOW() + INTERVAL '60 days'
);

-- 9. Tech para Runners
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) VALUES (
  (SELECT id FROM partners WHERE name = 'Garmin' LIMIT 1),
  'GAR-RUN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 5)),
  'Tech para Runners',
  '12% OFF en relojes GPS y monitores de ritmo cardíaco',
  'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800&h=400&fit=crop'
);

-- ========================================
-- CUPONES UNDER ARMOUR
-- ========================================

-- 10. Colección Verano
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url,
  expires_at
) VALUES (
  (SELECT id FROM partners WHERE name = 'Under Armour' LIMIT 1),
  'UA-SUMMER-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 4)),
  'Colección Verano',
  '25% OFF en toda la ropa deportiva de verano',
  'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&h=400&fit=crop',
  NOW() + INTERVAL '90 days'
);

-- 11. Training Pro
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) VALUES (
  (SELECT id FROM partners WHERE name = 'Under Armour' LIMIT 1),
  'UA-TRAIN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 5)),
  'Training Pro',
  '20% OFF en ropa de alto rendimiento y accesorios',
  'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=800&h=400&fit=crop'
);

-- ========================================
-- CUPONES DECATHLON
-- ========================================

-- 12. Aventura Outdoor
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) VALUES (
  (SELECT id FROM partners WHERE name = 'Decathlon' LIMIT 1),
  'DEC-OUT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 5)),
  'Aventura Outdoor',
  '20% OFF en camping, senderismo y escalada',
  'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800&h=400&fit=crop'
);

-- 13. Deportes de Montaña
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) VALUES (
  (SELECT id FROM partners WHERE name = 'Decathlon' LIMIT 1),
  'DEC-MOUNT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 4)),
  'Deportes de Montaña',
  '18% OFF en equipamiento para trekking y montañismo',
  'https://images.unsplash.com/photo-1486218119243-13883505764c?w=800&h=400&fit=crop'
);

-- 14. Cupón Estándar Decathlon
INSERT INTO coupons (partner_id, coupon_code) 
VALUES (
  (SELECT id FROM partners WHERE name = 'Decathlon' LIMIT 1),
  'DEC-STD-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 5))
);

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Ver los últimos 14 cupones creados
SELECT 
  p.name as marca,
  c.coupon_code,
  COALESCE(c.title, '→ Estándar') as titulo,
  CASE 
    WHEN c.cover_image_url IS NOT NULL THEN '✓ Propia'
    WHEN p.cover_image_url IS NOT NULL THEN '→ Marca'
    ELSE '✗ Sin'
  END as imagen,
  CASE 
    WHEN c.expires_at IS NOT NULL THEN TO_CHAR(c.expires_at, 'DD/MM/YYYY')
    ELSE 'Sin vencimiento'
  END as expira,
  c.created_at
FROM coupons c
JOIN partners p ON p.id = c.partner_id
ORDER BY c.created_at DESC
LIMIT 14;

-- Resumen por marca
SELECT 
  p.name as marca,
  COUNT(*) as total
FROM coupons c
JOIN partners p ON p.id = c.partner_id
GROUP BY p.name
ORDER BY p.name;
