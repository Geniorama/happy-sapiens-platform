# 📋 Resumen del Proyecto - Happy Sapiens Platform

## 🎯 Descripción

Plataforma web con sistema de autenticación y suscripción mensual mediante Mercado Pago.

## 🚀 Stack Tecnológico

- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS 4
- **Autenticación**: NextAuth v5
- **Base de Datos**: Supabase (PostgreSQL)
- **Pagos**: Mercado Pago
- **Fuentes**: Anton (encabezados) + Quicksand (cuerpo)

## 🔐 Sistema de Autenticación

### Providers Disponibles:
- ✅ **Credenciales** (Email/Password) - Requiere suscripción paga
- ✅ **Google OAuth** (Opcional)
- ✅ **Facebook OAuth** (Opcional)
- ✅ **Strava OAuth** (Opcional)

### Flujo de Autenticación:
1. Usuario NO puede registrarse gratis
2. Debe ir a `/subscribe` y pagar la suscripción
3. Después del pago, se crea automáticamente su cuenta
4. Puede iniciar sesión en `/auth/login`
5. Accede al dashboard protegido

## 💳 Sistema de Suscripción

### Características:
- **Plan único**: Mensual
- **Precio**: Configurable (variable de entorno)
- **Moneda**: Configurable (ARS, BRL, MXN, etc.)
- **Plataforma**: Mercado Pago
- **Creación**: Automática después del pago

### Flujo de Suscripción:
```
/subscribe → Formulario → Mercado Pago → Pago → Webhook → 
→ Crea Usuario → /payment/success → /auth/login → Dashboard
```

## 📁 Estructura de Archivos Principales

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/route.ts      # NextAuth handlers
│   │   └── mercadopago/
│   │       ├── create-preference/route.ts   # Crear pago
│   │       └── webhook/route.ts             # Confirmar pago
│   ├── auth/
│   │   └── login/page.tsx                   # Página de login
│   ├── subscribe/page.tsx                   # Página de suscripción
│   ├── payment/
│   │   ├── success/page.tsx                 # Pago exitoso
│   │   ├── failure/page.tsx                 # Pago fallido
│   │   └── pending/page.tsx                 # Pago pendiente
│   ├── dashboard/page.tsx                   # Dashboard (protegido)
│   ├── page.tsx                             # Inicio
│   └── layout.tsx                           # Layout principal
├── components/
│   ├── auth/
│   │   └── login-form.tsx                   # Formulario login
│   ├── subscription/
│   │   └── subscription-form.tsx            # Formulario suscripción
│   └── providers/
│       └── session-provider.tsx             # Provider de sesión
├── lib/
│   ├── auth.ts                              # Configuración NextAuth
│   ├── supabase.ts                          # Cliente Supabase
│   └── mercadopago.ts                       # Cliente Mercado Pago
└── middleware.ts                            # Protección de rutas

Archivos de Configuración:
├── supabase-schema.sql                      # Schema de base de datos
├── .env.local                               # Variables de entorno (local)
├── env.example                              # Template de variables
├── QUICKSTART.md                            # Guía de inicio rápido
├── CONFIGURACION_AUTH.md                    # Guía de OAuth
└── MERCADOPAGO_CONFIG.md                    # Guía de Mercado Pago
```

## 🗄️ Base de Datos (Supabase)

### Tablas Principales:

#### `users`
- Información del usuario
- Estado de suscripción
- Fechas de inicio/fin de suscripción
- IDs de Mercado Pago

#### `accounts`
- Cuentas OAuth vinculadas

#### `sessions`
- Sesiones activas (JWT)

#### `payment_transactions`
- Historial de pagos
- Estados de transacciones
- Metadata de Mercado Pago

#### `subscription_history`
- Eventos de suscripción
- Renovaciones
- Cancelaciones

## ⚙️ Variables de Entorno Necesarias

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# OAuth (Opcionales)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=
NEXT_PUBLIC_SUBSCRIPTION_PRICE=
NEXT_PUBLIC_CURRENCY=
```

