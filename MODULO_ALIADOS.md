# 🤝 Módulo de Aliados y Cupones

## 📋 Descripción

Módulo completo para gestionar marcas aliadas y permitir que los usuarios generen cupones de descuento exclusivos para usar en las tiendas de estas marcas.

## 🎯 Funcionalidades

### Para Usuarios
- ✅ Ver todas las marcas aliadas disponibles
- ✅ Obtener cupones precargados (asignación automática)
- ✅ Copiar códigos de cupón con un clic
- ✅ Ver historial de cupones asignados
- ✅ Marcar cupones como usados
- ✅ Ver estado de cupones (activo, usado, expirado)
- ✅ Acceso directo al sitio web de la marca

### Para Administradores
- ✅ Cargar cupones previamente en el sistema
- ✅ Gestionar pool de cupones disponibles
- ✅ Ver estadísticas de uso por marca
- ✅ Liberar cupones no utilizados

### Características del Sistema
- ✅ Pool de cupones precargados por el admin
- ✅ Asignación automática de cupones disponibles
- ✅ Validación: 1 cupón por marca por usuario
- ✅ Expiración automática de cupones (30 días después de asignación)
- ✅ Categorización de marcas (deportes, nutrición, tecnología)
- ✅ Row Level Security (RLS) en Supabase

## 🚀 Instalación

### 1️⃣ Crear las Tablas en Supabase

Ve a tu proyecto en **Supabase** → **SQL Editor** y ejecuta:

```bash
supabase-schema-aliados.sql
```

Este script creará:
- Tabla `partners` (marcas aliadas)
- Tabla `coupons` (pool de cupones)
- Índices para optimización
- Políticas RLS
- 5 marcas de ejemplo (Nike, Under Armour, MyProtein, Garmin, Decathlon)
- 10 cupones por marca (50 cupones en total)

### 2️⃣ Verificar la Instalación

Ejecuta en SQL Editor:

```sql
-- Ver marcas aliadas
SELECT * FROM partners;

-- Ver cupones disponibles por marca
SELECT 
  p.name as marca,
  COUNT(c.id) as total_cupones,
  COUNT(c.id) FILTER (WHERE c.is_assigned = false) as disponibles,
  COUNT(c.id) FILTER (WHERE c.is_assigned = true) as asignados
FROM partners p
LEFT JOIN coupons c ON c.partner_id = p.id
GROUP BY p.name;

-- Ver estructura de tablas
\d partners
\d coupons
```

## 📊 Estructura de la Base de Datos

### Tabla `partners`
```sql
- id (UUID)
- name (TEXT) - Nombre de la marca
- description (TEXT) - Descripción
- logo_url (TEXT) - URL del logo
- website_url (TEXT) - Sitio web
- category (TEXT) - Categoría (deportes, nutricion, tecnologia)
- discount_percentage (INTEGER) - % de descuento
- discount_description (TEXT) - Descripción del descuento
- is_active (BOOLEAN) - Si está activa
- terms_and_conditions (TEXT) - Términos y condiciones
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### Tabla `coupons`
```sql
- id (UUID)
- partner_id (UUID) - Referencia a la marca
- coupon_code (TEXT) - Código único del cupón
- is_assigned (BOOLEAN) - Si está asignado a un usuario
- user_id (UUID) - Usuario al que está asignado (NULL si disponible)
- assigned_at (TIMESTAMPTZ) - Fecha de asignación
- used_at (TIMESTAMPTZ) - Fecha de uso
- expires_at (TIMESTAMPTZ) - Fecha de expiración
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

## 🎨 Componentes Creados

### 1. `src/app/dashboard/partners/page.tsx`
Página principal del módulo que muestra:
- Lista de marcas aliadas
- Cupones generados por el usuario

### 2. `src/components/dashboard/partner-card.tsx`
Card individual de cada marca con:
- Logo y nombre
- Categoría y descripción
- Porcentaje de descuento
- Botón para generar cupón
- Enlace al sitio web
- Términos y condiciones

### 3. `src/components/dashboard/user-coupons-list.tsx`
Lista de cupones del usuario con:
- Código del cupón
- Estado (activo/usado/expirado)
- Botón para copiar código
- Fechas de generación y expiración
- Botón para marcar como usado
- Enlace directo a la tienda

### 4. `src/app/dashboard/partners/actions.ts`
Server actions:
- `assignCoupon()` - Asigna un cupón disponible al usuario
- `markCouponAsUsed()` - Marca un cupón como usado
- `getAvailableCouponsCount()` - Obtiene cantidad de cupones disponibles

## 🎯 Formato de Códigos de Cupón

Los códigos son precargados por el admin con el formato:
```
[PREFIJO DE MARCA]-[CÓDIGO ALFANUMÉRICO]

Ejemplos: 
- NIKE-A7B9C2D4
- UA-X3Y8Z1M5
- MYP-K9L2N6P8
```

El admin puede usar cualquier formato que desee.

## 🔒 Reglas de Negocio

1. **Pool de cupones**: Los admins cargan cupones previamente en el sistema
2. **Asignación única**: Cada cupón solo puede asignarse a un usuario
3. **Un cupón por marca**: Los usuarios solo pueden tener un cupón asignado por marca
4. **Expiración**: Los cupones expiran 30 días después de ser asignados
5. **Estados**:
   - `is_assigned = false`: Cupón disponible en el pool
   - `is_assigned = true, used_at = null`: Cupón asignado y activo
   - `is_assigned = true, used_at != null`: Cupón usado
   - Expirado: Cupón que superó su fecha de expiración

