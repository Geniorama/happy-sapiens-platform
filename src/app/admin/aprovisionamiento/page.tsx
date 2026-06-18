import { listAffectedSubscriptions, listRecurringCharges } from "./actions"
import { ProvisioningManager } from "@/components/admin/provisioning-manager"

export const dynamic = "force-dynamic"

export default async function AdminProvisioningPage() {
  const [affectedResult, recurringResult] = await Promise.all([
    listAffectedSubscriptions(),
    listRecurringCharges(),
  ])

  const items = affectedResult.ok ? affectedResult.items : []
  const loadError = affectedResult.ok ? null : affectedResult.error

  const recurring = recurringResult.ok ? recurringResult.items : []
  const recurringError = recurringResult.ok ? null : recurringResult.error

  const pending = items.filter((i) => !i.resolved).length
  const recurringMissing = recurring.filter((r) => r.orderState === "missing").length

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl uppercase font-heading text-zinc-900 mb-1">
          Aprovisionamiento
        </h1>
        <p className="text-sm text-zinc-500">
          Suscripciones y cobros recurrentes que quedaron sin pedido en Shopify, y reaprovisionamiento manual
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Casos (activación)", value: items.length },
          { label: "Pendientes activación", value: pending },
          { label: "Cobros recurrentes", value: recurring.length },
          { label: "Recurrentes sin pedido", value: recurringMissing },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-2xl font-bold text-zinc-900">{s.value.toLocaleString()}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <ProvisioningManager
        items={items}
        loadError={loadError}
        recurring={recurring}
        recurringError={recurringError}
      />
    </div>
  )
}
