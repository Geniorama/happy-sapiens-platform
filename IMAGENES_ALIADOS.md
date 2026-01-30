# 🖼️ Imágenes de Portada para Aliados

## 📋 Descripción

Sistema de imágenes de portada humanizadas para las tarjetas de marcas aliadas. Las imágenes muestran personas reales usando productos o realizando actividades relacionadas con cada marca.

---

## 🎨 Diseño de las Tarjetas

### Estructura Visual

```
┌─────────────────────────────────────┐
│                                     │
│   [Imagen de Portada - 800x400]    │
│   (Persona usando el producto)     │
│                                     │
│   ┌──────┐  ← Logo (opcional)      │
│   │ LOGO │                          │
│   └──────┘                          │
├─────────────────────────────────────┤
│  🏷️ Categoría                       │
│                                     │
│  Nombre de la Marca                │
│  Descripción breve...              │
│                                     │
│  ┌─────────────────────────────┐  │
│  │      25% OFF                │  │
│  │  Descripción del descuento  │  │
│  └─────────────────────────────┘  │
│                                     │
│  [Obtener Cupón]                   │
│  [Visitar] [Ver Términos]          │
└─────────────────────────────────────┘
```

### Características Visuales

- **Imagen de portada:** 800x400px (ratio 2:1)
- **Overlay gradiente:** De negro/50% a transparente
- **Logo sobre imagen:** Badge blanco con sombra en esquina inferior izquierda
- **Bordes redondeados:** 16px (rounded-2xl)
- **Sin imagen:** Gradiente de marca con icono de regalo

---

## 🗄️ Base de Datos

### Campo Agregado

```sql
ALTER TABLE partners ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
```

### Imágenes por Marca

| Marca | Imagen | Descripción |
|-------|--------|-------------|
| **Nike** | `photo-1556906781-9a412961c28c` | Persona corriendo con ropa deportiva |
| **Under Armour** | `photo-1541534741688-6078c6bfb5c5` | Atleta entrenando |
| **MyProtein** | `photo-1593095948071-474c5cc2989d` | Persona preparando batido de proteína |
| **Garmin** | `photo-1551958219-acbc608c6377` | Runner con reloj deportivo |
| **Decathlon** | `photo-1571902943202-507ec2618e8f` | Persona en actividad outdoor |

Todas las imágenes son de **Unsplash** (gratis para uso comercial).

---

## 🚀 Setup

### Opción 1: Migración para Base de Datos Existente

Si ya tienes la tabla `partners` creada, ejecuta:

```bash
supabase-migration-partners-cover-images.sql
```

Este script:
1. ✅ Agrega la columna `cover_image_url`
2. ✅ Actualiza las 5 marcas con imágenes humanizadas
3. ✅ Verifica los cambios

### Opción 2: Nueva Instalación

Si estás creando la tabla desde cero, usa:

```bash
supabase-schema-aliados.sql
```

Este script ya incluye el campo `cover_image_url` y las imágenes en los INSERT.

---

## 🎨 Personalización de Imágenes

### Cambiar Imágenes

Para cambiar la imagen de una marca:

```sql
UPDATE partners 
SET cover_image_url = 'https://images.unsplash.com/photo-XXXXXX?w=800&h=400&fit=crop'
WHERE name = 'Nombre de la Marca';
```

### Buscar Imágenes en Unsplash

