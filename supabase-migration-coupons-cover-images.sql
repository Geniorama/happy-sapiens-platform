-- ============================================
-- MIGRACIÓN: Agregar Imágenes de Portada a Cupones
-- ============================================
-- Ejecuta este script en Supabase SQL Editor
-- ============================================

-- Agregar columna cover_image_url a cupones
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Agregar columna title para personalizar cada cupón
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS title TEXT;

-- Agregar columna description para describir la promoción específica
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS description TEXT;

-- Verificar las columnas creadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'coupons' 
AND column_name IN ('cover_image_url', 'title', 'description')
ORDER BY column_name;

-- Ejemplo: Actualizar algunos cupones con imágenes y descripciones específicas
-- (Opcional - descomenta para usar)

/*
-- Cupón especial de Nike para running
UPDATE coupons 
SET 
  cover_image_url = 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=400&fit=crop',
  title = 'Especial Running',
  description = 'Descuento exclusivo en calzado para correr'
WHERE partner_id = (SELECT id FROM partners WHERE name = 'Nike')
AND coupon_code LIKE 'NIKE-%'
LIMIT 1;

-- Cupón especial de MyProtein para proteínas
UPDATE coupons 
SET 
  cover_image_url = 'https://images.unsplash.com/photo-1579722821273-0f6c7d6ba513?w=800&h=400&fit=crop',
  title = 'Pack Proteínas',
  description = '25% OFF en proteína whey y accesorios'
WHERE partner_id = (SELECT id FROM partners WHERE name = 'MyProtein')
AND coupon_code LIKE 'MYP-%'
LIMIT 1;

-- Cupón especial de Garmin para watches
UPDATE coupons 
SET 
  cover_image_url = 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&h=400&fit=crop',
  title = 'Smartwatches Premium',
  description = 'Descuento en relojes inteligentes seleccionados'
WHERE partner_id = (SELECT id FROM partners WHERE name = 'Garmin')
AND coupon_code LIKE 'GAR-%'
LIMIT 1;
*/

-- Ver cupones con sus imágenes
SELECT 
  c.coupon_code,
  c.title,
  c.cover_image_url,
  p.name as partner_name,
  p.cover_image_url as partner_cover_image
FROM coupons c
JOIN partners p ON p.id = c.partner_id
WHERE c.is_assigned = true
LIMIT 10;
