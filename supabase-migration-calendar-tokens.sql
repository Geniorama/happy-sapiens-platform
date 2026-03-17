-- Tabla para guardar tokens OAuth de calendarios externos de los coaches
CREATE TABLE IF NOT EXISTS coach_calendar_tokens (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider    VARCHAR(50) NOT NULL,          -- 'google' | 'outlook'
  access_token  TEXT      NOT NULL,
  refresh_token TEXT,
  expires_at  TIMESTAMPTZ,
  calendar_email VARCHAR(255),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coach_id, provider)
);

ALTER TABLE coach_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Solo el service role (backend) puede leer/escribir
CREATE POLICY "Service role only" ON coach_calendar_tokens
  USING (false);
