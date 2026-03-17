-- Agregar duración de bloque a la tabla de disponibilidad del coach
ALTER TABLE coach_availability
  ADD COLUMN IF NOT EXISTS slot_duration INTEGER NOT NULL DEFAULT 60;

COMMENT ON COLUMN coach_availability.slot_duration IS 'Duración en minutos de cada turno dentro del bloque (ej: 30, 60, 90)';
