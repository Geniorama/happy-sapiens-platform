# 🎯 Sistema de Límites por Usuario

## 📋 Descripción

Sistema que permite definir **cuántos cupones de cada campaña** puede obtener cada usuario, para distribuir los cupones equitativamente entre todos los usuarios.

---

## 🎯 Cómo Funciona

### Concepto
Cada **campaña** (grupo de cupones con mismo partner + title + description) puede tener un límite de cupones por usuario.

### Ejemplos

| Campaña | Cupones Totales | Límite por Usuario | Resultado |
|---------|----------------|-------------------|-----------|
| **Black Friday Running** | 20 cupones | 2 por usuario | Máximo 10 usuarios pueden obtenerlos |
| **VIP Exclusivo** | 5 cupones | 1 por usuario | Máximo 5 usuarios (muy exclusivo) |
| **Pack Proteínas** | 30 cupones | 3 por usuario | Máximo 10 usuarios |
| **Cupón Estándar** | 100 cupones | Sin límite | Cualquier usuario puede obtener todos |

---

## 🗄️ Base de Datos

### Campo Agregado

```sql
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_per_user INTEGER DEFAULT NULL;
```

- **NULL** = Sin límite (usuario puede obtener todos los disponibles)
- **1** = Máximo 1 cupón por usuario
- **2** = Máximo 2 cupones por usuario
- **3+** = Máximo N cupones por usuario

### Ejemplos de Configuración

```sql
-- Cupones VIP: solo 1 por usuario
UPDATE coupons 
SET max_per_user = 1
WHERE title LIKE '%VIP%';

-- Promociones especiales: 2 por usuario
UPDATE coupons 
SET max_per_user = 2
WHERE title LIKE '%Black Friday%';

-- Cupones estándar: sin límite
UPDATE coupons 
SET max_per_user = NULL
WHERE title IS NULL;
```

---

## 🎨 Vista de Usuario

### Tarjeta con Límite

```
┌─────────────────────────────────────┐
│ 🏷️deportes  [Black Friday]    [20]📦│
│                                     │
│ Black Friday Running                │
│ Nike                                │
│                                     │
│ 30% OFF                             │
│                                     │
│ 👤 Has obtenido: 1 de 2             │ ← Límite por usuario
│                                     │
│ [Obtener Cupón]                     │
└─────────────────────────────────────┘
```

### Estados de la Tarjeta

#### 1. Usuario NO ha obtenido ninguno
```
👤 Has obtenido: 0 de 2
[Obtener Cupón] ← Habilitado
```

#### 2. Usuario ha obtenido algunos
```
👤 Has obtenido: 1 de 2
[Obtener Cupón] ← Habilitado
```

#### 3. Usuario alcanzó el límite
```
👤 Has obtenido: 2 de 2
⚠️ Límite alcanzado
[Límite alcanzado] ← Deshabilitado
```

#### 4. Sin límite configurado
```
(No muestra contador de usuario)
[Obtener Cupón] ← Habilitado mientras haya stock
```

---

## 🚀 Setup

### Paso 1: Ejecutar Migración

En **Supabase SQL Editor**:

```sql
-- Ejecuta: supabase-migration-coupon-limits.sql
```

### Paso 2: Configurar Límites

Puedes configurar límites al crear cupones o actualizar existentes:

#### Al Crear Cupones

```sql
INSERT INTO coupons (
  partner_id,
  coupon_code,
  title,
  description,
  max_per_user  -- ← Aquí defines el límite
) VALUES (
  (SELECT id FROM partners WHERE name = 'Nike'),
  'NIKE-BF-001',
  'Black Friday Running',
  '30% OFF por tiempo limitado',
  2  -- ← Máximo 2 por usuario
);
```

#### Actualizar Existentes

```sql
-- Poner límite de 1 a todos los cupones VIP
UPDATE coupons 
SET max_per_user = 1
WHERE title LIKE '%VIP%';

-- Poner límite de 3 a una campaña específica
UPDATE coupons 
SET max_per_user = 3
WHERE partner_id = (SELECT id FROM partners WHERE name = 'MyProtein')
AND title = 'Pack Proteínas Premium';

-- Quitar límite (ilimitado)
UPDATE coupons 
SET max_per_user = NULL
WHERE title IS NULL;
```

---

## 💡 Estrategias de Límites

### 1. Cupones Muy Exclusivos (1 por usuario)
- **Uso:** VIP, acceso premium, edición limitada
- **Límite:** 1
- **Ejemplo:** "Acceso VIP Exclusivo 50% OFF"

```sql
max_per_user = 1
```

### 2. Promociones Especiales (2-3 por usuario)
- **Uso:** Black Friday, Cyber Monday, eventos
- **Límite:** 2-3
- **Ejemplo:** "Black Friday Running 30% OFF"

```sql
max_per_user = 2
```

### 3. Packs y Combos (3-5 por usuario)
- **Uso:** Ofertas de productos múltiples
- **Límite:** 3-5
- **Ejemplo:** "Pack Proteínas - Compra 2 y obtén 40% OFF"

```sql
max_per_user = 3
```

