-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "mp_preapproval_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "product" TEXT,
    "price" DECIMAL,
    "variant_id" TEXT,
    "tax_exempt" BOOLEAN NOT NULL DEFAULT false,
    "start_date" TIMESTAMPTZ(6),
    "end_date" TIMESTAMPTZ(6),
    "pause_ends_at" TIMESTAMPTZ(6),
    "synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_mp_preapproval_id_key" ON "subscriptions"("mp_preapproval_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_product_idx" ON "subscriptions"("product");

-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN "subscription_row_id" UUID;

-- AlterTable
ALTER TABLE "subscription_history" ADD COLUMN "subscription_row_id" UUID;

-- AlterTable
ALTER TABLE "shopify_order_dispatches" ADD COLUMN "subscription_row_id" UUID;

-- CreateIndex
CREATE INDEX "payment_transactions_subscription_row_id_idx" ON "payment_transactions"("subscription_row_id");

-- CreateIndex
CREATE INDEX "subscription_history_subscription_row_id_idx" ON "subscription_history"("subscription_row_id");

-- CreateIndex
CREATE INDEX "shopify_order_dispatches_subscription_row_id_idx" ON "shopify_order_dispatches"("subscription_row_id");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_subscription_row_id_fkey" FOREIGN KEY ("subscription_row_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_subscription_row_id_fkey" FOREIGN KEY ("subscription_row_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopify_order_dispatches" ADD CONSTRAINT "shopify_order_dispatches_subscription_row_id_fkey" FOREIGN KEY ("subscription_row_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: migrar la suscripción actual (columnas planas en users) a una fila
-- por usuario en subscriptions, y enlazar pagos/historial/despachos existentes.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "subscriptions" (
  "id", "user_id", "mp_preapproval_id", "status", "product", "price",
  "variant_id", "tax_exempt", "start_date", "end_date", "pause_ends_at",
  "synced_at", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  u."id",
  u."subscription_id",
  COALESCE(u."subscription_status", 'inactive'),
  u."subscription_product",
  u."subscription_price",
  u."subscription_variant_id",
  COALESCE(u."subscription_tax_exempt", false),
  u."subscription_start_date",
  u."subscription_end_date",
  u."subscription_pause_ends_at",
  u."subscription_synced_at",
  now(),
  now()
FROM "users" u
WHERE u."subscription_id" IS NOT NULL
   OR (u."subscription_status" IS NOT NULL AND u."subscription_status" <> 'inactive');

-- Enlazar filas históricas a la suscripción migrada (hoy hay 1 por usuario).
UPDATE "payment_transactions" pt
SET "subscription_row_id" = s."id"
FROM "subscriptions" s
WHERE s."user_id" = pt."user_id" AND pt."subscription_row_id" IS NULL;

UPDATE "subscription_history" sh
SET "subscription_row_id" = s."id"
FROM "subscriptions" s
WHERE s."user_id" = sh."user_id" AND sh."subscription_row_id" IS NULL;

UPDATE "shopify_order_dispatches" d
SET "subscription_row_id" = s."id"
FROM "subscriptions" s
WHERE s."user_id" = d."user_id" AND d."subscription_row_id" IS NULL;
