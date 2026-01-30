# 🎫 Cupones de Ejemplo - Happy Sapiens

## 📋 Descripción

Este documento describe los **14 cupones de ejemplo** que puedes crear para tu plataforma. Incluye una mezcla de cupones personalizados y estándar para demostrar todas las funcionalidades.

---

## 🎨 Cupones Creados

### 🏃 NIKE (4 cupones)

#### 1. **NIKE-BF2024** - Black Friday Running
- **Tipo:** Personalizado con vencimiento
- **Imagen:** Persona corriendo (foto-1552674605)
- **Título:** "Black Friday Running"
- **Descripción:** "30% OFF en toda la colección de running - Solo 48 horas"
- **Expira:** 30 días
- **Ideal para:** Promociones urgentes y temporales

#### 2. **NIKE-PREM001** - Zapatillas Premium
- **Tipo:** Personalizado
- **Imagen:** Colección de zapatillas (photo-1460353581641)
- **Título:** "Zapatillas Premium"
- **Descripción:** "20% OFF en Air Max y Jordan - Edición limitada"
- **Ideal para:** Productos específicos de alta gama

#### 3. **NIKE-STD001** - Cupón Estándar
- **Tipo:** Estándar (sin personalizar)
- **Imagen:** Usa imagen de marca Nike
- **Título:** "Nike"
- **Descripción:** Usa descripción de marca (15% OFF)
- **Ideal para:** Cupones generales diarios

#### 4. **NIKE-VIP001** - Acceso VIP Exclusivo
- **Tipo:** Personalizado VIP con vencimiento
- **Imagen:** Lifestyle deportivo premium (photo-1515238152791)
- **Título:** "Acceso VIP Exclusivo"
- **Descripción:** "50% OFF - Solo para miembros premium Happy Sapiens"
- **Expira:** 15 días
- **Ideal para:** Usuarios premium o campañas especiales

---

### 💪 MYPROTEIN (3 cupones)

#### 5. **MYP-PACK01** - Pack Proteínas Premium
- **Tipo:** Personalizado
- **Imagen:** Suplementos y productos (photo-1593095948071)
- **Título:** "Pack Proteínas Premium"
- **Descripción:** "40% OFF comprando 2 o más productos de proteína whey"
- **Ideal para:** Promociones de combos y packs

#### 6. **MYP-NUT001** - Nutrición Deportiva Completa
- **Tipo:** Personalizado
- **Imagen:** Persona con alimentación saludable (photo-1571019613454)
- **Título:** "Nutrición Deportiva Completa"
- **Descripción:** "30% OFF en vitaminas, proteínas y suplementos"
- **Ideal para:** Categorías amplias de productos

#### 7. **MYP-VIP001** - Bienvenida Premium
- **Tipo:** Personalizado VIP con vencimiento
- **Imagen:** Fitness y nutrición (photo-1532384816664)
- **Título:** "Bienvenida Premium"
- **Descripción:** "35% OFF en tu primera compra - Código VIP"
- **Expira:** 20 días
- **Ideal para:** Nuevos usuarios o primera compra

---

### ⌚ GARMIN (2 cupones)

#### 8. **GAR-WATCH01** - Relojes Inteligentes
- **Tipo:** Personalizado con vencimiento
- **Imagen:** Smartwatch (photo-1579586337278)
- **Título:** "Relojes Inteligentes"
- **Descripción:** "15% OFF en Forerunner y Fenix - Hasta agotar stock"
- **Expira:** 60 días
- **Ideal para:** Productos tech con stock limitado

#### 9. **GAR-RUN001** - Tech para Runners
- **Tipo:** Personalizado
- **Imagen:** Tecnología deportiva (photo-1434493789847)
- **Título:** "Tech para Runners"
- **Descripción:** "12% OFF en relojes GPS y monitores de ritmo cardíaco"
- **Ideal para:** Segmento específico de usuarios

---

### 🏋️ UNDER ARMOUR (2 cupones)

#### 10. **UA-SUMMER01** - Colección Verano
- **Tipo:** Personalizado estacional con vencimiento
- **Imagen:** Atleta al aire libre (photo-1476480862126)
- **Título:** "Colección Verano"
- **Descripción:** "25% OFF en toda la ropa deportiva de verano"
- **Expira:** 90 días
- **Ideal para:** Promociones estacionales

#### 11. **UA-TRAIN01** - Training Pro
- **Tipo:** Personalizado
- **Imagen:** Entrenamiento intenso (photo-1534258936925)
- **Título:** "Training Pro"
- **Descripción:** "20% OFF en ropa de alto rendimiento y accesorios"
- **Ideal para:** Línea profesional o premium

---

### 🏔️ DECATHLON (3 cupones)

#### 12. **DEC-OUT001** - Aventura Outdoor
- **Tipo:** Personalizado
- **Imagen:** Camping en la naturaleza (photo-1478131143081)
- **Título:** "Aventura Outdoor"
- **Descripción:** "20% OFF en camping, senderismo y escalada"
- **Ideal para:** Actividades al aire libre

#### 13. **DEC-MOUNT01** - Deportes de Montaña
- **Tipo:** Personalizado
- **Imagen:** Persona en montaña (photo-1486218119243)
- **Título:** "Deportes de Montaña"
- **Descripción:** "18% OFF en equipamiento para trekking y montañismo"
- **Ideal para:** Nicho específico de deportes

#### 14. **DEC-STD001** - Cupón Estándar
- **Tipo:** Estándar (sin personalizar)
- **Imagen:** Usa imagen de marca Decathlon
- **Título:** "Decathlon"
- **Descripción:** Usa descripción de marca (15% OFF)
- **Ideal para:** Cupones generales diarios