## 🎨 Diseño Visual

### Paleta de Colores por Estado
- **Activo**: Verde (`bg-green-100 text-green-700`)
- **Usado**: Gris (`bg-zinc-100 text-zinc-700`)
- **Expirado**: Rojo (`bg-red-100 text-red-700`)

### Categorías de Marcas
- **Deportes**: Azul (`bg-blue-100 text-blue-700`)
- **Nutrición**: Verde (`bg-green-100 text-green-700`)
- **Tecnología**: Morado (`bg-purple-100 text-purple-700`)

### Iconos Utilizados (Lucide React)
- 🤝 `Handshake` - Navegación "Aliados"
- 🎁 `Gift` - Logo placeholder de marca
- 🏷️ `Tag` - Categoría
- 📋 `Copy` - Copiar código
- ✓ `Check` - Código copiado
- 🔗 `ExternalLink` - Ir al sitio web
- ⏰ `Clock` - Cupón activo
- ✓ `CheckCircle` - Cupón usado
- ✗ `XCircle` - Cupón expirado

## 📱 Responsive Design

- **Móvil**: Grid de 1 columna
- **Tablet**: Grid de 2 columnas
- **Desktop**: Grid de 3 columnas para marcas, 2 para cupones

## 🔐 Seguridad (RLS)

### Políticas Implementadas:

**Tabla `partners`:**
- Todos los usuarios pueden ver marcas activas

**Tabla `coupons`:**
- Los usuarios solo pueden ver cupones asignados a ellos
- Los usuarios solo pueden actualizar sus propios cupones asignados
- Solo el sistema (servidor) puede asignar cupones del pool

## 🔐 Gestión de Cupones (Solo Admins)

### Agregar Cupones

Usa el archivo `admin-agregar-cupones.sql` que incluye múltiples opciones:

**Opción 1: Agregar cupones manualmente**
```sql
INSERT INTO coupons (partner_id, coupon_code) VALUES
  ('PARTNER_ID_AQUI'::UUID, 'NIKE-ABC123XY'),
  ('PARTNER_ID_AQUI'::UUID, 'NIKE-DEF456ZW');
```

**Opción 2: Generar cupones automáticamente (20 cupones)**
```sql
INSERT INTO coupons (partner_id, coupon_code) 
SELECT 
  p.id,
  'NIKE-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
FROM partners p
WHERE p.name = 'Nike'
CROSS JOIN generate_series(1, 20);
```

**Opción 3: Ver estadísticas**
```sql
SELECT 
  p.name as marca,
  COUNT(c.id) as total_cupones,
  COUNT(c.id) FILTER (WHERE c.is_assigned = false) as disponibles,
  COUNT(c.id) FILTER (WHERE c.is_assigned = true AND c.used_at IS NULL) as asignados_sin_usar,
  COUNT(c.id) FILTER (WHERE c.used_at IS NOT NULL) as usados
FROM partners p
LEFT JOIN coupons c ON c.partner_id = p.id
GROUP BY p.id, p.name
ORDER BY p.name;
```

## 📝 Agregar Nuevas Marcas

Para agregar una nueva marca, ejecuta en Supabase:

```sql
INSERT INTO partners (
  name, 
  description, 
  logo_url, 
  website_url, 
  category, 
  discount_percentage, 
  discount_description, 
  terms_and_conditions
) VALUES (
  'Nombre de la Marca',
  'Descripción de la marca',
  'https://ejemplo.com/logo.png',
  'https://www.marca.com',
  'deportes', -- deportes, nutricion, tecnologia
  20, -- porcentaje de descuento
  '20% de descuento en todos los productos',
  'Términos y condiciones aplicables'
);
```

## 🎯 Próximas Mejoras (Opcionales)

- [ ] Sistema de notificaciones cuando expira un cupón
- [ ] Estadísticas de uso de cupones
- [ ] Integración con APIs de las marcas para validación automática
- [ ] Sistema de valoraciones de marcas
- [ ] Búsqueda y filtrado por categoría
- [ ] Cupones con límite de uso (cantidad limitada)
- [ ] Códigos QR para cupones
- [ ] Compartir cupones entre usuarios (si la marca lo permite)

## 📁 Archivos del Módulo

### Nuevos Archivos
```
supabase-schema-aliados.sql (Schema completo con 50 cupones de ejemplo)
admin-agregar-cupones.sql (Scripts para admins)
src/app/dashboard/partners/page.tsx
src/app/dashboard/partners/actions.ts
src/components/dashboard/partner-card.tsx
src/components/dashboard/user-coupons-list.tsx
MODULO_ALIADOS.md
```

### Archivos Modificados
```
src/components/dashboard/dashboard-layout.tsx (agregado enlace en navegación)
```

## ✨ Ejemplos de Uso

### Flujo del Usuario:
1. Usuario accede a "Aliados" desde el menú
2. Ve todas las marcas disponibles con sus descuentos
3. Hace clic en "Obtener Cupón" para una marca
4. El sistema busca un cupón disponible y se lo asigna
5. El cupón aparece en "Mis Cupones"
6. Usuario copia el código del cupón
7. Usuario hace clic en "Usar ahora" para ir al sitio de la marca
8. Aplica el cupón en la tienda
9. Regresa y marca el cupón como "usado"

### Flujo del Administrador:
1. Admin ejecuta script SQL para agregar cupones
2. Los cupones quedan disponibles en el pool
3. Cuando un usuario solicita un cupón, se asigna automáticamente
4. Admin puede ver estadísticas de cupones disponibles/usados

¡El módulo está listo para usar! 🎉
