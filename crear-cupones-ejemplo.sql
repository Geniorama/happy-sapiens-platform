-- ============================================
-- CREAR CUPONES DE EJEMPLO
-- ============================================
-- Script con cupones variados para demostración
-- Ejecuta en Supabase SQL Editor
-- ============================================

-- ========================================
-- CUPONES NIKE
-- ========================================

-- 1. Black Friday Running (Promoción especial)
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url,
  expires_at
) VALUES (
  (SELECT id FROM partners WHERE name = 'Nike' LIMIT 1),
  'NIKE-BF2024',
  'Black Friday Running',
  '30% OFF en toda la colección de running - Solo 48 horas',
  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=400&fit=crop',
  NOW() + INTERVAL '30 days'
);

-- 2. Zapatillas Premium (Línea específica)
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) VALUES (
  (SELECT id FROM partners WHERE name = 'Nike' LIMIT 1),
  'NIKE-PREM001',
  'Zapatillas Premium',
  '20% OFF en Air Max y Jordan - Edición limitada',
  'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&h=400&fit=crop'
);

-- 3. Cupón Estándar Nike (usa imagen de marca)
INSERT INTO coupons (partner_id, coupon_code) 
VALUES (
  (SELECT id FROM partners WHERE name = 'Nike' LIMIT 1),
  'NIKE-STD001'
);

-- ========================================
-- CUPONES MYPROTEIN
-- ========================================

-- 4. Pack Proteínas (Combo)
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) VALUES (
  (SELECT id FROM partners WHERE name = 'MyProtein' LIMIT 1),
  'MYP-PACK01',
  'Pack Proteínas Premium',
  '40% OFF comprando 2 o más productos de proteína whey',
  'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800&h=400&fit=crop'
);

-- 5. Nutrición Deportiva (Categoría amplia)
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) VALUES (
  (SELECT id FROM partners WHERE name = 'MyProtein' LIMIT 1),
  'MYP-NUT001',
  'Nutrición Deportiva Completa',
  '30% OFF en vitaminas, proteínas y suplementos',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop'
);

-- ========================================
-- CUPONES GARMIN
-- ========================================

-- 6. Smartwatches Premium (Producto específico)
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url,
  expires_at
) VALUES (
  (SELECT id FROM partners WHERE name = 'Garmin' LIMIT 1),
  'GAR-WATCH01',
  'Relojes Inteligentes',
  '15% OFF en Forerunner y Fenix - Hasta agotar stock',
  'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&h=400&fit=crop',
  NOW() + INTERVAL '60 days'
);

-- 7. Runner Tech (Para corredores)
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) VALUES (
  (SELECT id FROM partners WHERE name = 'Garmin' LIMIT 1),
  'GAR-RUN001',
  'Tech para Runners',
  '12% OFF en relojes GPS y monitores de ritmo cardíaco',
  'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800&h=400&fit=crop'
);

-- ========================================
-- CUPONES UNDER ARMOUR
-- ========================================

-- 8. Colección Verano (Temporada)
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url,
  expires_at
) VALUES (
  (SELECT id FROM partners WHERE name = 'Under Armour' LIMIT 1),
  'UA-SUMMER01',
  'Colección Verano',
  '25% OFF en toda la ropa deportiva de verano',
  'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&h=400&fit=crop',
  NOW() + INTERVAL '90 days'
);

-- 9. Training Pro (Alto rendimiento)
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) VALUES (
  (SELECT id FROM partners WHERE name = 'Under Armour' LIMIT 1),
  'UA-TRAIN01',
  'Training Pro',
  '20% OFF en ropa de alto rendimiento y accesorios',
  'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=800&h=400&fit=crop'
);

-- ========================================
-- CUPONES DECATHLON
-- ========================================

-- 10. Aventura Outdoor (Actividades al aire libre)
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) VALUES (
  (SELECT id FROM partners WHERE name = 'Decathlon' LIMIT 1),
  'DEC-OUT001',
  'Aventura Outdoor',
  '20% OFF en camping, senderismo y escalada',
  'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800&h=400&fit=crop'
);

