# 📸 Funcionalidad de Carga de Avatar

## 🎯 Descripción

Sistema completo para que los usuarios puedan subir, actualizar y eliminar su foto de perfil usando Supabase Storage.

## ✨ Características

- ✅ Subir imagen de perfil (JPG, PNG, GIF)
- ✅ Preview en tiempo real
- ✅ Validación de tamaño (máximo 2MB)
- ✅ Validación de tipo de archivo
- ✅ Eliminar foto de perfil
- ✅ Overlay hover con botón de cámara
- ✅ Loading states
- ✅ Mensajes de éxito/error
- ✅ Almacenamiento en Supabase Storage
- ✅ URLs públicas para las imágenes

## 🚀 Instalación

### 1️⃣ Configurar AWS S3 + CloudFront

Sigue la guía completa en:

```bash
AWS_S3_CLOUDFRONT_SETUP.md
```

Pasos resumidos:
1. ✅ Crear bucket S3
2. ✅ Configurar CORS y permisos públicos
3. ✅ Crear usuario IAM con acceso a S3
4. ✅ (Opcional) Configurar CloudFront para CDN
5. ✅ Agregar credenciales a `.env.local`

### 2️⃣ Verificar Variables de Entorno

Asegúrate de tener en tu `.env.local`:

```env
AWS_ACCESS_KEY_ID=tu-access-key-id
AWS_SECRET_ACCESS_KEY=tu-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=happy-sapiens-avatars
AWS_CLOUDFRONT_DOMAIN=tu-distribucion.cloudfront.net  # Opcional
```

### 3️⃣ ¡Listo!

Ya puedes ir a `/dashboard/profile` y subir tu foto de perfil.

## 🏗️ Estructura de Archivos

### S3 Storage
```
happy-sapiens-avatars/
  └── avatars/
      ├── [user-id]/
      │   └── avatar-1234567890.jpg
```

Cada usuario tiene su propia carpeta identificada por su UUID.

### Base de Datos
El campo `image` en la tabla `users` se actualiza con la URL de CloudFront o S3:

**Con CloudFront:**
```
https://d1234abcd.cloudfront.net/avatars/[user-id]/avatar-1234567890.jpg
```

**Sin CloudFront:**
```
https://happy-sapiens-avatars.s3.us-east-1.amazonaws.com/avatars/[user-id]/avatar-1234567890.jpg
```

## 🎨 Componentes Creados

### 1. `src/components/dashboard/avatar-upload.tsx`
Componente principal que maneja:
- Upload de imagen con preview
- Validaciones de tamaño y tipo
- Eliminación de imagen
- Estados de carga
- Feedback visual

### 2. `src/lib/s3.ts`
Cliente y utilidades de AWS S3:
- `uploadToS3()` - Sube archivo a S3
- `deleteFromS3()` - Elimina archivo de S3
- `getPublicUrl()` - Obtiene URL pública (CloudFront o S3)
- `extractKeyFromUrl()` - Extrae la key de una URL

### 3. `src/app/dashboard/profile/actions.ts`
Server actions añadidas:
- `uploadAvatar()` - Sube imagen a S3 y actualiza BD
- `deleteAvatar()` - Elimina imagen de S3 y BD

### 3. `src/app/dashboard/profile/page.tsx`
Página actualizada con el nuevo componente de avatar.

## 🔒 Seguridad

### AWS IAM y S3

1. **Ver avatares**: Público (Bucket Policy permite GET a todos)
2. **Subir/Actualizar/Eliminar**: Solo el servidor backend con credenciales IAM
3. **Usuarios**: No tienen acceso directo a S3, solo a través de la API

### Ventajas de Seguridad:
- ✅ Credenciales AWS solo en el servidor (nunca en el cliente)
- ✅ Usuarios autenticados en la app, pero sin acceso directo a S3
- ✅ Control total con IAM policies
- ✅ Las imágenes son públicas pero solo el servidor puede modificarlas

## 📏 Validaciones

### Cliente (UI)
- ✅ Solo archivos de imagen (image/*)
- ✅ Tamaño máximo: 2MB
- ✅ Formatos: JPG, PNG, GIF

### Servidor
- ✅ Autenticación requerida
- ✅ Storage policies de Supabase
- ✅ Archivo único por usuario (se sobrescribe)

## 🎯 Flujo de Usuario

1. Usuario hace clic en el avatar o botón "Subir nueva"
2. Selecciona una imagen de su dispositivo
3. Se valida el archivo (tipo y tamaño)
4. Se muestra preview inmediato
5. Se sube a Supabase Storage
6. Se actualiza la URL en la base de datos
7. Se muestra mensaje de éxito
8. El avatar se actualiza en toda la app

## 🎨 Diseño

### Estados Visuales
- **Hover**: Overlay negro semi-transparente con icono de cámara
- **Cargando**: Spinner animado
- **Éxito**: Mensaje verde con borde
- **Error**: Mensaje rojo con borde

### Iconos Utilizados
- 📷 `Camera` - Overlay del avatar
- ⬆️ `Upload` - Botón subir
- ❌ `X` - Botón eliminar
- ⚙️ `Loader2` - Estado de carga

### Colores
- **Botón subir**: Primary/10 (verde oliva claro)
- **Botón eliminar**: Red/50 (rojo suave)
- **Overlay**: Black/50 (semi-transparente)

## 🔧 Personalización

### Cambiar tamaño máximo de archivo
```typescript
// En avatar-upload.tsx
if (file.size > 5 * 1024 * 1024) { // 5MB en lugar de 2MB
  setMessage({ type: "error", text: "La imagen debe ser menor a 5MB" })
  return
}
```

### Cambiar formatos aceptados
```typescript
// En avatar-upload.tsx
<input
  accept="image/jpeg,image/png"  // Solo JPG y PNG
  // ...
/>
```

### Cambiar carpeta de storage
```typescript
// En actions.ts
const fileName = `profiles/${session.user.id}/avatar.${fileExt}`
// En lugar de:
const fileName = `${session.user.id}/avatar.${fileExt}`
```

## 🐛 Troubleshooting

### Error: "No se puede subir el archivo"
- Verifica que el bucket `avatars` exista
- Verifica las políticas RLS de Storage
- Verifica `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`

### Error: "Image is too large"
- El archivo excede 2MB
- Comprime la imagen antes de subirla

### La imagen no se muestra
- Verifica que el bucket sea público
- Verifica la URL en la tabla `users`
- Verifica que no haya errores de CORS

## 📁 Archivos del Módulo

### Nuevos
```
src/lib/s3.ts
src/components/dashboard/avatar-upload.tsx
AWS_S3_CLOUDFRONT_SETUP.md
AVATAR_UPLOAD.md (actualizado)
```

### Modificados
```
src/app/dashboard/profile/actions.ts (añadidas funciones)
src/app/dashboard/profile/page.tsx (integrado componente)
```

## 🎯 Próximas Mejoras (Opcionales)

- [ ] Recorte de imagen antes de subir
- [ ] Múltiples tamaños (thumbnail, medium, large)
- [ ] Optimización automática de imágenes
- [ ] Soporte para drag & drop
- [ ] Progress bar durante la carga
- [ ] Guardar metadata (tamaño, dimensiones, etc.)

¡La funcionalidad de avatar está lista! 📸✨
