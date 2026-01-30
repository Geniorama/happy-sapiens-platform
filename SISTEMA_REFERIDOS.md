# 🎁 Sistema de Referidos - Happy Sapiens

## 📋 Descripción

Sistema completo de códigos de referido que permite a los usuarios invitar amigos y trackear sus referencias.

---

## 🗄️ Estructura de Base de Datos

### Campos en la tabla `users`

```sql
referral_code TEXT UNIQUE           -- Código único del usuario (8 caracteres)
referred_by UUID                    -- ID del usuario que lo refirió
```

### Tabla `referral_stats`

Almacena estadísticas de referidos por usuario:

```sql
id UUID PRIMARY KEY
user_id UUID                        -- Usuario referidor
total_referrals INTEGER             -- Total de referidos
active_referrals INTEGER            -- Referidos con suscripción activa
total_earnings DECIMAL(10, 2)       -- Ganancias acumuladas (futuro)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

---

## 🚀 Setup

### 1. Ejecutar Migración SQL

En Supabase SQL Editor, ejecuta el archivo completo:

```bash
supabase-migration-referrals.sql
```

Este script:
- ✅ Agrega columnas `referral_code` y `referred_by` a `users`
- ✅ Crea función `generate_referral_code()` para códigos únicos
- ✅ Crea trigger para generar códigos automáticamente
- ✅ Genera códigos para usuarios existentes
- ✅ Crea tabla `referral_stats` para estadísticas
- ✅ Crea trigger para actualizar stats automáticamente
- ✅ Crea vista `user_referrals` para consultas

### 2. Verificar Migración

```sql
-- Ver usuarios con sus códigos
SELECT id, name, email, referral_code, referred_by 
FROM users 
LIMIT 10;

-- Ver estadísticas
SELECT * FROM referral_stats;
```

---

## 💡 Funcionalidades

### 1. Generación Automática de Códigos

Cuando se crea un usuario (sea por registro o pago), automáticamente se le asigna un código de referido único:

- **Formato:** 8 caracteres alfanuméricos
- **Caracteres:** A-Z, 2-9 (sin 0,O,1,I para evitar confusión)
- **Ejemplo:** `ABCD1234`, `XYZ98765`
- **Único:** Se verifica que no exista en la base de datos

### 2. Aplicar Código de Referido

#### En URL de Suscripción

Los usuarios pueden compartir un link con su código:

```
https://tuapp.com/subscribe?ref=ABCD1234
```

El formulario de suscripción captura automáticamente el código de la URL.

#### Manual en Formulario

El campo "Código de referido" es opcional y acepta:
- 8 caracteres
- Automáticamente en mayúsculas
- Validación visual al escribir

### 3. Perfil del Usuario

En `/dashboard/profile` el usuario ve:

#### Su Código de Referido
- Código visible en formato destacado
- Botón para copiar código
- Link de invitación completo
- Botón para copiar link
- Botón para compartir (usa Web Share API)

#### Estadísticas
- **Total referidos:** Cantidad de personas que usaron su código
- **Activos:** Referidos con suscripción activa

---

## 🔄 Flujo de Referidos

### Proceso Completo

1. **Usuario A recibe su código:** `ABCD1234` (generado automáticamente)
2. **Usuario A comparte:**
   - Link: `https://tuapp.com/subscribe?ref=ABCD1234`
   - O código: `ABCD1234`
3. **Usuario B visita el link:**
   - El código se autocompleta en el formulario
   - O ingresa el código manualmente
4. **Usuario B completa el pago:**
   - El código viaja en los `metadata` de MercadoPago
5. **Webhook procesa el pago:**
   - Busca el usuario con `referral_code = 'ABCD1234'`
   - Crea Usuario B con `referred_by = usuario_a_id`
   - El trigger actualiza automáticamente `referral_stats`

---

## 📊 Consultas Útiles

### Ver todos los referidos de un usuario

```sql
SELECT * FROM user_referrals
WHERE referrer_email = 'usuario@example.com';
```

### Ver estadísticas de un usuario

```sql
SELECT 
  u.name,
  u.email,
  u.referral_code,
  rs.total_referrals,
  rs.active_referrals
FROM users u
LEFT JOIN referral_stats rs ON rs.user_id = u.id
WHERE u.email = 'usuario@example.com';
```

