-- Agrega columna terms_and_conditions a la tabla coupons
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;
