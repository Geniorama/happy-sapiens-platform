-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "email_verified" TIMESTAMPTZ(6),
    "image" TEXT,
    "password" TEXT,
    "subscription_status" TEXT DEFAULT 'inactive',
    "subscription_id" TEXT,
    "subscription_start_date" TIMESTAMPTZ(6),
    "subscription_end_date" TIMESTAMPTZ(6),
    "mercadopago_customer_id" TEXT,
    "subscription_price" DECIMAL,
    "subscription_product" TEXT,
    "subscription_variant_id" TEXT,
    "subscription_pause_ends_at" TIMESTAMPTZ(6),
    "subscription_tax_exempt" BOOLEAN DEFAULT false,
    "shopify_customer_id" TEXT,
    "subscription_synced_at" TIMESTAMPTZ(6),
    "reset_token" TEXT,
    "reset_token_expires" TIMESTAMPTZ(6),
    "birth_date" DATE,
    "phone" TEXT,
    "gender" TEXT,
    "strava_athlete_id" TEXT,
    "role" VARCHAR(50) DEFAULT 'user',
    "bio" TEXT,
    "specialization" VARCHAR(255),
    "is_coach_active" BOOLEAN DEFAULT false,
    "referral_code" TEXT,
    "referred_by" UUID,
    "billing_document_type" TEXT,
    "billing_document_number" TEXT,
    "billing_phone" TEXT,
    "billing_address" TEXT,
    "billing_city" TEXT,
    "billing_department" TEXT,
    "shipping_full_name" TEXT,
    "shipping_phone" TEXT,
    "shipping_address" TEXT,
    "shipping_city" TEXT,
    "shipping_department" TEXT,
    "shipping_same_as_billing" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" BIGINT,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "mercadopago_payment_id" TEXT,
    "mercadopago_preference_id" TEXT,
    "status" TEXT NOT NULL,
    "amount" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'ARS',
    "payment_method" TEXT,
    "payment_date" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_history" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subscription_id" TEXT,
    "action" TEXT NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT,
    "amount" DECIMAL(10,2),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "cover_image_url" TEXT,
    "website_url" TEXT,
    "category" TEXT,
    "discount_percentage" INTEGER,
    "discount_description" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "terms_and_conditions" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "coupon_code" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "cover_image_url" TEXT,
    "max_per_user" INTEGER,
    "is_assigned" BOOLEAN DEFAULT false,
    "user_id" UUID,
    "assigned_at" TIMESTAMPTZ(6),
    "used_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "discount_percentage" INTEGER,
    "discount_description" TEXT,
    "terms_and_conditions" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_availability" (
    "id" UUID NOT NULL,
    "coach_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "is_available" BOOLEAN DEFAULT true,
    "slot_duration" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "coach_id" UUID NOT NULL,
    "appointment_date" DATE NOT NULL,
    "appointment_time" TIME(6) NOT NULL,
    "duration_minutes" INTEGER DEFAULT 60,
    "status" VARCHAR(50) DEFAULT 'scheduled',
    "notes" TEXT,
    "google_event_id" TEXT,
    "meeting_link" TEXT,
    "consultation_reason" TEXT,
    "consultation_snapshot" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_health_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "weight" DECIMAL(5,2),
    "height" DECIMAL(5,2),
    "age" INTEGER,
    "gender" VARCHAR(50),
    "diseases" TEXT,
    "medications" TEXT,
    "allergies" TEXT,
    "objectives" TEXT,
    "activity_level" VARCHAR(50),
    "current_exercise_routine" TEXT,
    "previous_injuries" TEXT,
    "dietary_restrictions" TEXT,
    "additional_notes" TEXT,
    "consultation_reason" TEXT,
    "occupation" TEXT,
    "supplements" TEXT,
    "surgeries" TEXT,
    "intolerances" TEXT,
    "family_history" TEXT,
    "waist_circumference" DECIMAL(5,2),
    "body_fat_percent" DECIMAL(4,2),
    "exercise_type" TEXT,
    "exercise_frequency" TEXT,
    "sleep_hours" DECIMAL(3,1),
    "stress_level" INTEGER,
    "work_type" TEXT,
    "energy_level" INTEGER,
    "digestion" TEXT,
    "mood" TEXT,
    "concentration" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_health_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_calendar_tokens" (
    "id" UUID NOT NULL,
    "coach_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "calendar_email" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "coach_calendar_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "action_type" TEXT NOT NULL,
    "description" TEXT,
    "reference_type" TEXT,
    "reference_id" UUID,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_points" (
    "user_id" UUID NOT NULL,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_points_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "referral_stats" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "total_referrals" INTEGER DEFAULT 0,
    "active_referrals" INTEGER DEFAULT 0,
    "total_earnings" DECIMAL(10,2) DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "referral_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_checkout" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "product_id" TEXT,
    "referral_code" TEXT,
    "billing" JSONB,
    "shipping" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_checkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_shopify_customer_id_key" ON "users"("shopify_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_subscription_status_idx" ON "users"("subscription_status");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "idx_users_reset_token" ON "users"("reset_token");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- CreateIndex
