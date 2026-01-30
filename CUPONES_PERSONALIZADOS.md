# 🎫 Cupones con Portadas Personalizadas

## 📋 Descripción

Sistema que permite que cada cupón tenga su propia imagen de portada, título y descripción. Si el cupón no tiene imagen personalizada, se muestra automáticamente la imagen de la marca aliada.

---

## 🎨 Sistema de Fallback

```
Cupón con imagen propia → Muestra imagen del cupón
       ↓ (si no existe)
Imagen de la marca → Muestra imagen de la marca
       ↓ (si no existe)
Sin imagen → Muestra diseño por defecto
```

---

## 🗄️ Estructura de Base de Datos

### Campos Agregados a `coupons`

```sql
title TEXT                -- Título personalizado del cupón (opcional)
description TEXT          -- Descripción específica (opcional)
cover_image_url TEXT      -- Imagen de portada del cupón (opcional)
```

### Ejemplo de Datos

| coupon_code | title | description | cover_image_url | partner |
|------------|-------|-------------|-----------------|---------|
| `NIKE-ABC123` | NULL | NULL | NULL | Nike (usa imagen de Nike) |
| `NIKE-BF-XYZ` | "Black Friday Running" | "30% OFF en running" | `photo-123...` | Nike (usa su propia imagen) |
| `MYP-PACK-789` | "Pack Proteínas" | "40% OFF en 2+ productos" | `photo-456...` | MyProtein (usa su propia imagen) |

---

## 🚀 Setup

### 1. Ejecutar Migración

En **Supabase SQL Editor**, ejecuta:

```bash
supabase-migration-coupons-cover-images.sql
```

Este script:
- ✅ Agrega columnas `title`, `description`, `cover_image_url`
- ✅ Verifica la migración
- ✅ Incluye ejemplos comentados para personalizar cupones

### 2. Verificar

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'coupons' 
AND column_name IN ('title', 'description', 'cover_image_url');
```

---

## 💡 Tipos de Cupones

### 1. Cupones Estándar (sin personalizar)

Usan la información de la marca:
- Imagen: `partners.cover_image_url`
- Título: `partners.name`
- Descripción: `partners.discount_description`

```sql
-- Crear 10 cupones estándar
INSERT INTO coupons (partner_id, coupon_code) 
SELECT 
  p.id,
  'NIKE-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
FROM partners p
CROSS JOIN generate_series(1, 10)
WHERE p.name = 'Nike';
```

### 2. Cupones Personalizados

Tienen su propia imagen, título y descripción:

```sql
-- Crear cupón "Black Friday"
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) VALUES (
  (SELECT id FROM partners WHERE name = 'Nike'),
  'NIKE-BF-2024',
  'Black Friday Running',
  '30% OFF en toda la colección de running',
  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=400&fit=crop'
);
```

### 3. Cupones Semi-Personalizados

Solo personalizan algunos campos:

```sql
-- Solo título personalizado (usa imagen de la marca)
INSERT INTO coupons (partner_id, coupon_code, title) 
VALUES (
  (SELECT id FROM partners WHERE name = 'Nike'),
  'NIKE-VIP-001',
  'Cupón VIP Exclusivo'
);
```

---

## 🎨 Vista de Usuario

### En "Mis Cupones"

Las tarjetas ahora muestran:

```
┌─────────────────────────────────────┐
│  [Imagen del cupón o de la marca]  │
│                                     │
│  [Badge: Activo/Usado/Expirado]    │
│                                     │
│  Título del Cupón                  │
├─────────────────────────────────────┤
│  Descripción específica            │
│                                     │
│  ┌─────────────────────────────┐  │
│  │   CODIGO-CUPON-123          │  │
│  │   [Copiar]                  │  │
│  └─────────────────────────────┘  │
│                                     │
│  Asignado: 15 ene 2024            │
│  Expira: 15 feb 2024              │
│                                     │
│  [Usar ahora] [Marcar como usado]  │
└─────────────────────────────────────┘
```

### Características Visuales

- **Con imagen:** Título sobre la imagen con overlay
- **Sin imagen:** Diseño compacto tradicional
- **Badge de estado:** Siempre visible (Activo/Usado/Expirado)
- **Responsive:** Se adapta a móviles y desktop

---

## 📝 Ejemplos de Uso

### Caso 1: Promoción Especial Temporal

```sql
-- Black Friday Nike
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url,
  expires_at
) 
SELECT 
  p.id,
  'NIKE-BF-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)),
  'Black Friday Running',
  '30% OFF - Solo por tiempo limitado',
  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=400&fit=crop',
  NOW() + INTERVAL '7 days'
FROM partners p
CROSS JOIN generate_series(1, 20)
WHERE p.name = 'Nike';
```

### Caso 2: Pack de Productos

```sql
-- Pack Proteínas MyProtein
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) VALUES (
  (SELECT id FROM partners WHERE name = 'MyProtein'),
  'MYP-PACK-PREMIUM',
  'Pack Proteínas Premium',
  '40% OFF comprando 2 o más productos',
  'https://images.unsplash.com/photo-1579722821273-0f6c7d6ba513?w=800&h=400&fit=crop'
);
```

### Caso 3: Cupón VIP

```sql
-- Cupón exclusivo para usuarios premium
INSERT INTO coupons (
  partner_id, 
  coupon_code,
  title,
  description,
  cover_image_url
) VALUES (
  (SELECT id FROM partners WHERE name = 'Garmin'),
  'GAR-VIP-PREMIUM',
  'Acceso VIP',
  '50% OFF - Solo para miembros premium',
  'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&h=400&fit=crop'
);
```

---

## 🔧 Gestión de Cupones

### Ver Cupones por Tipo

```sql
-- Ver cupones personalizados vs estándar
SELECT 
  p.name as marca,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE c.title IS NOT NULL) as personalizados,
  COUNT(*) FILTER (WHERE c.title IS NULL) as estandar
