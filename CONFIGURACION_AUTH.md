# Configuración de Autenticación - Happy Sapiens Platform

Este documento te guiará a través de la configuración completa del sistema de autenticación con NextAuth y Supabase.

## 📋 Prerequisitos

- Node.js instalado
- Cuenta en Supabase (gratis)
- Cuentas de desarrollador en Google, Facebook y Strava (opcional)

## 🚀 Configuración de Supabase

### Paso 1: Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Haz clic en **"New Project"**
4. Completa:
   - **Organization**: Selecciona o crea una
   - **Project Name**: `happy-sapiens`
   - **Database Password**: Crea una contraseña segura (guárdala)
   - **Region**: Selecciona el más cercano a tu ubicación
5. Haz clic en **"Create new project"**
6. Espera 2-3 minutos mientras se aprovisiona

### Paso 2: Crear las Tablas de Base de Datos

1. En el panel lateral, haz clic en **SQL Editor**
2. Haz clic en **"New Query"**
3. Abre el archivo `supabase-schema.sql` de este proyecto
4. Copia **TODO** el contenido
5. Pégalo en el editor SQL de Supabase
6. Haz clic en **"Run"** o presiona `Ctrl/Cmd + Enter`
7. Deberías ver: **"Success. No rows returned"**

Las siguientes tablas se crearán:
- `users` - Usuarios de la aplicación
- `accounts` - Cuentas OAuth vinculadas
- `sessions` - Sesiones activas
- `verification_tokens` - Tokens de verificación

### Paso 3: Obtener Credenciales de API

1. Ve a **Settings** (⚙️) → **API**
2. Encontrarás:

#### Project URL
```
https://xxxxxxxxx.supabase.co
```
Cópialo como `NEXT_PUBLIC_SUPABASE_URL`

#### API Keys

**anon / public** (clave pública - segura para el cliente):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Cópiala como `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**service_role** (clave privada - ⚠️ NUNCA expongas en el cliente):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Cópiala como `SUPABASE_SERVICE_ROLE_KEY`

### Paso 4: Configurar Variables de Entorno

Crea `.env.local` en la raíz del proyecto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto-real.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-clave-anon-real-muy-larga"
SUPABASE_SERVICE_ROLE_KEY="tu-clave-service-role-real-muy-larga"

# NextAuth
NEXTAUTH_SECRET="genera-un-secret-seguro"
NEXTAUTH_URL="http://localhost:3000"
```

#### Generar NEXTAUTH_SECRET

```bash
# En Linux/macOS/Windows (Git Bash):
openssl rand -base64 32

# O visita:
https://generate-secret.vercel.app/32
```

## 🔐 Configurar OAuth Providers (Opcional)

### 🔵 Google OAuth

#### 1. Crear Proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto nuevo:
   - Haz clic en el selector de proyectos
   - **"New Project"**
   - Nombre: `Happy Sapiens Auth`
3. Espera a que se cree

#### 2. Configurar Pantalla de Consentimiento

1. En el menú, ve a **APIs & Services** → **OAuth consent screen**
2. Selecciona **External**
3. Completa:
   - **App name**: Happy Sapiens
   - **User support email**: tu email
   - **Developer contact**: tu email
4. Haz clic en **Save and Continue**
5. **Scopes**: Haz clic en **Save and Continue** (no agregues nada)
6. **Test users**: Agrega tu email de prueba
7. Haz clic en **Save and Continue**

#### 3. Crear Credenciales OAuth

1. Ve a **Credentials** → **Create Credentials** → **OAuth client ID**
2. Tipo: **Web application**
3. Nombre: `Happy Sapiens Web`
4. **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   https://tu-dominio.com
   ```
5. **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/google
   https://tu-dominio.com/api/auth/callback/google
   ```
6. Haz clic en **Create**
7. Copia el **Client ID** y **Client Secret**

#### 4. Agregar a .env.local

```env
GOOGLE_CLIENT_ID="123456789-abcdefgh.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-tu-secret-aqui"
```

### 🔵 Facebook OAuth

#### 1. Crear Aplicación