CREATE INDEX "idx_users_coach_active" ON "users"("is_coach_active");

-- CreateIndex
CREATE INDEX "users_referral_code_idx" ON "users"("referral_code");

-- CreateIndex
CREATE INDEX "users_referred_by_idx" ON "users"("referred_by");

-- CreateIndex
CREATE INDEX "idx_users_shopify_customer_id" ON "users"("shopify_customer_id");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_session_token_idx" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_mercadopago_payment_id_key" ON "payment_transactions"("mercadopago_payment_id");

-- CreateIndex
CREATE INDEX "payment_transactions_user_id_idx" ON "payment_transactions"("user_id");

-- CreateIndex
CREATE INDEX "payment_transactions_mercadopago_payment_id_idx" ON "payment_transactions"("mercadopago_payment_id");

-- CreateIndex
CREATE INDEX "subscription_history_user_id_idx" ON "subscription_history"("user_id");

-- CreateIndex
CREATE INDEX "partners_category_idx" ON "partners"("category");

-- CreateIndex
CREATE INDEX "partners_is_active_idx" ON "partners"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_coupon_code_key" ON "coupons"("coupon_code");

-- CreateIndex
CREATE INDEX "coupons_user_id_idx" ON "coupons"("user_id");

-- CreateIndex
CREATE INDEX "coupons_partner_id_idx" ON "coupons"("partner_id");

-- CreateIndex
CREATE INDEX "coupons_is_assigned_idx" ON "coupons"("is_assigned");

-- CreateIndex
CREATE INDEX "coupons_coupon_code_idx" ON "coupons"("coupon_code");

-- CreateIndex
CREATE INDEX "idx_coach_availability_coach" ON "coach_availability"("coach_id");

-- CreateIndex
CREATE UNIQUE INDEX "coach_availability_coach_id_day_of_week_start_time_key" ON "coach_availability"("coach_id", "day_of_week", "start_time");

-- CreateIndex
CREATE INDEX "idx_appointments_user" ON "appointments"("user_id");

-- CreateIndex
CREATE INDEX "idx_appointments_coach" ON "appointments"("coach_id");

-- CreateIndex
CREATE INDEX "idx_appointments_date" ON "appointments"("appointment_date");

-- CreateIndex
CREATE INDEX "idx_appointments_status" ON "appointments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_health_profiles_user_id_key" ON "user_health_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_health_profiles_user" ON "user_health_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "coach_calendar_tokens_coach_id_provider_key" ON "coach_calendar_tokens"("coach_id", "provider");

-- CreateIndex
CREATE INDEX "point_transactions_user_id_idx" ON "point_transactions"("user_id");

-- CreateIndex
CREATE INDEX "point_transactions_created_at_idx" ON "point_transactions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "point_transactions_action_type_idx" ON "point_transactions"("action_type");

-- CreateIndex
CREATE UNIQUE INDEX "referral_stats_user_id_key" ON "referral_stats"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pending_checkout_email_key" ON "pending_checkout"("email");

-- CreateIndex
CREATE INDEX "pending_checkout_email_idx" ON "pending_checkout"("email");

-- CreateIndex
CREATE INDEX "system_logs_created_at_idx" ON "system_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "system_logs_action_idx" ON "system_logs"("action");

-- CreateIndex
CREATE INDEX "system_logs_actor_id_idx" ON "system_logs"("actor_id");

-- CreateIndex
CREATE INDEX "system_logs_entity_type_idx" ON "system_logs"("entity_type");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_fkey" FOREIGN KEY ("referred_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_availability" ADD CONSTRAINT "coach_availability_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_health_profiles" ADD CONSTRAINT "user_health_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_calendar_tokens" ADD CONSTRAINT "coach_calendar_tokens_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_points" ADD CONSTRAINT "user_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_stats" ADD CONSTRAINT "referral_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
