# Módulo: Recordatorios de citas

Sistema configurable de recordatorios por email para citas con coaches. El administrador define
las reglas (cuándo se disparan y qué dicen) desde el panel admin, y un cron externo
(**cron-job.org**) llama al endpoint cada pocos minutos para procesar las reglas.

## Arquitectura

```
cron-job.org (cada 15 min)
        │
        ▼  POST /api/cron/appointment-reminders
           header: x-cron-secret: <WEBHOOK_TRIGGER_SECRET>
        │
        ▼
  Lee appointment_reminder_rules (activas)
        │
        ▼  Por cada cita scheduled próxima × cada regla:
           si hoursUntil ∈ [hoursBefore ± windowMinutes/2]
           y no hay row en appointment_reminder_sent → enviar
        │
        ▼
  sendReminderFromRule()  →  Zeptomail (usuario y/o coach)
  + INSERT en appointment_reminder_sent (idempotencia)
```

## Modelo de datos

### `appointment_reminder_rules`
Configuración del admin. Cada fila es una regla independiente.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid PK | |
| `key` | varchar(100) UNIQUE | Slug interno (ej. `reminder-24h`) |
| `name` | text | Nombre legible (ej. "Recordatorio 24 horas antes") |
| `hours_before` | decimal(6,2) | Cuántas horas antes de la cita disparar |
| `window_minutes` | int | Tolerancia total (± mitad alrededor del momento). Default 30 |
| `is_active` | bool | Para desactivar sin borrar |
| `send_to_user` / `send_to_coach` | bool | A qué partes enviar |
| `subject_user` / `body_user` | text | Asunto y cuerpo al cliente |
| `subject_coach` / `body_coach` | text | Asunto y cuerpo al coach |

### `appointment_reminder_sent`
Historial de envíos. Garantiza que cada regla se envía **una sola vez** por cita.

| Columna | Tipo |
|---|---|
| `id` | uuid PK |
| `appointment_id` | FK → appointments |
| `rule_id` | FK → appointment_reminder_rules |
| `sent_at` | timestamp |
| UNIQUE(appointment_id, rule_id) | |

## Reglas semilla

La migración `20260511120000_appointment_reminder_rules` crea 2 reglas activas por defecto que
reproducen el comportamiento anterior:

- `reminder-24h` — 24h antes, ventana 60 min
- `reminder-1h` — 1h antes, ventana 60 min

Puedes editarlas o desactivarlas desde `/admin/reminders`.

## Placeholders disponibles

En asunto y cuerpo, el sistema reemplaza automáticamente:

| Placeholder | Valor |
|---|---|
| `{coachName}` | Nombre del coach |
| `{userName}` | Nombre del usuario |
| `{date}` | Fecha en español (ej. "lunes 12 de mayo de 2026") |
| `{time}` | Hora en formato 12h (ej. "10:30 AM") |
| `{duration}` | Duración en minutos |
| `{meetingLink}` | URL de Google Meet (vacío si no hay) |
| `{reason}` | Motivo de consulta |

El **cuerpo se renderiza dentro de la plantilla HTML estándar** (logo, datos de la cita, botón
de Meet, footer). El admin solo escribe el texto introductorio.

## Configuración de cron-job.org

1. Entra a https://cron-job.org y crea una cuenta (free tier permite cadencias finas).
2. Crea un nuevo cronjob con estos parámetros:

| Campo | Valor |
|---|---|
| **URL** | `https://<tu-dominio>/api/cron/appointment-reminders` |
| **Schedule** | Cada **15 minutos** (recomendado) |
| **Method** | `POST` |
| **Headers** | `x-cron-secret: <valor de WEBHOOK_TRIGGER_SECRET>` |
| **Timezone** | El que sea — el cron es idempotente |
| **Save responses** | Habilítalo en los primeros días para verificar |

3. Guarda y verifica que el primer disparo devuelva un JSON tipo:
   ```json
   { "ok": true, "checked": 12, "rules": 2, "sent": 0, "logs": [] }
   ```

### Por qué cada 15 minutos

La ventana de cada regla (`window_minutes`) define cuánta tolerancia tiene. Si el cron corre
cada 15 min y la ventana es 60 min, hay 4 oportunidades de disparar dentro del rango —
sobradas para no perder citas. Si cambias a cadencia más baja (ej. cada 30 min), aumenta
`window_minutes` proporcionalmente para no perder citas en los bordes.

## Variables de entorno requeridas

```bash
WEBHOOK_TRIGGER_SECRET=<un secreto largo aleatorio>
```

Configurada en el `.env` del servidor EC2 (mismo lugar donde están `DATABASE_URL`,
`NEXTAUTH_SECRET`, etc.). Si necesitas verificarla por SSH:

```bash
grep WEBHOOK_TRIGGER_SECRET /ruta/a/.env
# o, si el proceso ya está corriendo
ps eww <PID> | grep WEBHOOK_TRIGGER_SECRET
```

Reusa la misma variable que ya emplea el endpoint de reactivación de suscripciones
(`/api/cron/reactivate-subscriptions`) — no hace falta generar otra.

## Manejo de zona horaria

Las citas se almacenan como `@db.Date` + `@db.Time` (sin TZ) en Postgres. La convención del
proyecto es tratar siempre esos valores como **wall-clock de Colombia (UTC-5)**, sin importar
el TZ del SO del servidor donde corra Next.js.

El helper `combineAppointmentDateTime()` en `src/lib/timezone.ts` hace esa conversión. El cron
lo usa para calcular el momento real de cada cita y compararlo contra `new Date()`. Así, aunque
el EC2 esté en UTC o en `America/Bogota`, el cálculo de `hoursUntil` siempre es correcto.

Si en el futuro hay usuarios fuera de Colombia, habría que reconsiderar este diseño (almacenar
TIMESTAMPTZ o un campo de TZ por cita).

## Endpoint manual (debugging)

Puedes disparar el endpoint a mano con curl para verificar:

```bash
curl -X POST https://<tu-dominio>/api/cron/appointment-reminders \
  -H "x-cron-secret: <WEBHOOK_TRIGGER_SECRET>"
```

Respuesta:
- `checked` — número de citas evaluadas
- `rules` — número de reglas activas consideradas
- `sent` — número de correos enviados en esta corrida
- `logs` — errores por regla/cita si los hubo

## Archivos relevantes

- `prisma/migrations/20260511120000_appointment_reminder_rules/` — migración
- `prisma/schema.prisma` — modelos `AppointmentReminderRule` y `AppointmentReminderSent`
- `src/app/api/cron/appointment-reminders/route.ts` — cron endpoint
- `src/lib/appointment-emails.ts` — `sendReminderFromRule()` + placeholders
- `src/app/admin/reminders/` — página y server actions del admin
- `src/components/admin/reminders-manager.tsx` — UI del CRUD
