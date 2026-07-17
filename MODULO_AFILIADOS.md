# 💸 Módulo de Afiliados

Perfil de usuario que recomienda la plataforma y gana recompensas **en COP** por
cada referido que se suscribe. Tiene su propio panel con estadísticas y saldo
disponible.

## 🎯 Concepto

- Rol interno: **`afiliado`** (área `/afiliado`, protegida por rol).
- El afiliado **no necesita suscripción** para acceder a su panel (igual que coach/admin).
- Reutiliza el sistema de referidos existente: cada usuario tiene un `referralCode`
  único (`HSP-XXXXXX`) y comparte `/subscribe?ref=CODE`.
- **A diferencia de un usuario normal** (que acumula puntos de gamificación), el
  afiliado acumula un **saldo monetario en COP**.

## 💰 Cómo se gana la recompensa

- Se abona cuando un **referido paga/activa su suscripción** (mismo momento en que
  el webhook de MercadoPago crea la cuenta del referido).
- Monto = **porcentaje del precio realmente cobrado**, redondeado al peso.
- El porcentaje se edita desde el **panel de admin** (`/admin/afiliados` → "Recompensa
  por referido") y se guarda en la tabla `affiliate_config`. Prioridad de lectura:
  **config en BD → variable de entorno `AFFILIATE_REWARD_PERCENT` → 15**. Aplica a las
  recompensas nuevas; las ya registradas conservan el % con el que se calcularon.
- Es **one-time por referido** (no comisión recurrente mensual). Idempotente: la
  fila se llavea por `referred_user_id` (unique), de modo que re-entregas del
  webhook no duplican la recompensa.

> Solo se abona recompensa monetaria si el **referidor tiene rol `afiliado`**. Los
> usuarios normales siguen recibiendo únicamente puntos (`REFERRAL_SUBSCRIBED`).

## 🛒 Comisión por compras en la tienda (Shopify)

Además de las suscripciones, el afiliado gana comisión cuando un cliente **compra
en la tienda de Shopify** usando su código.

- **Cómo viaja el código:** el checkout de Shopify no se puede personalizar, así que
  el cliente escribe el código del afiliado (`HSP-XXXXXX`) en la **nota del pedido**.
  El webhook lo extrae de `order.note` y `order.note_attributes`.
- **Cuándo se abona:** al recibir el webhook `orders/paid` (`/api/webhooks/shopify`),
  para pedidos que **no** son de suscripción ni creados por la app.
- **Monto:** **porcentaje del subtotal de productos** del pedido (sin envío ni
  impuestos), redondeado al peso.
- **Es por cada compra** (no one-time). Idempotente: la fila se llavea por
  `shopify_order_id` (unique), así re-entregas del webhook no duplican la comisión.
- **Cancelaciones/reembolsos:** el webhook `orders/cancelled` marca la comisión de
  ese pedido como `cancelled` (deja de contar al saldo).
- **Porcentaje separado y configurable:** `/admin/afiliados` → "Comisión por compra
  en la tienda". Prioridad de lectura: **config en BD (`affiliate_config.shopify_reward_percent`)
  → variable de entorno `AFFILIATE_SHOPIFY_REWARD_PERCENT` → 10**.
- **Guardas:** el código debe corresponder a un usuario con rol `afiliado`, y el
  comprador no puede ser el propio afiliado (no auto-comisión).

Tabla `affiliate_order_rewards` (modelo `AffiliateOrderReward`): `affiliate_id`,
`shopify_order_id` (unique), `shopify_order_number`, `customer_email`, `code`,
`order_amount`, `amount`, `reward_percent`, `currency`, `status` (`granted|cancelled`),
`note`. El saldo del afiliado suma las comisiones `granted` de esta tabla más las
recompensas de suscripción.

## 💵 Redención / retiro del saldo

- El afiliado ve su **saldo disponible** y solicita un retiro desde su panel
  (monto + cómo quiere recibirlo: Nequi, cuenta bancaria, etc.).
- La solicitud queda **pendiente** y **reserva** los fondos:
  `disponible = ganado − retiros pagados − retiros pendientes`.
- El admin la resuelve en **/admin/afiliados**:
  - **Pagado** → se mantiene el descuento (el afiliado ya recibió el dinero por fuera).
  - **Rechazado** → libera los fondos (el saldo vuelve a estar disponible).
- El monto solicitado se valida contra el disponible dentro de una transacción,
  para que dos solicitudes concurrentes no reserven más de lo que hay.

Tabla `affiliate_payouts` (modelo `AffiliatePayout`): `affiliate_id`, `amount`,
`status` (`pending|paid|rejected`), `payout_method`, `admin_note`, `resolved_by_id`,
`resolved_at`.

## 🛠️ Admin

- **/admin/afiliados** — configuración del **porcentaje de recompensa**, KPIs
  globales, solicitudes de retiro pendientes (aprobar/rechazar con nota) y detalle
  por afiliado (referidos, ganado, pagado, pendiente, disponible). Enlace en el menú
  lateral del admin.
- **/admin/stats** — sección "Afiliados" con totales (afiliados, referidos,
  ganado, pagado, pendiente) y top 5 afiliados, con enlace a la gestión de retiros.
- Las resoluciones de retiro quedan registradas en `system_logs`
  (`affiliate.payout_paid` / `affiliate.payout_rejected`).

## 🗄️ Base de datos

Tabla `affiliate_rewards` (modelo `AffiliateReward` en `prisma/schema.prisma`):

| Columna            | Tipo          | Notas                                        |
| ------------------ | ------------- | -------------------------------------------- |
| `id`               | UUID          | PK                                           |
| `affiliate_id`     | UUID          | FK → `users.id` (el afiliado)                |
| `referred_user_id` | UUID **unique** | FK → `users.id` (el referido convertido)   |
| `amount`           | DECIMAL(12,2) | Recompensa en COP                            |
| `plan_price`       | DECIMAL(12,2) | Precio cobrado usado para el cálculo         |
| `plan_product`     | TEXT          | Slug del plan que contrató el referido       |
| `reward_percent`   | DECIMAL(5,2)  | % aplicado en el momento del abono           |
| `currency`         | TEXT          | `COP`                                        |
| `created_at`       | TIMESTAMPTZ   |                                              |

Migración: `prisma/migrations/20260710000000_affiliate_rewards/`. Aplicar con
`npm run db:migrate` (dev) o `npm run db:deploy` (producción).

## 🧩 Archivos

```
prisma/schema.prisma                              # modelos AffiliateReward + AffiliatePayout + AffiliateConfig
prisma/migrations/20260710000000_affiliate_rewards/migration.sql
prisma/migrations/20260710000001_affiliate_payouts/migration.sql
prisma/migrations/20260710000002_affiliate_config/migration.sql
prisma/migrations/20260710000003_affiliate_reward_plan_product/migration.sql
src/lib/affiliate.ts                              # rol, grant, summary, requestPayout, report, get/setRewardPercent
src/lib/subscription-provisioning.ts              # engancha grantAffiliateReward al activar suscripción
src/app/afiliado/layout.tsx                       # gate de rol
src/app/afiliado/page.tsx                         # panel: stats + saldo + retiro + recompensas
src/app/afiliado/actions.ts                       # getAffiliateData(), requestPayout()
src/components/afiliado/afiliado-layout.tsx       # shell/sidebar del área
src/components/afiliado/affiliate-share-card.tsx  # código + link (copiar/compartir)
src/components/afiliado/payout-request-card.tsx   # solicitar retiro + historial
src/app/admin/afiliados/page.tsx                  # config % + reporte + gestión de retiros
src/app/admin/afiliados/actions.ts                # resolveAffiliatePayout + updateRewardPercent
src/components/admin/payouts-manager.tsx          # botones aprobar/rechazar (cliente)
src/components/admin/affiliate-config-form.tsx    # editar % de recompensa (cliente)
src/app/admin/stats/page.tsx                      # sección "Afiliados" en estadísticas
src/components/admin/admin-layout.tsx             # enlace "Afiliados" en el menú
src/middleware.ts                                 # /afiliado en matcher + bypass de suscripción
src/app/page.tsx                                  # redirect post-login a /afiliado
src/app/admin/users/actions.ts                    # rol "afiliado" en createUser/changeUserRole
src/components/admin/users-manager.tsx            # rol "afiliado" en selectores/badge/filtro
```

## 👤 Crear un afiliado

Desde **/admin/users**:

1. Crear usuario nuevo con rol **`afiliado`**, o cambiar el rol de un usuario
   existente a `afiliado`. Al crearlo se genera automáticamente su `referralCode`.
2. El afiliado recibe el correo para crear contraseña e inicia sesión.
3. Al entrar, se le redirige a **`/afiliado`**, donde ve su código/link,
   estadísticas y saldo.

## 📊 Panel del afiliado (`/afiliado`)

- **Referidos totales** — personas que usaron su código.
- **Referidos activos** — con suscripción activa.
- **Total ganado (COP)** — suma de recompensas.
- **Disponible para redimir (COP)** — ganado − pagado − pendiente.
- **Enlace de afiliado** — código + link con copiar/compartir.
- **Redimir saldo** — solicitar retiro (monto + método) e historial de retiros.
- **Referidos y recompensas** — tabla con estado y COP generado por cada referido.

## 🔮 Extensiones futuras

- **Comisión recurrente** (abonar en cada cobro mensual, no solo la conversión).
- Pago automático de retiros vía pasarela (hoy el pago es manual por fuera).
