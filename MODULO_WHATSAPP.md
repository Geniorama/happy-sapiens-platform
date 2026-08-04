# Módulo WhatsApp — conversaciones, tickets y avisos

Lectura desde el panel de administración de lo que produce el agente de WhatsApp
(n8n), más los avisos por correo al equipo.

## De dónde salen los datos

El agente corre en **n8n** y guarda todo en un **Supabase propio**, distinto de la
base de la plataforma (PostgreSQL en RDS + Prisma). La plataforma solo **lee** ese
Supabase; la única escritura es el estado de los tickets.

Tablas que se usan:

| Tabla | Para qué |
|---|---|
| `users` | Contacto de WhatsApp: teléfono, nombre, etapa del journey |
| `messages` | Registro curado: fecha, rol, sub-agente que respondió |
| `n8n_chat_histories` | Buffer de memoria de LangChain (respaldo) |
| `tickets` | Escalaciones que abre el agente cuando no puede resolver |

`conversations` y `events` existen pero están vacías, y `conversation_id` siempre
viene en `null`. El vínculo ticket ↔ conversación se hace por el **teléfono**.

### Dos particularidades de los datos

Ambas están resueltas en código, pero conviene conocerlas:

1. **n8n escribe la pregunta y la respuesta con el mismo `created_at`.** Ordenar
   solo por fecha deja la respuesta antes de la pregunta. Se desempata poniendo
   primero el turno del cliente (`compareMessages`).
2. **En `n8n_chat_histories`, la mitad de los turnos `ai` no son mensajes** sino la
   salida del router en JSON (`intent`, `confidence`, `reasoning`). Se detectan
   porque el contenido es un objeto JSON y se ocultan del hilo.

Además, algunas conversaciones no quedaron registradas en `messages` (hueco del
flujo de n8n). Para esas se cae al buffer crudo y la interfaz lo advierte.

## Pantallas

### `/admin/conversaciones` (solo lectura)

Lista con búsqueda por nombre, teléfono o texto, y el hilo en formato chat.
Filtro por sub-agente (Descubrimiento, Ventas, Soporte, Escalado) derivado de los
datos, no de una lista fija. Con el filtro activo el hilo muestra las respuestas
de ese agente **más el mensaje del cliente que precede a cada una**.

Los contactos se cruzan con los usuarios de la plataforma comparando los
**últimos 10 dígitos** del teléfono, que absorbe los formatos `+57…` y sin
indicativo de ambos lados.

### `/admin/tickets` (gestión)

Estado, asignación a un admin y notas de resolución. Cada cambio queda en
`system_logs` con su autor, porque los tickets viven fuera de nuestra base.

| Estado | Significado | ¿Sella `resolved_at`? |
|---|---|---|
| `open` | Pendiente de atender (lo crea así n8n) | No |
| `in_progress` | Alguien lo está atendiendo | No |
| `resolved` | Se atendió y se resolvió | **Sí** |
| `closed` | Se saca de la bandeja **sin** resolver: duplicado, falsa alarma, ya no aplica | No |

`closed` se distingue de `resolved` a propósito: mezclarlos haría que las
escalaciones descartadas cuenten como atendidas. Por eso solo `resolved` sella
`resolved_at`; el momento del cierre queda en `updated_at`. Un ticket que se
reabre vuelve a tener `resolved_at` vacío, así la fecha nunca contradice al
estado.

Ambos estados finales sacan el ticket del contador de escalaciones sin resolver
que se ve en Conversaciones.

## Avisos por correo

| Cuándo | A quién | Disparado por |
|---|---|---|
| Se abre una escalación | Todos los admin | Cron (ver abajo) |
| Se asigna un ticket | Solo la persona asignada | Al guardar en el panel |

Los destinatarios de los avisos a "todos los admin" son los usuarios con rol
`admin`, salvo que se defina `ADMIN_NOTIFICATION_EMAILS`. Ver `MODULO_ANALYTICS.md`
para el resto de notificaciones del sistema.

### Por qué los tickets nuevos necesitan un cron

Los tickets los crea n8n **directo en Supabase**: no pasa por la plataforma, así
que no hay forma de enterarse en el momento. El endpoint
`POST /api/cron/whatsapp-tickets` revisa periódicamente si hay escalaciones
nuevas y avisa.

**Idempotencia:** no se toca la tabla de Supabase (es del agente). El registro de
lo ya avisado va en `system_logs` con `action = 'cron.ticket.notified'` y
`entity_id` = id del ticket. Si el cron corre dos veces seguidas, el segundo no
reenvía nada. Un ticket cuyo correo falló no se marca, así que se reintenta en la
corrida siguiente.

### Configurar en cron-job.org

Mismo patrón que los recordatorios de citas (ver `MODULO_RECORDATORIOS.md`):

- **URL:** `https://<dominio>/api/cron/whatsapp-tickets`
- **Método:** `POST`
- **Cabecera:** `x-cron-secret: <WEBHOOK_TRIGGER_SECRET>`
- **Frecuencia sugerida:** cada 15 minutos

La ventana de búsqueda es de 48 horas, bastante más amplia que la frecuencia,
para que una corrida fallida no deje escalaciones sin avisar. Para arrastrar
tickets viejos en la primera corrida se puede subir `WHATSAPP_TICKETS_LOOKBACK_HOURS`
una sola vez y devolverlo después a su valor por defecto.

## Variables de entorno

```bash
SUPABASE_URL="https://xxxxxxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."   # service_role, NO la anon
WEBHOOK_TRIGGER_SECRET="..."      # compartido con los demás crons
# Opcionales
ADMIN_NOTIFICATION_EMAILS=""              # buzón compartido en vez de los admin
WHATSAPP_TICKETS_LOOKBACK_HOURS="48"      # ampliar solo para la primera corrida
```

La `service_role` key **salta las políticas RLS**. Por eso `src/lib/supabase.ts`
es estrictamente de servidor, sin prefijo `NEXT_PUBLIC_`, y los tipos y helpers de
presentación viven en módulos `*-shared.ts` aparte: los visores son componentes
cliente y de otro modo arrastrarían Prisma y esa llave al bundle del navegador.

Sin las variables de Supabase, ambas páginas muestran un aviso de configuración
faltante en vez de fallar.

## Archivos

```
src/lib/supabase.ts                      # cliente PostgREST (SELECT + PATCH)
src/lib/whatsapp-conversations.ts        # datos de conversaciones (servidor)
src/lib/whatsapp-conversations-shared.ts # tipos + formatPhone (cliente)
src/lib/whatsapp-tickets.ts              # datos de tickets (servidor)
src/lib/whatsapp-tickets-shared.ts       # tipos + etiquetas (cliente)
src/lib/admin-notifications.ts           # plantilla y avisos por correo
src/lib/format-date-co.ts                # fechas deterministas (ver nota abajo)
src/app/admin/conversaciones/            # página + server action
src/app/admin/tickets/                   # página + server action
src/app/api/cron/whatsapp-tickets/       # cron de escalaciones nuevas
src/components/admin/conversations-viewer.tsx
src/components/admin/tickets-manager.tsx
```

**Sobre `format-date-co.ts`:** no usa `Intl`/`toLocaleString` a propósito. Con el
mismo locale, Node y el navegador producen texto distinto (el mes abreviado lleva
punto en uno y no en otro; el separador antes de «a. m.» es un espacio angosto en
uno y normal en otro). Como el servidor renderiza el HTML que después hidrata el
navegador, esa diferencia rompe la hidratación de React. Colombia no observa DST,
así que alcanza con restar el offset fijo y leer los componentes en UTC.
