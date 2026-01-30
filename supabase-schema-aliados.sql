-- ============================================
-- Schema de Aliados y Cupones
-- ============================================
-- Ejecuta este script en Supabase SQL Editor
-- ============================================

-- Tabla de Marcas Aliadas
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  category TEXT, -- deportes, nutricion, tecnologia, etc
  discount_percentage INTEGER, -- porcentaje de descuento que ofrece
  discount_description TEXT, -- descripción del beneficio
  is_active BOOLEAN DEFAULT true,
  terms_and_conditions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Cupones (pool de cupones disponibles)
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  coupon_code TEXT NOT NULL UNIQUE,
  is_assigned BOOLEAN DEFAULT false,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS partners_category_idx ON partners(category);
CREATE INDEX IF NOT EXISTS partners_is_active_idx ON partners(is_active);
CREATE INDEX IF NOT EXISTS coupons_user_id_idx ON coupons(user_id);
CREATE INDEX IF NOT EXISTS coupons_partner_id_idx ON coupons(partner_id);
CREATE INDEX IF NOT EXISTS coupons_is_assigned_idx ON coupons(is_assigned);
CREATE INDEX IF NOT EXISTS coupons_coupon_code_idx ON coupons(coupon_code);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_partners_updated_at ON partners;
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Todos pueden ver marcas activas" ON partners;
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios cupones asignados" ON coupons;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios cupones" ON coupons;

-- Políticas RLS para partners (todos pueden ver marcas activas)
CREATE POLICY "Todos pueden ver marcas activas"
  ON partners FOR SELECT
  USING (is_active = true);

-- Políticas RLS para coupons
CREATE POLICY "Usuarios pueden ver sus propios cupones asignados"
  ON coupons FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Usuarios pueden actualizar sus propios cupones"
  ON coupons FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- Insertar marcas aliadas de ejemplo
INSERT INTO partners (name, description, logo_url, website_url, category, discount_percentage, discount_description, terms_and_conditions) VALUES
  (
    'Nike',
    'Marca líder en ropa y calzado deportivo',
    NULL,
    'https://www.nike.com',
    'deportes',
    15,
    '15% de descuento en toda la tienda online',
    'Válido solo para compras online. No acumulable con otras promociones.'
  ),
  (
    'Under Armour',
    'Ropa deportiva de alto rendimiento',
    NULL,
    'https://www.underarmour.com',
    'deportes',
    20,
    '20% de descuento en ropa deportiva',
    'Válido en tiendas físicas y online. Válido por 30 días desde su generación.'
  ),
  (
    'MyProtein',
    'Suplementos deportivos y nutrición',
    NULL,
    'https://www.myprotein.com',
    'nutricion',
    25,
    '25% de descuento en suplementos',
    'Válido solo para primera compra. Compra mínima $5000.'
  ),
  (
    'Garmin',
    'Relojes y dispositivos deportivos',
    NULL,
    'https://www.garmin.com',
    'tecnologia',
    10,
    '10% de descuento en relojes deportivos',
    'Válido para modelos seleccionados. Consultar en tienda.'
  ),
  (
    'Decathlon',
    'Todo para el deporte y actividades al aire libre',
    NULL,
    'https://www.decathlon.com',
    'deportes',
    15,
    '15% de descuento en tu compra',
    'Válido en tienda online y física. No aplica en productos en oferta.'
  );

-- Insertar cupones de ejemplo para Nike (10 cupones disponibles)
INSERT INTO coupons (partner_id, coupon_code) 
SELECT 
  p.id,
  'NIKE-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
FROM partners p
CROSS JOIN generate_series(1, 10)
WHERE p.name = 'Nike';

-- Insertar cupones de ejemplo para Under Armour (10 cupones)
INSERT INTO coupons (partner_id, coupon_code) 
SELECT 
  p.id,
  'UA-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
FROM partners p
CROSS JOIN generate_series(1, 10)
WHERE p.name = 'Under Armour';

-- Insertar cupones de ejemplo para MyProtein (10 cupones)
INSERT INTO coupons (partner_id, coupon_code) 
SELECT 
  p.id,
  'MYP-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
FROM partners p
CROSS JOIN generate_series(1, 10)
WHERE p.name = 'MyProtein';

-- Insertar cupones de ejemplo para Garmin (10 cupones)
INSERT INTO coupons (partner_id, coupon_code) 
SELECT 
  p.id,
  'GAR-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
FROM partners p
CROSS JOIN generate_series(1, 10)
WHERE p.name = 'Garmin';

-- Insertar cupones de ejemplo para Decathlon (10 cupones)
INSERT INTO coupons (partner_id, coupon_code) 
SELECT 
  p.id,
  'DEC-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
FROM partners p
CROSS JOIN generate_series(1, 10)
WHERE p.name = 'Decathlon';

-- Verificar las tablas y cupones creados
SELECT 
  p.name as marca,
  COUNT(c.id) as total_cupones,
  COUNT(c.id) FILTER (WHERE c.is_assigned = false) as disponibles,
  COUNT(c.id) FILTER (WHERE c.is_assigned = true) as asignados
FROM partners p
LEFT JOIN coupons c ON c.partner_id = p.id
GROUP BY p.name
ORDER BY p.name;
