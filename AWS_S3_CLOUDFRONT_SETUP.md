# ☁️ Configuración de AWS S3 + CloudFront para Avatares

## 📋 Descripción

Sistema de almacenamiento de imágenes de perfil usando AWS S3 con CloudFront CDN para mejor rendimiento y distribución global.

## ✨ Ventajas de S3 + CloudFront

- ✅ **Escalabilidad**: Maneja millones de imágenes sin problemas
- ✅ **Performance**: CloudFront distribuye las imágenes globalmente
- ✅ **Cache**: Las imágenes se cachean en edge locations
- ✅ **Costo-efectivo**: Pago por uso, muy económico
- ✅ **Durabilidad**: 99.999999999% de durabilidad
- ✅ **Seguridad**: Control total de permisos con IAM

## 🚀 Paso 1: Crear Bucket S3

### 1.1 Ir a AWS Console

Ve a [AWS S3 Console](https://s3.console.aws.amazon.com/s3/)

### 1.2 Crear Bucket

1. Click en **"Create bucket"**
2. **Nombre del bucket**: `happy-sapiens-avatars` (debe ser único globalmente)
3. **Region**: Selecciona la más cercana a tus usuarios (ej: `us-east-1`)
4. **Block Public Access**: DESACTIVA todas las opciones (queremos que las imágenes sean públicas)
5. **Bucket Versioning**: Disabled (opcional)
6. Click en **"Create bucket"**

### 1.3 Configurar CORS

1. Ve al bucket creado
2. Click en **"Permissions"** tab
3. Scroll hasta **"Cross-origin resource sharing (CORS)"**
4. Click en **"Edit"** y pega:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"]
    }
]
```

5. Click en **"Save changes"**

### 1.4 Configurar Bucket Policy (Público)

1. En **"Permissions"** tab
2. Scroll hasta **"Bucket policy"**
3. Click en **"Edit"** y pega (reemplaza `NOMBRE-DE-TU-BUCKET`):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::NOMBRE-DE-TU-BUCKET/*"
        }
    ]
}
```

4. Click en **"Save changes"**

## 🔑 Paso 2: Crear Usuario IAM

### 2.1 Crear Usuario

