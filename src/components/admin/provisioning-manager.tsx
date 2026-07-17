"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2, PackagePlus, Repeat, CreditCard } from "lucide-react"
import {
  reprovisionSubscription,
  reprovisionRecurringOrder,
  reconcileShopifyOrder,
  reconcileAllPendingOrders,
  type AffectedSubscription,
  type RecurringCharge,
  type PendingReconciliation,
} from "@/app/admin/aprovisionamiento/actions"

const ACTION_LABELS: Record<string, string> = {
  "webhook.preapproval.pending_payment": "En espera de cobro",
  "webhook.preapproval.shopify_order_error": "Error de pedido (preaprobación)",
  "webhook.preapproval.user_create_error": "Error al crear usuario",
  "webhook.payment.shopify_order_error": "Error de pedido (cobro)",
}

function Feedback({ result }: { result: { ok: boolean; message: string } | null }) {
  if (!result) return null
  return (
    <div
      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
        result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}
    >
      {result.ok ? (
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      )}
      <span>{result.message}</span>
    </div>
  )
}

function ManualReprovision() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState("")
  const [force, setForce] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    setResult(null)
    if (!identifier.trim()) {
      setResult({ ok: false, message: "Ingresa un preApprovalId o un email" })
      return
    }
    startTransition(async () => {
      const r = await reprovisionSubscription({ identifier: identifier.trim(), force })
      setResult(r)
      if (r.ok) {
        setIdentifier("")
        router.refresh()
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <PackagePlus className="w-5 h-5 text-amber-600" />
        <h2 className="text-base font-semibold text-zinc-900">Aprovisionar manualmente</h2>
      </div>
      <p className="text-sm text-zinc-500">
        Crea el usuario (si falta), envía el correo de bienvenida y genera el primer pedido en Shopify para
        una suscripción. Ingresa el <span className="font-medium">preApprovalId</span> de MercadoPago o el{" "}
        <span className="font-medium">email</span> del suscriptor. Es idempotente: no duplica un pedido ya creado.
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="preApprovalId o email del suscriptor"
          className="flex-1 text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          onClick={submit}
          disabled={isPending}
          className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors cursor-pointer"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Aprovisionar
        </button>
      </div>

      <label className="flex items-start gap-2 text-sm text-zinc-600 cursor-pointer">
        <input
          type="checkbox"
          checked={force}
          onChange={(e) => setForce(e.target.checked)}
          className="mt-0.5 accent-amber-600"
        />
        <span>
          <span className="font-medium text-zinc-700">Forzar</span> — omitir la verificación del cobro en
          MercadoPago. Úsalo solo cuando te consta que el cobro se realizó pero MercadoPago todavía no lo refleja.
        </span>
      </label>

      <Feedback result={result} />
    </div>
  )
}

function Row({ item }: { item: AffectedSubscription }) {
  const router = useRouter()
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const reprovision = (force: boolean) => {
    setResult(null)
    const identifier = item.preApprovalId || item.email
    startTransition(async () => {
      const r = await reprovisionSubscription({ identifier, force })
      setResult(r)
      if (r.ok) router.refresh()
    })
  }

  return (
    <>
      <tr className={item.resolved ? "bg-zinc-50/50" : ""}>
        <td className="px-4 py-3 align-top">
          <p className="text-sm font-medium text-zinc-900 break-all">{item.email}</p>
          {item.preApprovalId ? (
            <p className="text-xs text-zinc-400 break-all mt-0.5">{item.preApprovalId}</p>
          ) : (
            <p className="text-xs text-red-400 mt-0.5">sin preApprovalId</p>
          )}
        </td>
        <td className="px-4 py-3 align-top">
          <span className="text-xs text-zinc-600">{ACTION_LABELS[item.lastAction] ?? item.lastAction}</span>
          {item.occurrences > 1 && (
            <span className="ml-1 text-xs text-zinc-400">×{item.occurrences}</span>
          )}
          <p className="text-xs text-zinc-400 mt-0.5">{new Date(item.lastSeen).toLocaleString("es-CO")}</p>
        </td>
        <td className="px-4 py-3 align-top">
          <span
            className={`inline-block text-xs px-2 py-0.5 rounded-full ${
              item.hasUser ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {item.hasUser ? item.userStatus ?? "sí" : "sin cuenta"}
          </span>
        </td>
        <td className="px-4 py-3 align-top">
          {item.orderCreated ? (
            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              #{item.orderNumber ?? "creado"}
            </span>
          ) : (
            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              sin pedido
            </span>
          )}
        </td>
        <td className="px-4 py-3 align-top text-right">
          {item.resolved ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> Resuelto
            </span>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => reprovision(false)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Aprovisionar
              </button>
              <button
                onClick={() => reprovision(true)}
                disabled={isPending}
                className="text-[11px] text-zinc-400 hover:text-amber-600 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Forzar (omitir verificación de cobro)
              </button>
            </div>
          )}
        </td>
      </tr>
      {result && (
        <tr>
          <td colSpan={5} className="px-4 pb-3">
            <Feedback result={result} />
          </td>
        </tr>
      )}
    </>
  )
}

function RecurringRow({ item }: { item: RecurringCharge }) {
  const router = useRouter()
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const reprovision = () => {
    setResult(null)
    startTransition(async () => {
      const r = await reprovisionRecurringOrder(item.mpPaymentId)
      setResult(r)
      if (r.ok) router.refresh()
    })
  }

  const missing = item.orderState === "missing"

  return (
    <>
      <tr className={missing ? "" : "bg-zinc-50/50"}>
        <td className="px-4 py-3 align-top">
          <p className="text-sm font-medium text-zinc-900 break-all">{item.email ?? "—"}</p>
          <p className="text-xs text-zinc-400 break-all mt-0.5">Pago MP #{item.mpPaymentId}</p>
        </td>
        <td className="px-4 py-3 align-top">
          <p className="text-sm text-zinc-700">
            {item.amount !== null
              ? item.amount.toLocaleString("es-CO", { style: "currency", currency: item.currency || "COP", maximumFractionDigits: 0 })
              : "—"}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">{new Date(item.paymentDate).toLocaleDateString("es-CO")}</p>
        </td>
        <td className="px-4 py-3 align-top">
          <span
            className={`inline-block text-xs px-2 py-0.5 rounded-full ${
              item.status === "approved" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {item.status}
          </span>
        </td>
        <td className="px-4 py-3 align-top">
          {item.orderState === "created" ? (
            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              #{item.orderNumber ?? "creado"}
            </span>
          ) : item.orderState === "skipped" ? (
            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
              omitido
            </span>
          ) : (
            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              sin pedido
            </span>
          )}
          {item.partialError && (
            <span
              className="ml-1 inline-block text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"
              title="La orden se creó pero falló un paso posterior (pago/lectura). Revisar en Shopify."
            >
              pago parcial
            </span>
          )}
        </td>
        <td className="px-4 py-3 align-top text-right">
          {missing ? (
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={reprovision}
                disabled={isPending || !item.hasVariant}
                title={item.hasVariant ? undefined : "El usuario no tiene variant recurrente configurado"}
                className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Crear pedido
              </button>
              {!item.hasVariant && <span className="text-[11px] text-red-400">sin variant recurrente</span>}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> OK
            </span>
          )}
        </td>
      </tr>
      {result && (
        <tr>
          <td colSpan={5} className="px-4 pb-3">
            <Feedback result={result} />
          </td>
        </tr>
      )}
    </>
  )
}

function RecurringSection({
  recurring,
  recurringError,
}: {
  recurring: RecurringCharge[]
  recurringError: string | null
}) {
  const [showAll, setShowAll] = useState(false)
  const missing = recurring.filter((r) => r.orderState === "missing")
  const visible = showAll ? recurring : missing.length > 0 ? missing : recurring.slice(0, 10)

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-200 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
            <Repeat className="w-4 h-4 text-amber-600" />
            Cobros recurrentes
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Cruce de los cobros mensuales registrados con su pedido en Shopify (clave <code>payment:</code>).
            «Sin pedido» = el cobro se registró pero la orden recurrente no se creó.
          </p>
        </div>
        {recurring.length > 0 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="shrink-0 text-xs text-zinc-500 hover:text-amber-600 transition-colors cursor-pointer"
          >
            {showAll ? "Ver solo pendientes" : "Ver todos"}
          </button>
        )}
      </div>

      {recurringError && (
        <div className="px-5 py-3 text-sm text-red-700 bg-red-50">No se pudo cargar: {recurringError}</div>
      )}

      {visible.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-zinc-400">
          {recurring.length === 0
            ? "No hay cobros recurrentes registrados."
            : "Todos los cobros recurrentes tienen su pedido en Shopify. 🎉"}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 text-left">
                <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Suscriptor / Pago</th>
                <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Monto / Fecha</th>
                <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Cobro</th>
                <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Pedido</th>
                <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {visible.map((item) => (
                <RecurringRow key={item.mpPaymentId} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ReconciliationRow({ item }: { item: PendingReconciliation }) {
  const router = useRouter()
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const reconcile = () => {
    setResult(null)
    startTransition(async () => {
      const r = await reconcileShopifyOrder(item.shopifyOrderId)
      setResult(r)
      if (r.ok) router.refresh()
    })
  }

  return (
    <>
      <tr>
        <td className="px-4 py-3 align-top">
          <p className="text-sm font-medium text-zinc-900 break-all">{item.email}</p>
          <p className="text-xs text-zinc-400 break-all mt-0.5">
            {item.shopifyOrderNumber ? `#${item.shopifyOrderNumber} · ` : ""}
            {item.idempotencyKey}
          </p>
        </td>
        <td className="px-4 py-3 align-top">
          <p className="text-xs text-amber-700 break-words max-w-md">{item.errorMessage}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{new Date(item.createdAt).toLocaleString("es-CO")}</p>
        </td>
        <td className="px-4 py-3 align-top text-right">
          <button
            onClick={reconcile}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
            Marcar pagada
          </button>
        </td>
      </tr>
      {result && (
        <tr>
          <td colSpan={3} className="px-4 pb-3">
            <Feedback result={result} />
          </td>
        </tr>
      )}
    </>
  )
}

function ReconciliationSection({
  reconciliations,
  reconcileError,
}: {
  reconciliations: PendingReconciliation[]
  reconcileError: string | null
}) {
  const router = useRouter()
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const reconcileAll = () => {
    setResult(null)
    startTransition(async () => {
      const r = await reconcileAllPendingOrders()
      setResult(r)
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-200 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
            <CreditCard className="w-4 h-4 text-amber-600" />
            Pedidos por conciliar (pago no asentado)
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            La orden se creó en Shopify pero quedó en <span className="font-medium">Pendiente</span> porque falló
            el registro de la transacción de pago (p.ej. 409 por el lock de la orden recién creada). «Marcar
            pagada» asienta la transacción vía <code>orderMarkAsPaid</code>. Idempotente.
          </p>
        </div>
        {reconciliations.length > 0 && (
          <button
            onClick={reconcileAll}
            disabled={isPending}
            className="shrink-0 inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Conciliar todos
          </button>
        )}
      </div>

      {reconcileError && (
        <div className="px-5 py-3 text-sm text-red-700 bg-red-50">No se pudo cargar: {reconcileError}</div>
      )}
      {result && (
        <div className="px-5 pt-3">
          <Feedback result={result} />
        </div>
      )}

      {reconciliations.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-zinc-400">
          No hay pedidos por conciliar. 🎉
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 text-left">
                <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Suscriptor / Pedido</th>
                <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Error registrado</th>
                <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {reconciliations.map((item) => (
                <ReconciliationRow key={item.idempotencyKey} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function ProvisioningManager({
  items,
  loadError,
  recurring,
  recurringError,
  reconciliations,
  reconcileError,
}: {
  items: AffectedSubscription[]
  loadError: string | null
  recurring: RecurringCharge[]
  recurringError: string | null
  reconciliations: PendingReconciliation[]
  reconcileError: string | null
}) {
  return (
    <div className="space-y-6">
      <ManualReprovision />

      <ReconciliationSection reconciliations={reconciliations} reconcileError={reconcileError} />

      {loadError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>No se pudo cargar la lista: {loadError}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200">
          <h2 className="text-base font-semibold text-zinc-900">Casos detectados</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Derivados de los logs del sistema (en espera de cobro o con error de pedido). Los marcados como
            resueltos ya tienen su primer pedido en Shopify.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-400">
            No hay casos detectados. 🎉
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 text-left">
                  <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Suscriptor</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Último evento</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Cuenta</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Pedido</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((item) => (
                  <Row key={item.email} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecurringSection recurring={recurring} recurringError={recurringError} />
    </div>
  )
}
