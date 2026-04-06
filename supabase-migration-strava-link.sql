-- Vinculación de usuarios con atleta de Strava para login OAuth sin email.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS strava_athlete_id TEXT;

-- Un atleta de Strava solo puede estar vinculado a una cuenta.
CREATE UNIQUE INDEX IF NOT EXISTS users_strava_athlete_id_unique_idx
  ON users (strava_athlete_id)
  WHERE strava_athlete_id IS NOT NULL;
