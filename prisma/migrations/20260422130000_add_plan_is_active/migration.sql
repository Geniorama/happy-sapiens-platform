-- AlterTable
ALTER TABLE "subscription_plan_configs"
    ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
