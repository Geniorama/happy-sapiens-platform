-- Agrega columna para guardar el ID del evento en Google Calendar
-- Ejecutar en Supabase SQL Editor

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;
