-- DropForeignKey
ALTER TABLE "appointment_reminder_sent" DROP CONSTRAINT "appointment_reminder_sent_appointment_id_fkey";

-- DropForeignKey
ALTER TABLE "appointment_reminder_sent" DROP CONSTRAINT "appointment_reminder_sent_rule_id_fkey";

-- AlterTable
ALTER TABLE "appointment_reminder_rules" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "appointment_reminder_sent" ALTER COLUMN "id" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "appointment_reminder_sent" ADD CONSTRAINT "appointment_reminder_sent_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_reminder_sent" ADD CONSTRAINT "appointment_reminder_sent_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "appointment_reminder_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
