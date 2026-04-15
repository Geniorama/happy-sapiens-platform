# Happy Sapiens Platform

SaaS de bienestar con modelo de suscripción. Los usuarios deben suscribirse antes de crear una cuenta; el webhook de Mercado Pago crea la cuenta automáticamente tras el pago.

## Stack

- **Framework**: Next.js 16 (App Router) + TypeScript 5 + React 19
- **Estilos**: Tailwind CSS 4
- **Auth**: NextAuth v5 (beta) — email/password, Google, Facebook, Strava
- **Base de datos**: PostgreSQL en AWS RDS + Prisma ORM
- **Pagos**: Mercado Pago
- **Storage**: AWS S3 + CloudFront CDN
- **Validación**: Zod
- **Package manager**: npm (`legacy-peer-deps=true` en `.npmrc`)
- **Deploy**: Netlify (`output: 'standalone'` en `next.config.ts`)

## Comandos

```bash
npm run dev         # Servidor de desarrollo (puerto 3000)
npm run build       # Build de producción
npm run lint        # ESLint
npm run db:migrate  # Crear/aplicar migración Prisma en dev
npm run db:deploy   # Aplicar migraciones en producción
npm run db:studio   # Abrir Prisma Studio
npm run db:generate # Regenerar cliente Prisma
```

Los scripts `db:*` cargan `.env.local` via `dotenv-cli` (Prisma CLI solo lee `.env` por defecto).

## Estructura

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth endpoint
│   │   ├── mercadopago/          # Webhooks y preferencias de pago
│   │   └── coupons/              # API de cupones
│   ├── auth/login/               # Página de login
│   ├── dashboard/                # Dashboard protegido
│   │   ├── coaches/              # Módulo de coaches
│   │   ├── partners/             # Módulo de aliados
│   │   └── profile/              # Perfil de usuario
│   ├── payment/{success,failure,pending}/
│   └── subscribe/                # Checkout / suscripción
├── components/
│   ├── auth/
│   ├── dashboard/                # 13 componentes de UI
│   ├── providers/                # SessionProvider de NextAuth
│   └── subscription/
├── lib/
│   ├── auth.ts                   # Configuración NextAuth
│   ├── db.ts                     # Cliente Prisma (singleton)
│   ├── mercadopago.ts            # Integración Mercado Pago
│   └── s3.ts                     # Cliente AWS S3
└── middleware.ts                 # Protección de rutas (/dashboard, /api/protected)
```

## Convenciones

- Archivos en **kebab-case** (`coach-detail.tsx`)
- Componentes en **PascalCase**
- Directorios en **minúsculas**
- Server Actions en archivos `actions.ts` dentro de cada módulo
- Path alias: `@/*` → `./src/*`

## Base de datos

Schema en `prisma/schema.prisma`. Migraciones versionadas en `prisma/migrations/`. Los archivos legacy `supabase-schema.sql` y `supabase-migration-*.sql` se mantienen en el repo como referencia histórica — no se ejecutan.

Autorización: se hace en server (NextAuth session + filtros por `userId` en queries). Las políticas RLS de Supabase no se portaron; cada Server Action / API route valida permisos contra `session.user`.

## Variables de entorno

Configurar en `.env.local`. Ver `COMO_CONFIGURAR_ENV.md` para la lista completa.

## Documentación

Todos los módulos tienen documentación en español en archivos `.md` en la raíz:
- `RESUMEN_PROYECTO.md` — visión general del proyecto
- `MODULO_RITUAL_COACHES.md` — sistema de reserva de coaches
- `MODULO_ALIADOS.md` — módulo de partners
- `MERCADOPAGO_CONFIG.md` — integración de pagos
- `AWS_S3_CLOUDFRONT_SETUP.md` — configuración de storage