-- 11. Deportes de Montaña (Específico)
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) VALUES (
  (SELECT id FROM partners WHERE name = 'Decathlon' LIMIT 1),
  'DEC-MOUNT01',
  'Deportes de Montaña',
  '18% OFF en equipamiento para trekking y montañismo',
  'https://images.unsplash.com/photo-1486218119243-13883505764c?w=800&h=400&fit=crop'
);

-- 12. Cupón Estándar Decathlon (usa imagen de marca)
INSERT INTO coupons (partner_id, coupon_code) 
VALUES (
  (SELECT id FROM partners WHERE name = 'Decathlon' LIMIT 1),
  'DEC-STD001'
);

-- ========================================
-- CUPONES VIP EXCLUSIVOS
-- ========================================

-- 13. VIP Nike (Exclusivo premium)
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url,
  expires_at
) VALUES (
  (SELECT id FROM partners WHERE name = 'Nike' LIMIT 1),
  'NIKE-VIP001',
  'Acceso VIP Exclusivo',
  '50% OFF - Solo para miembros premium Happy Sapiens',
  'https://images.unsplash.com/photo-1515238152791-8216bfdf89a7?w=800&h=400&fit=crop',
  NOW() + INTERVAL '15 days'
);

-- 14. VIP MyProtein (Primera compra)
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url,
  expires_at
) VALUES (
  (SELECT id FROM partners WHERE name = 'MyProtein' LIMIT 1),
  'MYP-VIP001',
  'Bienvenida Premium',
  '35% OFF en tu primera compra - Código VIP',
  'https://images.unsplash.com/photo-1532384816664-01b8b7238c8d?w=800&h=400&fit=crop',
  NOW() + INTERVAL '20 days'
);

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Ver todos los cupones creados
SELECT 
  p.name as marca,
  c.coupon_code,
  COALESCE(c.title, '→ Estándar (usa datos de marca)') as titulo,
  c.description,
  CASE 
    WHEN c.cover_image_url IS NOT NULL THEN '✓ Imagen propia'
    WHEN c.cover_image_url IS NULL AND p.cover_image_url IS NOT NULL THEN '→ Imagen de marca'
    ELSE '✗ Sin imagen'
  END as imagen,
  CASE 
    WHEN c.expires_at IS NOT NULL THEN TO_CHAR(c.expires_at, 'DD/MM/YYYY')
    ELSE 'Sin vencimiento'
  END as expira,
  c.is_assigned as asignado
FROM coupons c
JOIN partners p ON p.id = c.partner_id
WHERE c.coupon_code IN (
  'NIKE-BF2024', 'NIKE-PREM001', 'NIKE-STD001', 'NIKE-VIP001',
  'MYP-PACK01', 'MYP-NUT001', 'MYP-VIP001',
  'GAR-WATCH01', 'GAR-RUN001',
  'UA-SUMMER01', 'UA-TRAIN01',
  'DEC-OUT001', 'DEC-MOUNT01', 'DEC-STD001'
)
ORDER BY p.name, c.coupon_code;

-- Ver resumen por marca
SELECT 
  p.name as marca,
  COUNT(*) as total_cupones,
  COUNT(*) FILTER (WHERE c.title IS NOT NULL) as personalizados,
  COUNT(*) FILTER (WHERE c.title IS NULL) as estandar,
  COUNT(*) FILTER (WHERE c.expires_at IS NOT NULL) as con_vencimiento
FROM coupons c
JOIN partners p ON p.id = c.partner_id
WHERE c.coupon_code IN (
  'NIKE-BF2024', 'NIKE-PREM001', 'NIKE-STD001', 'NIKE-VIP001',
  'MYP-PACK01', 'MYP-NUT001', 'MYP-VIP001',
  'GAR-WATCH01', 'GAR-RUN001',
  'UA-SUMMER01', 'UA-TRAIN01',
  'DEC-OUT001', 'DEC-MOUNT01', 'DEC-STD001'
)
GROUP BY p.name
ORDER BY p.name;
