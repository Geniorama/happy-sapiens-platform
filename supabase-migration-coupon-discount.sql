-- ============================================
-- MIGRACIÓN: Descuento por cupón
-- ============================================
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS discount_percentage  INTEGER,
  ADD COLUMN IF NOT EXISTS discount_description TEXT;
