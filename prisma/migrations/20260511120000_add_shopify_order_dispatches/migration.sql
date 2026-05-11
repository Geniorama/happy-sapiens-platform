-- CreateTable
CREATE TABLE "shopify_order_dispatches" (
    "id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "user_id" UUID,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "shopify_order_id" TEXT,
    "shopify_order_number" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shopify_order_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shopify_order_dispatches_idempotency_key_key" ON "shopify_order_dispatches"("idempotency_key");

-- CreateIndex
CREATE INDEX "shopify_order_dispatches_email_idx" ON "shopify_order_dispatches"("email");
