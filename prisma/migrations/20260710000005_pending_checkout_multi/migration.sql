-- Permitir múltiples checkouts pendientes por email (un usuario puede iniciar la
-- suscripción a varios productos). Se quita el UNIQUE sobre email; el índice
-- normal pending_checkout_email_idx ya existe para las búsquedas.
DROP INDEX IF EXISTS "pending_checkout_email_key";
