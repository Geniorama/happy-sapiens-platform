-- Trigger para validar que coach_id sea un usuario con role='coach'
-- Ejecutar después de la migración principal

-- Función para validar que el coach_id sea un coach
CREATE OR REPLACE FUNCTION validate_coach_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = NEW.coach_id 
    AND users.role = 'coach'
  ) THEN
    RAISE EXCEPTION 'El coach_id debe ser un usuario con role=coach';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar al insertar
CREATE TRIGGER validate_coach_on_insert
  BEFORE INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION validate_coach_role();

-- Trigger para validar al actualizar
CREATE TRIGGER validate_coach_on_update
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  WHEN (OLD.coach_id IS DISTINCT FROM NEW.coach_id)
  EXECUTE FUNCTION validate_coach_role();
