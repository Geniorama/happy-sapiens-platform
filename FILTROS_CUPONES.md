# 🔍 Sistema de Filtros de Cupones

## 📋 Descripción

Sistema completo de filtros con logos de marcas y categorías que permite a los usuarios encontrar rápidamente los cupones que buscan.

---

## ✨ Características

### 1. **Filtro por Marca**
- ✅ Muestra el **logo** de cada marca
- ✅ Click para filtrar por marca específica
- ✅ Click de nuevo para quitar el filtro
- ✅ Fallback a inicial si no hay logo

### 2. **Filtro por Categoría**
- ✅ Botones con colores por categoría
- ✅ Deportes (azul), Nutrición (verde), Tecnología (morado)
- ✅ Click para filtrar por categoría
- ✅ Click de nuevo para quitar el filtro

### 3. **Contador Dinámico**
- ✅ Muestra "X de Y cupones"
- ✅ Se actualiza en tiempo real
- ✅ Sin filtros: "Y cupones"

### 4. **Responsive**
- ✅ Desktop: Filtros siempre visibles
- ✅ Móvil: Filtros colapsables con botón toggle
- ✅ Diseño adaptable

---

## 🗄️ Base de Datos

### Campo `logo_url` en `partners`

El campo ya existe en la tabla, solo necesitas agregar los URLs:

```sql
-- Ejecuta: supabase-update-partners-logos.sql
```

### Logos Configurados

| Marca | Logo |
|-------|------|
| **Nike** | Logo SVG de Wikipedia |
| **Under Armour** | Logo SVG de Wikipedia |
| **MyProtein** | Logo SVG de Brandfetch |
| **Garmin** | Logo SVG de Wikipedia |
| **Decathlon** | Logo SVG de Wikipedia |

---

## 🎨 Vista de Usuario

### Desktop

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Filtros                              15 cupones      │
│                                                          │
│ Por Marca:                                              │
│ [LOGO Nike] [LOGO UA] [LOGO MyProt] [LOGO Garmin]...   │
│                                                          │
│ Por Categoría:                                          │
│ [Deportes] [Nutrición] [Tecnología]                    │
│                                                          │
│ [Limpiar filtros]                                       │
└─────────────────────────────────────────────────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Cupón 1    │ │   Cupón 2    │ │   Cupón 3    │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Móvil

```
┌─────────────────────────────────┐
│ 🔍 Filtros         [Mostrar ▼]  │
│ 15 cupones                       │
└─────────────────────────────────┘
```

Cuando expande:

```
┌─────────────────────────────────┐
│ 🔍 Filtros         [Ocultar ▲]  │
│ 15 cupones                       │
│                                  │
│ Por Marca:                       │
│ [LOGO Nike]                      │
│ [LOGO Under Armour]              │
│                                  │
│ Por Categoría:                   │
│ [Deportes] [Nutrición]          │
│                                  │
│ [Limpiar filtros]               │
└─────────────────────────────────┘
```

---

## 💡 Estados Visuales

### Marca Sin Seleccionar

```
┌──────────────────┐
│ [LOGO] Nike      │ ← Fondo blanco, borde gris
└──────────────────┘
```

### Marca Seleccionada

```
┌──────────────────┐
│ [LOGO] Nike      │ ← Fondo primary/5, borde primary, texto primary
└──────────────────┘
```

### Categoría Sin Seleccionar

```
[Deportes] ← Fondo azul claro, texto azul oscuro
```

### Categoría Seleccionada

```
[Deportes] ← Fondo primary, texto blanco
```

---

## 🚀 Cómo Usar

### Paso 1: Agregar Logos a las Marcas

Ejecuta en **Supabase SQL Editor**:

```sql
-- Contenido de: supabase-update-partners-logos.sql
```

### Paso 2: Verificar

```sql
SELECT name, logo_url, category 
FROM partners 
ORDER BY name;
```

Deberías ver las URLs de los logos.

### Paso 3: Usar en el Frontend

El sistema ya está implementado. Los usuarios verán:
1. Filtros en la parte superior
2. Logos de marcas clickeables
3. Categorías con colores
4. Contador dinámico
5. Resultados filtrados

---

## 📝 Agregar Logos Personalizados

### Opción 1: URLs Públicas (Recomendado)

```sql
UPDATE partners 
SET logo_url = 'https://tu-cdn.com/logos/marca.svg'
WHERE name = 'Tu Marca';
```

**Ventajas:**
- ✅ Rápido y simple
- ✅ Sin gestión de archivos
- ✅ URLs de Wikipedia/Brandfetch son confiables

