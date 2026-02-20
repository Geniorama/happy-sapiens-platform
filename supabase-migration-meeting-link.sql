-- Agregar enlace de reunión a las citas
-- Ejecutar en Supabase SQL Editor

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS meeting_link TEXT;

COMMENT ON COLUMN appointments.meeting_link IS 'Enlace de videollamada (Google Meet, Zoho Meetings, etc.)';
