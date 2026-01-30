# 🚀 Inicio Rápido - Happy Sapiens Platform

## Configuración con Supabase (3 pasos simples)

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Crear y Configurar tu Proyecto en Supabase

#### A. Crear el Proyecto
1. Ve a [Supabase](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Haz clic en "New Project"
4. Configura:
   - **Name**: Happy Sapiens
   - **Database Password**: Guarda esta contraseña (la necesitarás)
   - **Region**: Elige el más cercano a ti
5. Espera 2-3 minutos mientras se crea

#### B. Crear las Tablas
1. En tu proyecto, ve a **SQL Editor** (en el menú izquierdo)
2. Haz clic en "New Query"
3. Copia y pega **TODO** el contenido del archivo `supabase-schema.sql`
4. Haz clic en **Run** (o presiona Ctrl+Enter)
5. Deberías ver: "Success. No rows returned"

#### C. Obtener las Credenciales
1. Ve a **Settings** → **API**
2. Copia:
   - **Project URL** (algo como: `https://xxxxx.supabase.co`)
   - **anon public** key (la clave más larga)
   - **service_role** key (¡IMPORTANTE: NO la compartas!)

### 3. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Supabase - Pega tus credenciales aquí
NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key-muy-larga"
SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key-muy-larga"

# NextAuth Secret - Genera uno ejecutando: openssl rand -base64 32
NEXTAUTH_SECRET="cAmBiA-e5t0-p0r-Un-s3cR3t-aL34t0r10-R4nd0m"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers (Opcional - déjalos vacíos por ahora)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
FACEBOOK_CLIENT_ID=""
FACEBOOK_CLIENT_SECRET=""
STRAVA_CLIENT_ID=""
STRAVA_CLIENT_SECRET=""
```

### 4. ¡Listo! Inicia la Aplicación

```bash
npm run dev
```

### 5. Prueba tu Aplicación

Visita estas URLs:
- 🏠 **Inicio**: http://localhost:3000
- 💳 **Suscripción**: http://localhost:3000/subscribe
- 🔐 **Login**: http://localhost:3000/auth/login
- 📊 **Dashboard**: http://localhost:3000/dashboard (requiere login)

## ✅ Lo que Funciona Ahora

- ✅ Sistema de suscripción con pago (Mercado Pago)
- ✅ Creación automática de cuenta después del pago
- ✅ Login con credenciales
- ✅ Rutas protegidas automáticas
- ✅ Dashboard de usuario con información de suscripción
- ✅ Cerrar sesión
- ✅ Base de datos en la nube (Supabase)

**Nota**: El registro solo está disponible mediante suscripción paga. No existe registro gratuito.

## 🔐 Configurar OAuth (Opcional)

Para habilitar los botones de Google, Facebook y Strava:

1. Lee el archivo **CONFIGURACION_AUTH.md**
2. Sigue las instrucciones para cada proveedor
3. Agrega las credenciales a tu `.env.local`

## 🎯 Comandos Útiles

```bash
npm run dev          # Iniciar desarrollo
npm run build        # Compilar para producción
npm run start        # Iniciar producción
npm run lint         # Verificar código
```

## 📊 Ver tus Datos en Supabase

1. Ve a tu proyecto en Supabase
2. Haz clic en **Table Editor**
3. Verás las tablas: `users`, `accounts`, `sessions`, etc.
4. Puedes ver, editar y eliminar datos directamente

## 🐛 Solución de Problemas

### Error: "Invalid Supabase URL"
✅ Verifica que `NEXT_PUBLIC_SUPABASE_URL` en `.env.local` sea correcto
✅ Debe empezar con `https://` y terminar con `.supabase.co`

### Error: "Invalid API key"
✅ Verifica que hayas copiado las claves correctas
✅ No uses las claves de ejemplo, deben ser las de TU proyecto

### "No se puede registrar usuario"
✅ Verifica que hayas ejecutado el SQL en Supabase
✅ Ve a Table Editor y confirma que exista la tabla `users`

### Los OAuth providers no funcionan
✅ Es normal si no has configurado las credenciales
✅ El login con email/password funciona independientemente

## 🔥 Ventajas de usar Supabase

- ✅ **Gratis**: Plan generoso sin tarjeta de crédito
- ✅ **Base de datos PostgreSQL** lista para usar
- ✅ **En la nube**: No necesitas instalar nada localmente
- ✅ **Interfaz visual**: Table Editor para ver tus datos
- ✅ **Escalable**: Crece con tu aplicación
- ✅ **Backups automáticos**: Tus datos están seguros

## 📚 Próximos Pasos

1. **Personaliza**: Edita `src/app/page.tsx` y otras páginas
2. **Explora Supabase**: Ve a Table Editor y revisa tus datos
3. **Configura OAuth**: Si quieres login social (opcional)
4. **Agrega funcionalidades**: Tu aplicación tiene la base perfecta

## 🎉 ¡Listo para Construir!

Tu sistema de autenticación con Supabase está completo y funcionando. 

¿Necesitas más ayuda? Consulta **CONFIGURACION_AUTH.md** para configuración avanzada.