**Fuentes recomendadas:**
- [Wikipedia Commons](https://commons.wikimedia.org/)
- [Brandfetch](https://brandfetch.com/)
- [SVG Logos](https://svglogos.com/)

### Opción 2: Subir a S3/CloudFront

Si quieres hospedar tus propios logos:

```sql
UPDATE partners 
SET logo_url = 'https://tu-cloudfront.com/logos/nike.svg'
WHERE name = 'Nike';
```

**Pasos:**
1. Sube el logo a tu bucket S3
2. Obtén la URL de CloudFront
3. Actualiza la base de datos

### Opción 3: Logos Locales (No Recomendado)

```sql
UPDATE partners 
SET logo_url = '/logos/nike.svg'
WHERE name = 'Nike';
```

Requiere colocar los archivos en `public/logos/`

---

## 🎨 Especificaciones de Logos

### Formato Recomendado
- **Formato:** SVG (vector, escalable)
- **Alternativas:** PNG con fondo transparente
- **Tamaño display:** 24x24px (se escala automáticamente)
- **Resolución:** Mínimo 100x100px para PNG

### Ejemplos de URLs

```sql
-- SVG de Wikipedia (mejor opción)
'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg'

-- PNG de alta resolución
'https://example.com/logo-nike-300x300.png'

-- SVG de Brandfetch
'https://asset.brandfetch.io/idD9uN9gxF/idK5azLTBX.svg'
```

---

## 🔧 Funcionalidad de Filtros

### Lógica de Filtrado

```typescript
// Combina ambos filtros (AND)
const filteredCampaigns = campaigns.filter(campaign => {
  // Filtro por marca
  if (selectedPartner && campaign.partner.id !== selectedPartner) {
    return false
  }

  // Filtro por categoría
  if (selectedCategory && campaign.partner.category !== selectedCategory) {
    return false
  }

  return true
})
```

### Ejemplos de Uso

**Filtrar solo Nike:**
- Click en logo de Nike
- Resultado: Solo cupones de Nike

**Filtrar solo Nutrición:**
- Click en categoría "Nutrición"
- Resultado: MyProtein, etc.

**Combinar: Nike + Deportes:**
- Click en Nike
- Click en Deportes
- Resultado: Solo cupones de Nike que sean de deportes

**Limpiar filtros:**
- Click en "Limpiar filtros"
- Resultado: Todos los cupones visibles

---

## 📊 Consultas Útiles

### Ver Marcas con sus Categorías

```sql
SELECT 
  name,
  category,
  logo_url,
  COUNT(*) as total_cupones
FROM partners p
LEFT JOIN coupons c ON c.partner_id = p.id AND c.is_assigned = false
WHERE p.is_active = true
GROUP BY p.id, p.name, p.category, p.logo_url
ORDER BY p.name;
```

### Contar Cupones por Categoría

```sql
SELECT 
  p.category,
  COUNT(*) as total_cupones,
  COUNT(DISTINCT p.id) as total_marcas
FROM coupons c
JOIN partners p ON p.id = c.partner_id
WHERE c.is_assigned = false
AND p.is_active = true
GROUP BY p.category
ORDER BY total_cupones DESC;
```

### Marcas sin Logo

```sql
SELECT name, category
FROM partners
WHERE logo_url IS NULL
AND is_active = true;
```

---

## 🎯 Casos de Uso

### Usuario busca cupones de Nike

1. Usuario entra a `/dashboard/partners`
2. Ve todos los filtros con logos
3. Click en logo de Nike
4. Solo ve cupones de Nike
5. Puede combinar con categoría

### Usuario busca cupones de Nutrición

1. Usuario entra a `/dashboard/partners`
2. Click en categoría "Nutrición"
3. Ve cupones de MyProtein y otras marcas de nutrición
4. Puede filtrar más por marca específica

### Usuario quiere ver todo

1. Si tiene filtros activos, click en "Limpiar filtros"
2. Ve todos los cupones disponibles

---

## 🔮 Futuras Mejoras

1. **Búsqueda por texto:** Input para buscar por nombre de campaña
2. **Filtro por precio:** Ordenar por % de descuento
3. **Filtro por vencimiento:** "Expiran pronto", "Sin vencimiento"
4. **Filtro múltiple:** Seleccionar varias marcas a la vez
5. **URL con filtros:** Compartir links con filtros activos
6. **Favoritos:** Guardar marcas favoritas

---

## 📁 Archivos Creados

- `supabase-update-partners-logos.sql` - Script para agregar logos
- `src/components/dashboard/coupon-filters.tsx` - Componente de filtros
- `src/components/dashboard/coupon-filters-client.tsx` - Lógica de filtrado
- `src/app/dashboard/partners/page.tsx` - Página actualizada

---

## ✅ Checklist

- [x] Campo `logo_url` en tabla partners
- [x] Script SQL para agregar logos
- [x] Componente de filtros con logos
- [x] Filtro por marca clickeable
- [x] Filtro por categoría
- [x] Contador dinámico
- [x] Limpiar filtros
- [x] Responsive (móvil y desktop)
- [x] Estados visuales (seleccionado/no seleccionado)
- [x] Fallback si no hay logo
- [x] Resultados filtrados en tiempo real

---

**¡Sistema de Filtros con Logos Implementado! 🔍**