1. Visita [Unsplash.com](https://unsplash.com)
2. Busca términos como:
   - "fitness person"
   - "running athlete"
   - "gym workout"
   - "healthy lifestyle"
   - "sports training"
3. Copia el ID de la foto (ej: `photo-1234567890abc`)
4. Construye la URL:
   ```
   https://images.unsplash.com/photo-XXXXXX?w=800&h=400&fit=crop
   ```

### Parámetros de URL

- `w=800` - Ancho en píxeles
- `h=400` - Alto en píxeles
- `fit=crop` - Recorta para ajustar exactamente

### Usar Imágenes Propias

Si prefieres usar tus propias imágenes:

1. **Sube a S3/CloudFront** (como los avatares)
2. **Usa URLs directas** de tu CDN
3. **Dimensiones recomendadas:** 1600x800px (2x para retina)

```sql
UPDATE partners 
SET cover_image_url = 'https://tu-cdn.com/images/nike-cover.jpg'
WHERE name = 'Nike';
```

---

## 💡 Mejores Prácticas

### Selección de Imágenes

✅ **Buenas imágenes:**
- Personas reales usando el producto
- Emociones positivas (sonrisas, satisfacción)
- Buena iluminación natural
- Fondo no muy ocupado
- Alta resolución

❌ **Evitar:**
- Solo productos sin personas
- Imágenes muy oscuras
- Demasiado texto en la imagen
- Baja calidad o pixeladas
- Imágenes genéricas de stock

### Optimización

1. **Tamaño:** Usa parámetros `w` y `h` para servir solo el tamaño necesario
2. **Formato:** Unsplash sirve WebP automáticamente en navegadores compatibles
3. **Lazy loading:** Next.js lo hace automáticamente con `<img>`
4. **Caché:** Las imágenes de Unsplash tienen caché de CDN

### Accesibilidad

- Siempre incluye `alt` descriptivo
- El texto sobre la imagen tiene overlay para contraste
- Funciona sin imagen (fallback a gradiente)

---

## 🔄 Fallback sin Imagen

Si `cover_image_url` es `NULL`, se muestra:

```tsx
<div className="w-full h-48 bg-gradient-to-br from-primary/10 to-secondary/20">
  <Gift icon />
</div>
```

Un gradiente suave con el icono de regalo.

---

## 📊 Consultas Útiles

### Ver todas las imágenes

```sql
SELECT name, cover_image_url
FROM partners
ORDER BY name;
```

### Marcas sin imagen

```sql
SELECT name, category
FROM partners
WHERE cover_image_url IS NULL;
```

### Actualizar múltiples marcas

```sql
UPDATE partners
SET cover_image_url = CASE name
  WHEN 'Nike' THEN 'https://images.unsplash.com/photo-...'
  WHEN 'Adidas' THEN 'https://images.unsplash.com/photo-...'
  ELSE cover_image_url
END;
```

---

## 🎯 Ejemplos de Búsqueda en Unsplash

### Por Categoría

**Deportes:**
- "running person"
- "gym workout"
- "fitness training"
- "sports athlete"

**Nutrición:**
- "healthy smoothie person"
- "protein shake"
- "meal prep"
- "nutrition lifestyle"

**Tecnología:**
- "smartwatch fitness"
- "wearable technology"
- "fitness tracker"
- "sports tech"

**Outdoor:**
- "hiking person"
- "outdoor adventure"
- "camping lifestyle"
- "nature sports"

---

## 🔮 Futuras Mejoras

1. **Múltiples imágenes:** Carrusel de 3-5 imágenes por marca
2. **Imágenes dinámicas:** Cambiar según temporada
3. **Video covers:** Videos cortos en loop
4. **Imágenes por región:** Diferentes imágenes según país
5. **A/B Testing:** Probar qué imágenes convierten mejor

---

## 📁 Archivos Relacionados

- `supabase-migration-partners-cover-images.sql` - Migración para agregar imágenes
- `supabase-schema-aliados.sql` - Schema completo (incluye cover_image_url)
- `src/components/dashboard/partner-card.tsx` - Componente de tarjeta
- `src/app/dashboard/partners/page.tsx` - Página de aliados

---

## ✅ Checklist de Implementación

- [x] Agregar columna `cover_image_url` a la tabla
- [x] Actualizar componente `PartnerCard` para mostrar imágenes
- [x] Agregar overlay gradiente para contraste
- [x] Posicionar logo sobre la imagen
- [x] Implementar fallback sin imagen
- [x] Actualizar schema SQL con imágenes
- [x] Crear migración para bases existentes
- [x] Documentar proceso de personalización

---

## 🐛 Troubleshooting

### Las imágenes no cargan

1. **Verifica la URL:**
```sql
SELECT name, cover_image_url FROM partners;
```

2. **Prueba la URL en el navegador**

3. **Verifica CORS:** Unsplash permite CORS, pero si usas tu CDN verifica la configuración

### Imágenes muy grandes/lentas

Ajusta los parámetros de URL:
```
?w=800&h=400&fit=crop&q=80
```

El parámetro `q` controla la calidad (1-100).

### Overlay muy oscuro/claro

Ajusta en `partner-card.tsx`:

```tsx
<div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
```

Cambia los valores `/50` y `/20` según necesites.

---

**¡Tarjetas de Aliados con Imágenes Humanizadas Listas! 🎨**
