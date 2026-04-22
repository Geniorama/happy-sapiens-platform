-- AlterTable
ALTER TABLE "appointments"
    ADD COLUMN "reminder_24h_sent_at" TIMESTAMPTZ(6),
    ADD COLUMN "reminder_1h_sent_at" TIMESTAMPTZ(6);

-- Index para que el cron busque citas con reminders pendientes rápido
CREATE INDEX "idx_appointments_reminder_24h_pending"
    ON "appointments" ("appointment_date")
    WHERE "status" = 'scheduled' AND "reminder_24h_sent_at" IS NULL;

CREATE INDEX "idx_appointments_reminder_1h_pending"
    ON "appointments" ("appointment_date")
    WHERE "status" = 'scheduled' AND "reminder_1h_sent_at" IS NULL;