### Top referidores

```sql
SELECT 
  u.name,
  u.email,
  u.referral_code,
  rs.total_referrals,
  rs.active_referrals
FROM users u
INNER JOIN referral_stats rs ON rs.user_id = u.id
ORDER BY rs.total_referrals DESC
LIMIT 10;
```

---

## 🎨 Componente UI

### `<ReferralCode />`

```tsx
<ReferralCode 
  referralCode="ABCD1234"
  referralStats={{
    total_referrals: 5,
    active_referrals: 3
  }}
/>
```

**Características:**
- 📋 Copiar código al portapapeles
- 🔗 Copiar link completo
- 📤 Compartir vía Web Share API (móviles)
- 📊 Estadísticas visuales
- ℹ️ Información sobre cómo funciona

---

## 🔮 Futuras Mejoras

1. **Sistema de Recompensas**
   - Cupones gratis por referidos
   - Descuentos en suscripción
   - Meses gratis

2. **Notificaciones**
   - Email cuando alguien usa tu código
   - Notificaciones push

3. **Dashboard de Admin**
   - Ver top referidores
   - Estadísticas globales
   - Gestión de recompensas

4. **Gamificación**
   - Badges por cantidad de referidos
   - Leaderboard público
   - Desafíos mensuales

---

## 📁 Archivos Relacionados

- `supabase-migration-referrals.sql` - Migración de base de datos
- `src/components/dashboard/referral-code.tsx` - Componente UI
- `src/app/dashboard/profile/page.tsx` - Página de perfil (incluye referidos)
- `src/components/subscription/subscription-form.tsx` - Formulario con código
- `src/app/api/mercadopago/create-preference/route.ts` - API de preferencia
- `src/app/api/mercadopago/webhook/route.ts` - Procesamiento de pagos

---

## ✅ Testing

### Probar el Sistema

1. **Crear usuario test:**
```sql
INSERT INTO users (name, email, password)
VALUES ('Usuario Test', 'test@example.com', 'hashed_password');
```

2. **Verificar código generado:**
```sql
SELECT referral_code FROM users WHERE email = 'test@example.com';
-- Resultado: ej. 'ABCD1234'
```

3. **Probar referido:**
- Visitar: `/subscribe?ref=ABCD1234`
- Completar registro
- Verificar en base de datos:

```sql
SELECT 
  u.name,
  u.email,
  u.referred_by,
  r.name as referrer_name,
  r.referral_code
FROM users u
LEFT JOIN users r ON r.id = u.referred_by
WHERE u.email = 'nuevo@example.com';
```

4. **Verificar estadísticas:**
```sql
SELECT * FROM referral_stats WHERE user_id = (
  SELECT id FROM users WHERE email = 'test@example.com'
);
-- Debería mostrar: total_referrals = 1, active_referrals = 1
```

---

## 🐛 Troubleshooting

### El código no se genera automáticamente
```sql
-- Verificar que el trigger existe
SELECT * FROM pg_trigger WHERE tgname = 'generate_referral_code_trigger';

-- Generar manualmente
UPDATE users 
SET referral_code = generate_referral_code() 
WHERE referral_code IS NULL;
```

### Las estadísticas no se actualizan
```sql
-- Verificar trigger
SELECT * FROM pg_trigger WHERE tgname = 'update_referral_stats_trigger';

-- Recalcular manualmente
INSERT INTO referral_stats (user_id, total_referrals, active_referrals)
SELECT 
  referred_by,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE subscription_status = 'active') as active
FROM users
WHERE referred_by IS NOT NULL
GROUP BY referred_by
ON CONFLICT (user_id) DO UPDATE SET
  total_referrals = EXCLUDED.total_referrals,
  active_referrals = EXCLUDED.active_referrals;
```

---

## 📞 Soporte

Si tienes problemas con el sistema de referidos, verifica:
1. ✅ Migración ejecutada correctamente
2. ✅ Triggers activos
3. ✅ Variables de entorno configuradas
4. ✅ RLS policies si las hay

---

**¡Sistema de Referidos Listo! 🎉**