### 4. Cupones Estándar (sin límite)
- **Uso:** Descuentos generales, siempre disponibles
- **Límite:** NULL
- **Ejemplo:** Cupones sin título personalizado

```sql
max_per_user = NULL
```

---

## 📊 Consultas Útiles

### Ver Límites Configurados

```sql
SELECT 
  p.name as marca,
  COALESCE(c.title, 'Estándar') as campaña,
  COUNT(*) as total_cupones,
  c.max_per_user as limite,
  CASE 
    WHEN c.max_per_user IS NULL THEN 'Ilimitado'
    ELSE c.max_per_user::TEXT || ' por usuario'
  END as descripcion_limite
FROM coupons c
JOIN partners p ON p.id = c.partner_id
WHERE c.is_assigned = false
GROUP BY p.name, c.title, c.max_per_user
ORDER BY p.name, c.title;
```

### Ver Uso de Usuario Específico

```sql
SELECT 
  p.name as marca,
  COALESCE(c.title, 'Estándar') as campaña,
  COUNT(*) as obtenidos,
  MAX(c.max_per_user) as limite
FROM coupons c
JOIN partners p ON p.id = c.partner_id
WHERE c.user_id = 'USER_ID_AQUI'
AND c.is_assigned = true
GROUP BY p.name, c.title
ORDER BY p.name, c.title;
```

### Campañas por Alcanzar Límite

```sql
-- Ver qué campañas tienen usuarios cerca del límite
SELECT 
  p.name as marca,
  COALESCE(c.title, 'Estándar') as campaña,
  c.max_per_user as limite,
  COUNT(DISTINCT c.user_id) as usuarios_activos,
  COUNT(*) FILTER (WHERE c.is_assigned = true) as cupones_asignados,
  COUNT(*) FILTER (WHERE c.is_assigned = false) as cupones_disponibles
FROM coupons c
JOIN partners p ON p.id = c.partner_id
WHERE c.max_per_user IS NOT NULL
GROUP BY p.name, c.title, c.max_per_user
HAVING COUNT(*) FILTER (WHERE c.is_assigned = true) >= (c.max_per_user * COUNT(DISTINCT c.user_id))
ORDER BY cupones_disponibles ASC;
```

---

## 🎯 Ejemplo Completo

### Crear Campaña con Límite

```sql
-- Crear 10 cupones de "Black Friday Running"
-- Límite: 2 por usuario
-- Resultado: Máximo 5 usuarios pueden obtenerlos

DO $$
BEGIN
  FOR i IN 1..10 LOOP
    INSERT INTO coupons (
      partner_id,
      coupon_code,
      title,
      description,
      cover_image_url,
      max_per_user,
      expires_at
    ) VALUES (
      (SELECT id FROM partners WHERE name = 'Nike' LIMIT 1),
      'NIKE-BF-' || LPAD(i::TEXT, 3, '0'),
      'Black Friday Running',
      '30% OFF - Solo por 48 horas',
      'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=400&fit=crop',
      2,  -- ← Límite de 2 por usuario
      NOW() + INTERVAL '2 days'
    );
  END LOOP;
END $$;
```

### Flujo de Usuario

1. **Usuario 1** ve la campaña: "Has obtenido: 0 de 2"
2. **Usuario 1** obtiene 1 cupón: "Has obtenido: 1 de 2"
3. **Usuario 1** obtiene otro: "Has obtenido: 2 de 2 - Límite alcanzado"
4. **Usuario 1** NO puede obtener más de esta campaña
5. **Usuario 2** puede obtener sus 2 cupones
6. Y así hasta que se agoten los 10 cupones entre 5 usuarios

---

## ✅ Ventajas del Sistema

1. **Distribución Justa:** Los cupones se reparten entre más usuarios
2. **Evita Acaparamiento:** Un usuario no puede llevarse todos
3. **Flexibilidad:** Cada campaña tiene su propio límite
4. **Transparencia:** El usuario ve claramente cuántos puede obtener
5. **Exclusividad:** Los límites bajos crean sensación de exclusividad

---

## 🔄 Cambiar Límites

### Aumentar Límite

```sql
-- Aumentar de 2 a 3
UPDATE coupons 
SET max_per_user = 3
WHERE title = 'Black Friday Running';
```

### Disminuir Límite

```sql
-- Reducir de 3 a 1 (solo afecta futuras asignaciones)
UPDATE coupons 
SET max_per_user = 1
WHERE title = 'Pack Proteínas Premium';
```

### Quitar Límite

```sql
-- Hacer ilimitado
UPDATE coupons 
SET max_per_user = NULL
WHERE title = 'Nutrición Deportiva Completa';
```

---

## 📁 Archivos Relacionados

- `supabase-migration-coupon-limits.sql` - Migración de base de datos
- `supabase-schema-aliados.sql` - Schema actualizado
- `src/app/dashboard/partners/actions.ts` - Validación del límite
- `src/app/dashboard/partners/page.tsx` - Contador de usuario
- `src/components/dashboard/available-coupon-card.tsx` - UI con límites
- `crear-cupones-ejemplo-fresh.sql` - Ejemplos con límites

---

**¡Sistema de Límites por Usuario Implementado! 🎯**