---

## 📊 Resumen por Tipo

| Tipo | Cantidad | Descripción |
|------|----------|-------------|
| **Personalizados** | 12 | Con imagen, título y descripción propia |
| **Estándar** | 2 | Usan datos de la marca |
| **Con vencimiento** | 6 | Tienen fecha de expiración |
| **VIP** | 2 | Cupones exclusivos premium |
| **Estacionales** | 1 | Promoción de temporada |
| **Por producto** | 5 | Para líneas específicas |

---

## 🚀 Cómo Usar

### Paso 1: Ejecutar el Script

En **Supabase SQL Editor**, ejecuta el archivo completo:

```sql
-- Todo el contenido de crear-cupones-ejemplo.sql
```

### Paso 2: Verificar Creación

El script incluye queries de verificación al final:

```sql
-- Ver todos los cupones creados
SELECT p.name, c.coupon_code, c.title...

-- Ver resumen por marca
SELECT p.name, COUNT(*)...
```

### Paso 3: Asignar a Usuario de Prueba

Para probar cómo se ven en el frontend:

```sql
-- Asignar 3 cupones diferentes al usuario de prueba
UPDATE coupons 
SET 
  is_assigned = true,
  user_id = 'TU_USER_ID_AQUI',
  assigned_at = NOW()
WHERE coupon_code IN ('NIKE-BF2024', 'MYP-PACK01', 'GAR-WATCH01');
```

---

## 🎨 Vista de Usuario

Cuando un usuario vea estos cupones en `/dashboard/partners`, verá:

### Cupones Personalizados
```
┌─────────────────────────────────────┐
│  [Imagen personalizada del cupón]  │
│  [Badge: Activo]                    │
│  Black Friday Running               │
├─────────────────────────────────────┤
│  30% OFF en toda la colección...   │
│                                     │
│  ┌─────────────────────────────┐  │
│  │   NIKE-BF2024               │  │
│  │   [Copiar]                  │  │
│  └─────────────────────────────┘  │
│  Expira: 15/02/2024                │
└─────────────────────────────────────┘
```

### Cupones Estándar
```
┌─────────────────────────────────────┐
│  [Imagen de la marca Nike]         │
│  [Badge: Activo]                    │
│  Nike                               │
├─────────────────────────────────────┤
│  15% de descuento en toda...       │
│                                     │
│  ┌─────────────────────────────┐  │
│  │   NIKE-STD001               │  │
│  │   [Copiar]                  │  │
│  └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## 💡 Casos de Uso

### 1. Promoción Urgente
**Usa:** NIKE-BF2024
- Vencimiento corto (30 días)
- Descuento alto (30%)
- Mensaje de urgencia en descripción

### 2. Lanzamiento de Producto
**Usa:** NIKE-PREM001
- Imagen específica del producto
- Título atractivo
- Sin vencimiento (hasta agotar stock)

### 3. Cupones Diarios
**Usa:** NIKE-STD001, DEC-STD001
- Sin personalización
- Renovables constantemente
- Bajo mantenimiento

### 4. Campaña VIP
**Usa:** NIKE-VIP001, MYP-VIP001
- Descuentos exclusivos
- Vencimiento limitado
- Solo para usuarios premium

### 5. Promoción Estacional
**Usa:** UA-SUMMER01
- Temática de temporada
- Vencimiento largo (90 días)
- Imagen relacionada

---

## 🔄 Gestión Post-Creación

### Ver Cupones Disponibles

```sql
SELECT 
  p.name,
  c.coupon_code,
  c.title,
  c.is_assigned,
  c.expires_at
FROM coupons c
JOIN partners p ON p.id = c.partner_id
WHERE c.is_assigned = false
ORDER BY p.name, c.created_at DESC;
```

### Asignar Cupón a Usuario

```sql
UPDATE coupons 
SET 
  is_assigned = true,
  user_id = 'user-uuid-aqui',
  assigned_at = NOW()
WHERE coupon_code = 'NIKE-BF2024'
AND is_assigned = false;
```

### Extender Vencimiento

```sql
UPDATE coupons
SET expires_at = NOW() + INTERVAL '60 days'
WHERE coupon_code = 'NIKE-VIP001';
```

### Eliminar Cupones de Ejemplo

```sql
DELETE FROM coupons 
WHERE coupon_code IN (
  'NIKE-BF2024', 'NIKE-PREM001', 'NIKE-STD001', 'NIKE-VIP001',
  'MYP-PACK01', 'MYP-NUT001', 'MYP-VIP001',
  'GAR-WATCH01', 'GAR-RUN001',
  'UA-SUMMER01', 'UA-TRAIN01',
  'DEC-OUT001', 'DEC-MOUNT01', 'DEC-STD001'
);
```

---

## 📝 Notas Importantes

1. **Códigos únicos:** Todos los códigos son únicos y no se repetirán
2. **Imágenes de Unsplash:** Gratis para uso comercial
3. **Vencimientos:** Algunos cupones tienen fecha de expiración automática
4. **Fallback:** Los cupones estándar usarán imagen de la marca
5. **Escalable:** Puedes crear más cupones usando el mismo patrón

---

## 🎯 Próximos Pasos

1. ✅ Ejecutar `crear-cupones-ejemplo.sql`
2. ✅ Verificar que se crearon correctamente
3. ✅ Asignar algunos cupones a tu usuario de prueba
4. ✅ Ver cómo se muestran en `/dashboard/partners`
5. ✅ Probar copiar códigos y marcar como usados

---

**¡14 Cupones de Ejemplo Listos para Probar! 🚀**
