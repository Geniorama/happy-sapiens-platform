-- Migración: Portadas de secciones del dashboard
-- Cada sección tiene una imagen de portada gestionada por el admin

CREATE TABLE IF NOT EXISTS section_covers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  title TEXT,
  subtitle TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar las secciones por defecto
INSERT INTO section_covers (section_key, title, subtitle) VALUES
  ('profile', 'Mi Perfil', 'Tu espacio personal en Happy Sapiens'),
  ('subscription', 'Mi Suscripción', 'Gestiona tu plan y beneficios'),
  ('points', 'Mis Puntos', 'Acumula y disfruta tus recompensas'),
  ('partners', 'Aliados', 'Descuentos exclusivos de nuestras marcas aliadas'),
  ('coaches', 'Ritual Coaches', 'Agenda citas con nuestros profesionales especializados')
ON CONFLICT (section_key) DO NOTHING;

-- RLS
ALTER TABLE section_covers ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer portadas activas
CREATE POLICY "section_covers_select" ON section_covers
  FOR SELECT TO authenticated
  USING (true);

-- Solo el service_role (admin vía supabaseAdmin) puede modificar
CREATE POLICY "section_covers_all_service" ON section_covers
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
