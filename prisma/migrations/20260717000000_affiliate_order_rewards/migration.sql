-- Comisión de afiliado por compras en la tienda de Shopify (una por pedido).

-- AlterTable: porcentaje separado y configurable para compras de tienda.
ALTER TABLE "affiliate_config"
  ADD COLUMN "shopify_reward_percent" DECIMAL(5,2) NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "affiliate_order_rewards" (
    "id" UUID NOT NULL,
    "affiliate_id" UUID NOT NULL,
    "shopify_order_id" TEXT NOT NULL,
    "shopify_order_number" INTEGER,
    "customer_email" TEXT,
    "code" TEXT,
    "order_amount" DECIMAL(12,2),
    "amount" DECIMAL(12,2) NOT NULL,
    "reward_percent" DECIMAL(5,2),
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "status" TEXT NOT NULL DEFAULT 'granted',
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "affiliate_order_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_order_rewards_shopify_order_id_key" ON "affiliate_order_rewards"("shopify_order_id");

-- CreateIndex
CREATE INDEX "affiliate_order_rewards_affiliate_id_idx" ON "affiliate_order_rewards"("affiliate_id");

-- CreateIndex
CREATE INDEX "affiliate_order_rewards_status_idx" ON "affiliate_order_rewards"("status");

-- CreateIndex
CREATE INDEX "affiliate_order_rewards_created_at_idx" ON "affiliate_order_rewards"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "affiliate_order_rewards" ADD CONSTRAINT "affiliate_order_rewards_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
