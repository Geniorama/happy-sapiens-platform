# Configuración de Mercado Pago - Suscripciones

Esta guía te ayudará a configurar Mercado Pago para el sistema de suscripciones mensuales de Happy Sapiens.

## 📋 Requisitos

- Cuenta en Mercado Pago
- Proyecto en Supabase configurado
- Variables de entorno configuradas

## 🚀 Paso 1: Obtener Credenciales de Mercado Pago

### 1.1 Crear/Acceder a tu Cuenta

1. Ve a [Mercado Pago Developers](https://www.mercadopago.com/developers)
2. Inicia sesión o crea una cuenta

### 1.2 Obtener Credenciales de Prueba

Para desarrollo y pruebas:

1. Ve a **"Tus integraciones"** → **"Credenciales"**
2. Selecciona **"Credenciales de prueba"**
3. Copia:
   - **Public Key** (empieza con `TEST-...`)
   - **Access Token** (empieza con `TEST-...`)

### 1.3 Obtener Credenciales de Producción

Para producción (cuando estés listo):

1. En la misma sección, selecciona **"Credenciales de producción"**
2. Copia:
   - **Public Key** (empieza con `APP_USR-...`)
   - **Access Token** (empieza con `APP_USR-...`)

⚠️ **IMPORTANTE**: Nunca compartas tu Access Token. Manténlo en `.env.local`

## 🔧 Paso 2: Configurar Variables de Entorno

Edita tu archivo `.env.local`:

```env
# Mercado Pago - Credenciales de PRUEBA (para desarrollo)
MERCADOPAGO_ACCESS_TOKEN="TEST-1234567890-123456-abcdefghijklmnopqrstuvwxyz-123456789"
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="TEST-abc123def456-789012-ghi345jkl678"

# Configuración de Suscripción
NEXT_PUBLIC_SUBSCRIPTION_PRICE="999.00"  # Precio en tu moneda
NEXT_PUBLIC_CURRENCY="ARS"                # ARS, BRL, MXN, CLP, COP, etc.

# URLs (ya configuradas)
NEXTAUTH_URL="http://localhost:3000"
```

### Monedas Soportadas

- **ARS** - Peso argentino
- **BRL** - Real brasileño
- **MXN** - Peso mexicano
- **CLP** - Peso chileno
- **COP** - Peso colombiano
- **PEN** - Sol peruano
- **UYU** - Peso uruguayo

## 📊 Paso 3: Actualizar Base de Datos

Si ya ejecutaste el `supabase-schema.sql` previamente, ejecuta esta actualización:

```sql
-- Actualizar tabla users con campos de suscripción
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mercadopago_customer_id TEXT;

-- O ejecuta el schema completo nuevamente (recomendado)
-- Copia y pega TODO el contenido de supabase-schema.sql
```

## 🔗 Paso 4: Configurar Webhooks en Mercado Pago

Los webhooks permiten que Mercado Pago notifique a tu app cuando se aprueba un pago.

### 4.1 En Desarrollo (localhost)

Para recibir webhooks en localhost, usa **ngrok** o **localtunnel**:

#### Opción A: ngrok (Recomendado)

```bash
# Instalar ngrok
npm install -g ngrok

# O descarga desde https://ngrok.com/download

# Iniciar túnel
ngrok http 3000
```

Copia la URL que te da (ejemplo: `https://abc123.ngrok.io`)

#### Opción B: localtunnel

```bash
# Instalar
npm install -g localtunnel

# Iniciar túnel
lt --port 3000
```

### 4.2 Configurar Webhook en Mercado Pago

1. Ve a **"Tus integraciones"** → **"Webhooks"** o **"Notificaciones IPN"**
2. Haz clic en **"Configurar notificaciones"**
3. **URL de producción**: 
   - Desarrollo: `https://tu-url-ngrok.ngrok.io/api/mercadopago/webhook`
   - Producción: `https://tu-dominio.com/api/mercadopago/webhook`
4. Selecciona eventos a notificar:
   - ✅ **Pagos** (payments)
   - ✅ **Suscripciones** (subscriptions) si lo necesitas
5. Guarda

⚠️ **Nota**: Con ngrok gratuito, la URL cambia cada vez que lo reinicias.

### 4.3 En Producción

1. Despliega tu aplicación (Vercel, Railway, etc.)
2. Configura el webhook con tu URL real:
   ```
   https://tu-dominio.com/api/mercadopago/webhook
   ```

## 💳 Paso 5: Probar el Sistema

### 5.1 Tarjetas de Prueba

Mercado Pago proporciona tarjetas de prueba para cada país:

#### Argentina (ARS)
- **Visa**: `4509 9535 6623 3704`
- **Mastercard**: `5031 7557 3453 0604`
- CVV: `123`
- Fecha: Cualquier fecha futura
- Nombre: `APRO` (para aprobar) o `OTHE` (para rechazar)

#### Brasil (BRL)
- **Visa**: `4235 6477 2802 5682`
- **Mastercard**: `5031 4332 1540 6351`

#### México (MXN)
- **Visa**: `4075 5957 1648 3764`
- **Mastercard**: `5474 9254 3267 0366`

[Ver todas las tarjetas de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/testing)

### 5.2 Flujo de Prueba

1. Inicia tu aplicación:
   ```bash
   npm run dev
   ```

2. Si usas ngrok, inícialo en otra terminal:
   ```bash
   ngrok http 3000
   ```

3. Visita: `http://localhost:3000/subscribe`

4. Completa el formulario con datos de prueba:
   - Nombre: `Test Usuario`
   - Email: `test@test.com`
   - Contraseña: `test123`

5. Serás redirigido a Mercado Pago

6. Usa una tarjeta de prueba para pagar

7. Deberías ser redirigido a `/payment/success`

8. Inicia sesión con el email y contraseña que usaste

## 🔍 Paso 6: Verificar Funcionamiento

### En Supabase

1. Ve a **Table Editor**
2. Revisa la tabla `users`:
   - Debe aparecer tu usuario
   - `subscription_status` debe ser `"active"`
   - `subscription_end_date` debe ser ~1 mes desde hoy

3. Revisa `payment_transactions`:
   - Debe haber un registro del pago
   - `status` debe ser `"approved"`

### En Mercado Pago Dashboard

1. Ve a **"Actividad"** o **"Transacciones"**
2. Deberías ver el pago de prueba
3. Estado: "Aprobado"

## 🎯 Personalizar Precio y Moneda

Edita `.env.local`:

```env
# Ejemplos:

# Argentina - $999 ARS/mes
NEXT_PUBLIC_SUBSCRIPTION_PRICE="999.00"
NEXT_PUBLIC_CURRENCY="ARS"

# México - $199 MXN/mes
NEXT_PUBLIC_SUBSCRIPTION_PRICE="199.00"
NEXT_PUBLIC_CURRENCY="MXN"

# Brasil - R$29.90/mes
NEXT_PUBLIC_SUBSCRIPTION_PRICE="29.90"
NEXT_PUBLIC_CURRENCY="BRL"
```

## 🚀 Paso 7: Despliegue a Producción

### 7.1 Actualizar Credenciales

Reemplaza las credenciales de prueba por las de producción:

```env
# ❌ Remover credenciales TEST-...
# ✅ Usar credenciales APP_USR-...
MERCADOPAGO_ACCESS_TOKEN="APP_USR-..."
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="APP_USR-..."
```

### 7.2 Configurar en Vercel/Railway/etc.

Agrega todas las variables de entorno en tu plataforma de hosting.

### 7.3 Actualizar Webhook

Configura el webhook con tu URL de producción en Mercado Pago.

### 7.4 Verificar SSL

Asegúrate de que tu sitio use HTTPS (requerido por Mercado Pago).

## 🐛 Solución de Problemas

### "Error al crear preferencia"

✅ Verifica que `MERCADOPAGO_ACCESS_TOKEN` esté en `.env.local`
✅ Reinicia el servidor después de agregar variables
✅ Verifica que las credenciales sean válidas

### "Webhook no llega"

✅ Verifica que ngrok esté corriendo (en desarrollo)
✅ Verifica la URL del webhook en Mercado Pago
✅ Revisa los logs del servidor para ver si llega la petición
✅ Prueba el webhook manualmente con Postman

### "Usuario no se crea después del pago"

✅ Verifica que el webhook esté configurado
✅ Revisa los logs del servidor (`console.log` en webhook)
✅ Verifica que el pago esté "approved" en Mercado Pago
✅ Revisa la tabla `payment_transactions` en Supabase

### "Redirección no funciona"

✅ Verifica que `NEXTAUTH_URL` sea correcto
✅ Las URLs de callback deben coincidir con tu dominio
✅ En desarrollo usa `http://localhost:3000`

## 📚 Recursos Adicionales

- [Documentación de Mercado Pago](https://www.mercadopago.com/developers)
- [Tarjetas de Prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/testing)
- [Webhooks](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks)
- [SDK de Node.js](https://github.com/mercadopago/sdk-nodejs)

## 🎉 ¡Listo!

Tu sistema de suscripciones con Mercado Pago está configurado. Los usuarios ahora deben:

1. Ir a `/subscribe`
2. Completar sus datos
3. Pagar con Mercado Pago
4. Iniciar sesión con sus credenciales
5. ¡Disfrutar de la suscripción!

---

**Próximos pasos recomendados:**
- Implementar renovación automática de suscripciones
- Agregar página de gestión de suscripción
- Enviar emails de confirmación
- Implementar cancelación de suscripción
