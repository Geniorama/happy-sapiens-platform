-- ============================================
-- MIGRACIÓN: Agregar Imágenes de Portada a Aliados
-- ============================================
-- Ejecuta este script en Supabase SQL Editor
-- ============================================

-- Agregar columna cover_image_url
ALTER TABLE partners ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Actualizar marcas existentes con imágenes de portada humanizadas
-- Usamos imágenes de Unsplash con personas usando productos deportivos/wellness

UPDATE partners 
SET cover_image_url = 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&h=400&fit=crop'
WHERE name = 'Nike';

UPDATE partners 
SET cover_image_url = 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&h=400&fit=crop'
WHERE name = 'Under Armour';

UPDATE partners 
SET cover_image_url = 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800&h=400&fit=crop'
WHERE name = 'MyProtein';

UPDATE partners 
SET cover_image_url = 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&h=400&fit=crop'
WHERE name = 'Garmin';

UPDATE partners 
SET cover_image_url = 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=400&fit=crop'
WHERE name = 'Decathlon';

-- Verificar la actualización
SELECT name, cover_image_url
FROM partners
ORDER BY name;
