-- CreateTable
CREATE TABLE "subscription_plan_configs" (
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "tax_exempt" BOOLEAN NOT NULL DEFAULT false,
    "shopify_variant_id" TEXT,
    "shopify_first_order_variant_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscription_plan_configs_pkey" PRIMARY KEY ("slug")
);

-- Seed valores iniciales (idempotente)
INSERT INTO "subscription_plan_configs" ("slug", "title", "description", "price", "currency", "tax_exempt", "sort_order", "updated_at")
VALUES
    ('happy-blend', 'Happy Blend', 'Suscripción mensual Happy Blend + acceso a la plataforma Happy Sapiens', 159800, 'COP', true, 1, CURRENT_TIMESTAMP),
    ('happy-on', 'Happy On', 'Suscripción mensual Happy On + acceso a la plataforma Happy Sapiens', 102000, 'COP', false, 2, CURRENT_TIMESTAMP),
    ('happy-off', 'Happy Off', 'Suscripción mensual Happy Off + acceso a la plataforma Happy Sapiens', 102000, 'COP', false, 3, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
