-- ============================================
-- ACTUALIZAR: Logos de Marcas Aliadas
-- ============================================
-- Agregar logos a las marcas existentes
-- ============================================

-- El campo logo_url ya existe en la tabla partners
-- Solo necesitamos agregar los logos a las marcas

-- Actualizar logos (usando logos de marca conocidas)
UPDATE partners 
SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg'
WHERE name = 'Nike';

UPDATE partners 
SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/3/34/Under_Armour_logo.svg'
WHERE name = 'Under Armour';

UPDATE partners 
SET logo_url = 'https://asset.brandfetch.io/idD9uN9gxF/idK5azLTBX.svg'
WHERE name = 'MyProtein';

UPDATE partners 
SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/5/5d/Garmin_logo.svg'
WHERE name = 'Garmin';

UPDATE partners 
SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Decathlon_Logo.svg'
WHERE name = 'Decathlon';

-- Verificar los logos
SELECT name, logo_url, category 
FROM partners 
ORDER BY name;