## 🎨 Diseño

- **Colores**: Paleta personalizada (primary, secondary)
- **Tipografía**: 
  - Encabezados: Anton
  - Texto: Quicksand
- **Tema**: Solo modo claro (sin dark mode)
- **Responsive**: Mobile-first con Tailwind

## 🔒 Seguridad

- ✅ Contraseñas hasheadas (bcrypt)
- ✅ Validación de datos (Zod)
- ✅ JWT para sesiones
- ✅ CSRF protection (NextAuth)
- ✅ Row Level Security (Supabase)
- ✅ Webhooks verificados
- ✅ Variables sensibles en .env

## 📦 Dependencias Principales

```json
{
  "dependencies": {
    "next": "16.1.4",
    "react": "19.2.3",
    "next-auth": "beta",
    "@supabase/supabase-js": "latest",
    "mercadopago": "latest",
    "bcryptjs": "latest",
    "zod": "latest"
  }
}
```

## 🚀 Comandos

```bash
# Desarrollo
npm run dev              # Iniciar en desarrollo

# Producción
npm run build            # Compilar
npm run start            # Iniciar en producción

# Linting
npm run lint             # Verificar código
```

## 📝 Rutas Públicas vs Protegidas

### Públicas:
- `/` - Inicio
- `/subscribe` - Suscripción/Pago
- `/auth/login` - Login
- `/payment/*` - Páginas de resultado de pago

### Protegidas (requieren login):
- `/dashboard` - Panel del usuario
- Cualquier ruta bajo `/dashboard/*`

## 🔄 Flujo Completo del Usuario

1. **Landing** → Usuario llega a `/`
2. **Interés** → Click en "Suscribirse"
3. **Formulario** → Completa datos en `/subscribe`
4. **Pago** → Redirige a Mercado Pago
5. **Procesamiento** → Usuario paga
6. **Webhook** → MP notifica a la app
7. **Creación** → Se crea cuenta automáticamente
8. **Confirmación** → Redirige a `/payment/success`
9. **Login** → Usuario inicia sesión
10. **Dashboard** → Accede a la plataforma

## 🎯 Estado Actual

### ✅ Completado:
- Sistema de autenticación completo
- Integración con Supabase
- Integración con Mercado Pago
- Páginas de suscripción y pago
- Webhooks funcionando
- Creación automática de usuarios
- Dashboard básico
- Documentación completa

### 🚧 Pendiente (Futuro):
- Renovación automática de suscripciones
- Panel de gestión de suscripción
- Cancelación de suscripción
- Emails de confirmación
- Dashboard con más funcionalidades
- Recuperación de contraseña
- Sistema de notificaciones

## 📚 Documentación

- **QUICKSTART.md** - Inicio rápido (Supabase)
- **CONFIGURACION_AUTH.md** - Configurar OAuth
- **MERCADOPAGO_CONFIG.md** - Configurar Mercado Pago
- **Este archivo** - Visión general del proyecto

## 🐛 Solución de Problemas Comunes

Ver documentación específica:
- Supabase → QUICKSTART.md
- OAuth → CONFIGURACION_AUTH.md  
- Mercado Pago → MERCADOPAGO_CONFIG.md

## 👥 Notas de Desarrollo

- **No hay registro gratuito** - Solo mediante pago
- **OAuth es opcional** - El login con credenciales es el principal
- **Webhooks necesarios** - Para crear usuarios automáticamente
- **Testing** - Usar credenciales y tarjetas de prueba de MP

## 🎉 Características Destacadas

1. **Sin registro gratuito** - Modelo de negocio claro
2. **Pago seguro** - Procesado por Mercado Pago
3. **Automático** - Usuario se crea después del pago
4. **Escalable** - Arquitectura lista para crecer
5. **Moderno** - Stack actualizado y best practices

---

**Versión**: 1.0  
**Última actualización**: 2026-01-23