FROM coupons c
JOIN partners p ON p.id = c.partner_id
GROUP BY p.name;
```

### Actualizar Cupón Existente

```sql
-- Personalizar un cupón estándar
UPDATE coupons
SET 
  title = 'Oferta Especial Verano',
  description = '25% OFF en toda la tienda',
  cover_image_url = 'https://images.unsplash.com/photo-XXXXXX?w=800&h=400&fit=crop'
WHERE coupon_code = 'NIKE-ABC12345';
```

### Despersonalizar Cupón

```sql
-- Volver a usar datos de la marca
UPDATE coupons
SET 
  title = NULL,
  description = NULL,
  cover_image_url = NULL
WHERE coupon_code = 'NIKE-ABC12345';
```

### Eliminar Cupones Expirados

```sql
-- Eliminar cupones personalizados expirados y no asignados
DELETE FROM coupons
WHERE expires_at < NOW()
AND is_assigned = false
AND title IS NOT NULL;
```

---

## 📊 Consultas Útiles

### Cupones Disponibles

```sql
SELECT 
  p.name,
  c.coupon_code,
  COALESCE(c.title, 'Estándar') as tipo,
  c.is_assigned
FROM coupons c
JOIN partners p ON p.id = c.partner_id
WHERE c.is_assigned = false
ORDER BY p.name;
```

### Cupones Personalizados Activos

```sql
SELECT 
  p.name as marca,
  c.coupon_code,
  c.title,
  c.description,
  c.is_assigned,
  c.expires_at
FROM coupons c
JOIN partners p ON p.id = c.partner_id
WHERE c.title IS NOT NULL
AND (c.expires_at IS NULL OR c.expires_at > NOW())
ORDER BY c.created_at DESC;
```

### Top Cupones Usados

```sql
SELECT 
  p.name as marca,
  COALESCE(c.title, 'Estándar') as tipo,
  COUNT(*) as veces_usado
FROM coupons c
JOIN partners p ON p.id = c.partner_id
WHERE c.used_at IS NOT NULL
GROUP BY p.name, c.title
ORDER BY veces_usado DESC
LIMIT 10;
```

---

## 🎯 Mejores Prácticas

### Selección de Imágenes

✅ **Buenas imágenes para cupones:**
- Relacionadas con la promoción específica
- Diferentes a la imagen de la marca (para destacar)
- Alta calidad y bien iluminadas
- Personas usando el producto

❌ **Evitar:**
- Reutilizar la misma imagen de la marca
- Imágenes genéricas sin relación
- Texto ilegible en la imagen

### Títulos y Descripciones

✅ **Buenos títulos:**
- "Black Friday Running"
- "Pack Proteínas Premium"
- "Verano Outdoor"
- "Acceso VIP"

✅ **Buenas descripciones:**
- Específicas: "30% OFF en running"
- Con urgencia: "Solo por tiempo limitado"
- Con condiciones: "Comprando 2 o más productos"

❌ **Evitar:**
- Títulos muy largos
- Descripciones vagas
- Información duplicada de la marca

### Organización

1. **Cupones estándar:** Para uso general diario
2. **Cupones personalizados:** Para promociones especiales
3. **Expiraciones:** Siempre poner fecha en promociones temporales
4. **Cantidad:** Crear suficientes cupones para la demanda esperada

---

## 🔮 Ideas de Cupones Personalizados

### Por Temporada

- **Verano:** Ropa deportiva ligera, outdoor
- **Invierno:** Equipamiento térmico, indoor
- **Primavera:** Running, ciclismo
- **Otoño:** Gym, fitness

### Por Evento

- **Black Friday:** Descuentos masivos
- **Cyber Monday:** Productos tech
- **Año Nuevo:** Membresías, equipamiento
- **Día del Padre/Madre:** Packs regalo

### Por Producto

- **Zapatillas Running:** Imagen de runner
- **Proteínas:** Imagen de batido/gym
- **Smartwatches:** Imagen de tecnología
- **Ropa Yoga:** Imagen de yoga/wellness

---

## 📁 Archivos Relacionados

- `supabase-migration-coupons-cover-images.sql` - Migración
- `admin-agregar-cupones-personalizados.sql` - Scripts para admins
- `supabase-schema-aliados.sql` - Schema completo actualizado
- `src/components/dashboard/user-coupons-list.tsx` - Componente de cupones
- `src/app/dashboard/partners/page.tsx` - Página de aliados

---

## ✅ Checklist

- [x] Agregar columnas a tabla `coupons`
- [x] Actualizar componente `UserCouponsList`
- [x] Implementar sistema de fallback (cupón → marca → default)
- [x] Crear scripts para admins
- [x] Actualizar schema SQL
- [x] Documentar proceso completo
- [x] Ejemplos de cupones personalizados

---

**¡Sistema de Cupones Personalizados Listo! 🎫**
