-- CreateTable
CREATE TABLE "section_covers" (
    "id" UUID NOT NULL,
    "section_key" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "image_url" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "section_covers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "section_covers_section_key_key" ON "section_covers"("section_key");
