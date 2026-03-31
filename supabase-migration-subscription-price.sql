-- Agrega el precio real pagado en la suscripción (obtenido de Mercado Pago)
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_price NUMERIC;
