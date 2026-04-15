# ⚙️ Configuración de Variables de Entorno

## 🚨 IMPORTANTE: Archivo `.env.local`

Tu aplicación **NECESITA** un archivo `.env.local` en la raíz del proyecto con todas las variables configuradas.

## 📝 Paso a Paso:

### 1. Crear el archivo `.env.local`

En la raíz del proyecto (mismo nivel que `package.json`), crea un archivo llamado `.env.local`

### 2. Copiar y completar estas variables:

```env
# ============================================
# POSTGRES / AWS RDS (REQUERIDO)
# ============================================
# URL de conexión con pooling (PgBouncer / RDS Proxy) — usada por la app en runtime.
# Incluir ?pgbouncer=true&connection_limit=1 si usás PgBouncer en modo transaction.
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"

# URL directa a la DB (sin pooler) — usada por `prisma migrate` y `prisma db push`.
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"

# ============================================
# NEXTAUTH (REQUERIDO)
# ============================================
# URL de tu aplicación
NEXTAUTH_URL="http://localhost:3000"

# Secret para JWT (genera uno ejecutando: openssl rand -base64 32)
NEXTAUTH_SECRET="cAmBiA-e5t0-p0r-Un-s3cR3t-aL34t0r10-muy-largo"

# ============================================
# MERCADO PAGO (REQUERIDO para suscripciones)
# ============================================
# Ve a: https://www.mercadopago.com/developers → Credenciales de prueba
MERCADOPAGO_ACCESS_TOKEN="TEST-1234567890-123456-abcdefghijklmnopqrstuvwxyz-123456789"
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="TEST-abc123def456-789012-ghi345jkl678"

# Configuración del plan
NEXT_PUBLIC_SUBSCRIPTION_PRICE="999.00"
NEXT_PUBLIC_CURRENCY="ARS"

# ============================================
# OAUTH PROVIDERS (OPCIONAL)
# ============================================
# Google
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Facebook
FACEBOOK_CLIENT_ID=""
FACEBOOK_CLIENT_SECRET=""

# Strava
STRAVA_CLIENT_ID=""
STRAVA_CLIENT_SECRET=""
```

### 3. Reiniciar el servidor

Después de crear/modificar `.env.local`, **SIEMPRE** reinicia el servidor:

```bash
# Ctrl+C para detener
# Luego reiniciar:
npm run dev
```

## ✅ Verificación Rápida

Para verificar que las variables están cargadas correctamente, revisa la consola al iniciar el servidor. No deberías ver errores como:

- ❌ `NEXTAUTH_URL no está configurado`
- ❌ `Can't reach database server`
- ❌ `Access token is required`

## 🔍 Variables MÁS Importantes (no pueden faltar):

1. **`NEXTAUTH_URL`** - URL de tu app
   - Desarrollo: `http://localhost:3000`
   - Producción: `https://tu-dominio.com`

2. **`NEXTAUTH_SECRET`** - Secret para JWT
   - Genera con: `openssl rand -base64 32`
   - Debe ser diferente en producción

3. **`DATABASE_URL`** — PostgreSQL en RDS (con pooling)
   - Formato: `postgresql://user:pass@host:5432/db?sslmode=require`

4. **`DIRECT_URL`** — PostgreSQL directo (sin pooler, para migraciones)
   - Mismo formato, apunta a la instancia directa

5. **`MERCADOPAGO_ACCESS_TOKEN`** - Token de MP
   - Prueba: Empieza con `TEST-`
   - Producción: Empieza con `APP_USR-`

## 🐛 Problemas Comunes:

### Error: "NEXTAUTH_URL no está configurado"
✅ Agrega `NEXTAUTH_URL="http://localhost:3000"` a `.env.local`
✅ Reinicia el servidor

### Error: "Can't reach database server"
✅ Verifica que `DATABASE_URL` y `DIRECT_URL` estén configuradas
✅ Revisá el security group de RDS: inbound TCP 5432 desde tu IP
✅ Si la instancia tiene `Publicly accessible = No`, no se conectará desde fuera de la VPC

### Variables no se cargan
✅ El archivo debe llamarse **`.env.local`** (con el punto al inicio)
✅ Debe estar en la raíz del proyecto
✅ **REINICIA** el servidor después de cambios

### Error de Mercado Pago
✅ Usa credenciales de **PRUEBA** primero (empiezan con `TEST-`)
✅ Verifica que hayas copiado las keys completas

## 📍 Ubicación del archivo:

```
happy-sapiens-platform/
├── .env.local          ← AQUÍ (mismo nivel que package.json)
├── package.json
├── src/
└── ...
```

## 🔐 Seguridad:

- ✅ `.env.local` está en `.gitignore` (no se sube a GitHub)
- ❌ **NUNCA** subas `.env.local` a un repositorio público
- ❌ **NUNCA** compartas las keys de producción
- ✅ Usa credenciales de prueba para desarrollo

## 🚀 Para Producción:

Cuando despliegues (Vercel, Railway, etc.), agrega las variables de entorno en el panel de configuración de tu plataforma.

**Cambios importantes:**
- `NEXTAUTH_URL` → Tu dominio real
- `NEXTAUTH_SECRET` → Nuevo secret (diferente al de desarrollo)
- `MERCADOPAGO_ACCESS_TOKEN` → Credenciales de producción (APP_USR-)

---

**¿Todo configurado?** Ejecuta `npm run dev` y prueba ir a `/subscribe` 🎉
