-- Sistema configurable de recordatorios de citas.
-- Reemplaza las columnas fijas reminder_24h_sent_at / reminder_1h_sent_at
-- por un modelo de reglas administrables + tabla de historial de envíos.

-- 1. Tabla de reglas (configurables desde el admin)
CREATE TABLE "appointment_reminder_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(100) NOT NULL,
    "name" TEXT NOT NULL,
    "hours_before" DECIMAL(6,2) NOT NULL,
    "window_minutes" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "send_to_user" BOOLEAN NOT NULL DEFAULT true,
    "send_to_coach" BOOLEAN NOT NULL DEFAULT true,
    "subject_user" TEXT NOT NULL,
    "body_user" TEXT NOT NULL,
    "subject_coach" TEXT NOT NULL,
    "body_coach" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "appointment_reminder_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "appointment_reminder_rules_key_key"
    ON "appointment_reminder_rules" ("key");

CREATE INDEX "idx_appointment_reminder_rules_active"
    ON "appointment_reminder_rules" ("is_active");

-- 2. Tabla de envíos (un row por cada recordatorio enviado a una cita)
CREATE TABLE "appointment_reminder_sent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_reminder_sent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "appointment_reminder_sent_appointment_id_rule_id_key"
    ON "appointment_reminder_sent" ("appointment_id", "rule_id");

CREATE INDEX "idx_appointment_reminder_sent_appt"
    ON "appointment_reminder_sent" ("appointment_id");

CREATE INDEX "idx_appointment_reminder_sent_rule"
    ON "appointment_reminder_sent" ("rule_id");

ALTER TABLE "appointment_reminder_sent"
    ADD CONSTRAINT "appointment_reminder_sent_appointment_id_fkey"
    FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE;

ALTER TABLE "appointment_reminder_sent"
    ADD CONSTRAINT "appointment_reminder_sent_rule_id_fkey"
    FOREIGN KEY ("rule_id") REFERENCES "appointment_reminder_rules"("id") ON DELETE CASCADE;

-- 3. Seed de las 2 reglas por defecto, con UUIDs fijos para poder
-- referenciarlas en el backfill de la siguiente sección.
INSERT INTO "appointment_reminder_rules" (
    "id", "key", "name", "hours_before", "window_minutes",
    "is_active", "send_to_user", "send_to_coach",
    "subject_user", "body_user",
    "subject_coach", "body_coach",
    "created_at", "updated_at"
) VALUES
(
    '00000000-0000-4000-a000-000000000024',
    'reminder-24h',
    'Recordatorio 24 horas antes',
    24,
    60,
    true,
    true,
    true,
    'Recordatorio: tu cita con {coachName} es mañana',
    'Te recordamos que tienes una cita con {coachName} mañana. Aquí los detalles:',
    'Recordatorio: cita con {userName} mañana',
    'Te recordamos que tienes una cita con {userName} mañana:',
    NOW(), NOW()
),
(
    '00000000-0000-4000-a000-000000000001',
    'reminder-1h',
    'Recordatorio 1 hora antes',
    1,
    60,
    true,
    true,
    true,
    'Tu cita con {coachName} empieza en 1 hora',
    'Tu cita con {coachName} empieza en aproximadamente 1 hora. No olvides conectarte a tiempo.',
    'Cita con {userName} en 1 hora',
    'Tu cita con {userName} empieza en 1 hora. Prepárate para atenderla.',
    NOW(), NOW()
);

-- 4. Backfill: por cada cita con recordatorio ya enviado, insertamos
-- el registro correspondiente en appointment_reminder_sent para no
-- re-enviar lo que ya se mandó.
INSERT INTO "appointment_reminder_sent" ("id", "appointment_id", "rule_id", "sent_at")
SELECT
    gen_random_uuid(),
    "id",
    '00000000-0000-4000-a000-000000000024',
    "reminder_24h_sent_at"
FROM "appointments"
WHERE "reminder_24h_sent_at" IS NOT NULL;

INSERT INTO "appointment_reminder_sent" ("id", "appointment_id", "rule_id", "sent_at")
SELECT
    gen_random_uuid(),
    "id",
    '00000000-0000-4000-a000-000000000001',
    "reminder_1h_sent_at"
FROM "appointments"
WHERE "reminder_1h_sent_at" IS NOT NULL;

-- 5. Eliminar índices viejos y columnas viejas de appointments
DROP INDEX IF EXISTS "idx_appointments_reminder_24h_pending";
DROP INDEX IF EXISTS "idx_appointments_reminder_1h_pending";

ALTER TABLE "appointments"
    DROP COLUMN "reminder_24h_sent_at",
    DROP COLUMN "reminder_1h_sent_at";
