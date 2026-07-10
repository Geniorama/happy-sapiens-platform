-- CreateTable
CREATE TABLE "affiliate_rewards" (
    "id" UUID NOT NULL,
    "affiliate_id" UUID NOT NULL,
    "referred_user_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "plan_price" DECIMAL(12,2),
    "reward_percent" DECIMAL(5,2),
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_rewards_referred_user_id_key" ON "affiliate_rewards"("referred_user_id");

-- CreateIndex
CREATE INDEX "affiliate_rewards_affiliate_id_idx" ON "affiliate_rewards"("affiliate_id");

-- CreateIndex
CREATE INDEX "affiliate_rewards_created_at_idx" ON "affiliate_rewards"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "affiliate_rewards" ADD CONSTRAINT "affiliate_rewards_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_rewards" ADD CONSTRAINT "affiliate_rewards_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