1. Ve a [Facebook Developers](https://developers.facebook.com/)
2. Haz clic en **My Apps** → **Create App**
3. Tipo: **Consumer**
4. Nombre: `Happy Sapiens`
5. Contacto: Tu email

#### 2. Agregar Facebook Login

1. En el dashboard, busca **Facebook Login**
2. Haz clic en **Set Up**
3. Selecciona **Web**
4. URL del sitio: `http://localhost:3000`

#### 3. Configurar URLs de Redirección

1. Ve a **Facebook Login** → **Settings**
2. **Valid OAuth Redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/facebook
   https://tu-dominio.com/api/auth/callback/facebook
   ```
3. Guarda los cambios

#### 4. Obtener Credenciales

1. Ve a **Settings** → **Basic**
2. Copia:
   - **App ID**
   - **App Secret** (haz clic en "Show")

#### 5. Agregar a .env.local

```env
FACEBOOK_CLIENT_ID="1234567890123456"
FACEBOOK_CLIENT_SECRET="abcdef1234567890abcdef1234567890"
```

### 🟠 Strava OAuth

#### 1. Crear Aplicación

1. Ve a [Strava API Settings](https://www.strava.com/settings/api)
2. Completa:
   - **Application Name**: Happy Sapiens
   - **Category**: Social Network
   - **Website**: `http://localhost:3000`
   - **Authorization Callback Domain**: `localhost` (sin http://)

#### 2. Para Producción

Agrega también tu dominio:
- **Authorization Callback Domain**: `tu-dominio.com`

#### 3. Obtener Credenciales

Después de crear, verás:
- **Client ID**: Número de 5-6 dígitos
- **Client Secret**: Cadena alfanumérica

#### 4. Agregar a .env.local

```env
STRAVA_CLIENT_ID="12345"
STRAVA_CLIENT_SECRET="abc123def456ghi789jkl012mno345pqr678stu"
```

## 🏗️ Estructura del Proyecto

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── [...nextauth]/route.ts    # NextAuth handlers
│   │       └── register/route.ts          # Registro de usuarios
│   ├── auth/
│   │   ├── login/page.tsx                # Página de login
│   │   └── register/page.tsx             # Página de registro
│   └── dashboard/page.tsx                 # Dashboard protegido
├── components/
│   ├── auth/
│   │   ├── login-form.tsx                # Formulario de login
│   │   └── register-form.tsx             # Formulario de registro
│   └── providers/
│       └── session-provider.tsx          # Provider de sesión
├── lib/
│   ├── auth.ts                           # Configuración NextAuth
│   └── supabase.ts                       # Cliente Supabase
└── middleware.ts                          # Protección de rutas

supabase-schema.sql                        # Schema SQL para Supabase
```

## 🔧 Uso en el Código

### Proteger una Ruta (Server Component)

```typescript
// src/app/mi-ruta-protegida/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function PaginaProtegida() {
  const session = await auth()
  
  if (!session) {
    redirect("/auth/login")
  }
  
  return (
    <div>
      <h1>Hola, {session.user?.name}</h1>
    </div>
  )
}
```

### Obtener Sesión (Client Component)

```typescript
"use client"
import { useSession } from "next-auth/react"

export function MiComponente() {
  const { data: session, status } = useSession()
  
  if (status === "loading") return <p>Cargando...</p>
  if (!session) return <p>No autenticado</p>
  
  return <p>Hola, {session.user?.name}</p>
}
```

### Cerrar Sesión

```typescript
// Client Component
import { signOut } from "next-auth/react"

<button onClick={() => signOut()}>Cerrar Sesión</button>

// Server Action
import { signOut } from "@/lib/auth"

<form action={async () => {
  "use server"
  await signOut()
}}>
  <button type="submit">Cerrar Sesión</button>
</form>
```

### Consultas a Supabase

```typescript
import { supabaseAdmin } from "@/lib/supabase"

// Obtener usuario
const { data: user } = await supabaseAdmin
  .from('users')
  .select('*')
  .eq('email', 'usuario@ejemplo.com')
  .single()

// Crear usuario
const { data, error } = await supabaseAdmin
  .from('users')
  .insert({
    name: 'Juan Pérez',
    email: 'juan@ejemplo.com'
  })
  .select()
  .single()
```

## 🐛 Solución de Problemas

### "Invalid Supabase URL"
- Verifica que la URL esté en `.env.local`
- Debe incluir `https://` y terminar en `.supabase.co`
- Reinicia el servidor después de cambiar `.env.local`

### "Invalid API key"
- Asegúrate de usar las claves de TU proyecto
- La clave `anon` va en `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- La clave `service_role` va en `SUPABASE_SERVICE_ROLE_KEY`

### "relation 'users' does not exist"
- Ejecuta el archivo `supabase-schema.sql` en Supabase
- Ve a SQL Editor → New Query → Pega el SQL → Run

### OAuth no funciona
- Verifica que las URLs de callback sean exactamente correctas
- Para localhost, algunos providers requieren configuración especial
- Revisa la consola del navegador para errores

### "NEXTAUTH_URL is not defined"
- Crea `.env.local` si no existe
- Agrega `NEXTAUTH_URL="http://localhost:3000"`
- Reinicia el servidor de desarrollo

## 📊 Ver tus Datos

### Supabase Table Editor

1. Ve a tu proyecto en Supabase
2. Haz clic en **Table Editor**
3. Selecciona la tabla (users, accounts, sessions)
4. Puedes:
   - Ver todos los registros
   - Editar datos
   - Eliminar registros
   - Agregar nuevos registros

### Consultas SQL Personalizadas

1. Ve a **SQL Editor**
2. Escribe tu consulta, por ejemplo:

```sql
-- Ver todos los usuarios
SELECT id, name, email, created_at FROM users;

-- Contar usuarios por proveedor
SELECT 
  COALESCE(a.provider, 'credentials') as provider,
  COUNT(*) as count
FROM users u
LEFT JOIN accounts a ON u.id = a.user_id
GROUP BY provider;

-- Ver sesiones activas
SELECT s.*, u.name, u.email
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.expires > NOW();
```

## 🚀 Despliegue a Producción

### Variables de Entorno en Vercel/Netlify

Agrega todas las variables de `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (cambiar a tu dominio)
- Credenciales OAuth (si las usas)

### Actualizar URLs de OAuth

No olvides agregar tus URLs de producción en:
- Google Cloud Console
- Facebook Developers
- Strava API Settings

## 📚 Recursos Adicionales

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)

## 🎉 ¡Todo Configurado!

Tu sistema de autenticación está completo con:
- ✅ Base de datos en Supabase
- ✅ Autenticación con email/contraseña
- ✅ OAuth con Google, Facebook y Strava
- ✅ Rutas protegidas
- ✅ Sesiones seguras
- ✅ Interfaz moderna y responsive

¡Feliz desarrollo! 🚀
