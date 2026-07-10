-- CreateTable
CREATE TABLE "affiliate_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "reward_percent" DECIMAL(5,2) NOT NULL DEFAULT 15,
    "updated_by_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_config_pkey" PRIMARY KEY ("id")
);
