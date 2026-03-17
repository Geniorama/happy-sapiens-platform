-- Agrega columna para el link de reunión en citas
-- Ejecutar en Supabase SQL Editor

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS meeting_link TEXT;
