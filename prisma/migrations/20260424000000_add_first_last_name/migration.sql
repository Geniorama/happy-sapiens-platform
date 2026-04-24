-- AlterTable
ALTER TABLE "users"
    ADD COLUMN "first_name" TEXT,
    ADD COLUMN "last_name" TEXT,
    ADD COLUMN "shipping_first_name" TEXT,
    ADD COLUMN "shipping_last_name" TEXT;

-- AlterTable
ALTER TABLE "pending_checkout"
    ADD COLUMN "first_name" TEXT,
    ADD COLUMN "last_name" TEXT;

-- Backfill: partir name por primer espacio (legacy rows).
-- Si no hay espacio, first_name = name completo y last_name queda NULL.
UPDATE "users"
SET
    "first_name" = CASE
        WHEN position(' ' IN "name") > 0 THEN split_part("name", ' ', 1)
        ELSE "name"
    END,
    "last_name" = CASE
        WHEN position(' ' IN "name") > 0
        THEN NULLIF(trim(substring("name" FROM position(' ' IN "name") + 1)), '')
        ELSE NULL
    END
WHERE "name" IS NOT NULL AND "first_name" IS NULL;

UPDATE "users"
SET
    "shipping_first_name" = CASE
        WHEN position(' ' IN "shipping_full_name") > 0 THEN split_part("shipping_full_name", ' ', 1)
        ELSE "shipping_full_name"
    END,
    "shipping_last_name" = CASE
        WHEN position(' ' IN "shipping_full_name") > 0
        THEN NULLIF(trim(substring("shipping_full_name" FROM position(' ' IN "shipping_full_name") + 1)), '')
        ELSE NULL
    END
WHERE "shipping_full_name" IS NOT NULL AND "shipping_first_name" IS NULL;

UPDATE "pending_checkout"
SET
    "first_name" = CASE
        WHEN position(' ' IN "name") > 0 THEN split_part("name", ' ', 1)
        ELSE "name"
    END,
    "last_name" = CASE
        WHEN position(' ' IN "name") > 0
        THEN NULLIF(trim(substring("name" FROM position(' ' IN "name") + 1)), '')
        ELSE NULL
    END
WHERE "name" IS NOT NULL AND "first_name" IS NULL;