1. Ve a [IAM Console](https://console.aws.amazon.com/iam/)
2. Click en **"Users"** → **"Create user"**
3. **Nombre**: `happy-sapiens-s3-user`
4. **Access type**: Selecciona **"Programmatic access"**
5. Click en **"Next"**

### 2.2 Asignar Permisos

1. Click en **"Attach policies directly"**
2. Busca y selecciona: **`AmazonS3FullAccess`**
   - Para producción, crea una policy más restrictiva (solo tu bucket)
3. Click en **"Next"** → **"Create user"**

### 2.3 Guardar Credenciales

⚠️ **MUY IMPORTANTE**: Guarda estas credenciales en un lugar seguro

```
Access Key ID: AKIAIOSFODNN7EXAMPLE
Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Estas van en tu `.env.local`

## 📡 Paso 3: Configurar CloudFront (Opcional pero Recomendado)

### 3.1 Crear Distribución

1. Ve a [CloudFront Console](https://console.aws.amazon.com/cloudfront/)
2. Click en **"Create distribution"**

### 3.2 Configuración de Origen

- **Origin domain**: Selecciona tu bucket S3 de la lista
- **Origin access**: Selecciona **"Public"**
- **Name**: Deja el default

### 3.3 Configuración de Comportamiento

- **Viewer protocol policy**: **"Redirect HTTP to HTTPS"**
- **Allowed HTTP methods**: **GET, HEAD, OPTIONS**
- **Cache policy**: **"CachingOptimized"**
- **Compress objects automatically**: **Yes**

### 3.4 Configuración de Distribución

- **Price class**: Selecciona según tu necesidad (Use all edge locations = mejor performance)
- **Alternate domain names (CNAMEs)**: Opcional, si quieres usar tu dominio
- **SSL Certificate**: Default CloudFront certificate (o custom si usas CNAME)

### 3.5 Crear

1. Click en **"Create distribution"**
2. Espera 5-15 minutos hasta que el estado sea **"Deployed"**
3. Copia el **Domain name** (ejemplo: `d1234abcd.cloudfront.net`)

## ⚙️ Paso 4: Configurar Variables de Entorno

Agrega a tu archivo `.env.local`:

```env
# AWS S3 para almacenamiento de imágenes
# Nota: Usamos el prefijo HS_ porque AWS_ está restringido en Netlify
HS_AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
HS_AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
HS_AWS_REGION="us-east-1"
HS_AWS_S3_BUCKET="happy-sapiens-avatars"
HS_AWS_CLOUDFRONT_DOMAIN="d1234abcd.cloudfront.net"  # Opcional
```

### Notas:
- **¿Por qué HS_?**: Netlify y otros servicios restringen variables que empiezan con `AWS_`
- Si NO usas CloudFront, deja `HS_AWS_CLOUDFRONT_DOMAIN` vacío o coméntalo
- Las imágenes se servirán directamente desde S3
- Con CloudFront, las imágenes se cachean globalmente (mejor rendimiento)

## 📁 Estructura de Archivos en S3

```
happy-sapiens-avatars/
  └── avatars/
      ├── [user-id-1]/
      │   └── avatar-1234567890.jpg
      ├── [user-id-2]/
      │   └── avatar-1234567891.png
      └── [user-id-3]/
          └── avatar-1234567892.gif
```

## 🔒 Seguridad: Policy IAM Restrictiva (Recomendado para Producción)

En lugar de `AmazonS3FullAccess`, crea una policy personalizada:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::happy-sapiens-avatars/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::happy-sapiens-avatars"
        }
    ]
}
```

## 💰 Estimación de Costos

### S3 (us-east-1)
- **Storage**: ~$0.023 por GB/mes
- **PUT requests**: $0.005 por 1,000 requests
- **GET requests**: $0.0004 por 1,000 requests

### CloudFront
- **Data transfer**: ~$0.085 por GB (primeros 10 TB)
- **Requests**: $0.0075 por 10,000 requests

**Ejemplo**: 10,000 usuarios, 1 imagen cada uno (500KB promedio)
- Storage: 5 GB = ~$0.12/mes
- Transfer: 100 GB/mes = ~$8.50/mes
- **Total: ~$8.62/mes**

## 🧪 Probar la Configuración

1. Reinicia tu servidor de desarrollo
2. Ve a `/dashboard/profile`
3. Sube una imagen de prueba
4. Verifica que la URL sea de CloudFront o S3
5. Abre la URL en una pestaña nueva para verificar que sea pública

### URLs Esperadas:

**Con CloudFront:**
```
https://d1234abcd.cloudfront.net/avatars/user-id/avatar-1234567890.jpg
```

**Sin CloudFront (directo S3):**
```
https://happy-sapiens-avatars.s3.us-east-1.amazonaws.com/avatars/user-id/avatar-1234567890.jpg
```

## 🎯 Optimizaciones Adicionales (Opcionales)

### 1. Invalidación de Cache en CloudFront

Cuando un usuario sube una nueva imagen, puedes invalidar el cache:

```typescript
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront"

const invalidateCache = async (path: string) => {
  const client = new CloudFrontClient({ region: "us-east-1" })
  await client.send(new CreateInvalidationCommand({
    DistributionId: "TU_DISTRIBUTION_ID",
    InvalidationBatch: {
      Paths: { Quantity: 1, Items: [path] },
      CallerReference: Date.now().toString()
    }
  }))
}
```

### 2. Lifecycle Policy (Eliminar imágenes antiguas)

En S3, configura una Lifecycle rule para eliminar imágenes no utilizadas:

1. Ve al bucket → **"Management"** tab
2. **"Create lifecycle rule"**
3. Nombre: `delete-old-avatars`
4. **Rule scope**: Prefix = `avatars/`
5. **Lifecycle rule actions**: Delete previous versions after 30 days

### 3. Custom Domain con Route53

Si quieres usar `cdn.happysapiens.com` en lugar de CloudFront:

1. Crea un CNAME record en Route53
2. Configura SSL certificate en ACM (us-east-1)
3. Agrega el CNAME en CloudFront distribution

## 🐛 Troubleshooting

### Error: "Access Denied"
- Verifica que la Bucket Policy sea pública
- Verifica que Block Public Access esté desactivado
- Verifica las credenciales IAM

### Las imágenes no se ven
- Verifica CORS en el bucket
- Verifica que la URL sea correcta
- Abre la URL en modo incógnito

### Error: "InvalidAccessKeyId"
- Verifica las credenciales en `.env.local`
- Verifica que el usuario IAM exista
- Reinicia el servidor después de cambiar variables

## 📁 Archivos del Sistema

### Creados
```
src/lib/s3.ts - Cliente y funciones de S3
AWS_S3_CLOUDFRONT_SETUP.md - Esta documentación
```

### Modificados
```
src/app/dashboard/profile/actions.ts - Usa S3 en lugar de Supabase Storage
env.example - Agregadas variables de AWS
```

## ✅ Checklist de Configuración

- [ ] Bucket S3 creado
- [ ] CORS configurado en S3
- [ ] Bucket Policy pública configurada
- [ ] Usuario IAM creado con permisos
- [ ] Credenciales guardadas de forma segura
- [ ] CloudFront distribution creada (opcional)
- [ ] Variables en `.env.local` configuradas
- [ ] Servidor reiniciado
- [ ] Imagen de prueba subida exitosamente

¡El sistema con S3 + CloudFront está listo! ☁️✨
