"use client"

import { useState, useTransition } from "react"
import { Package, Save, Check } from "lucide-react"
import { updateSubscriptionPlan, toggleSubscriptionPlanActive } from "@/app/admin/plans/actions"

interface Plan {
  slug: string
  title: string
  description: string
  price: number
  currency: string
  taxExempt: boolean
  isActive: boolean
  shopifyVariantId: string | null
  shopifyFirstOrderVariantId: string | null
}

const inputClass =
  "w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
const labelClass = "block text-xs font-medium text-zinc-600 mb-1"

export function PlansManager({ plans: initialPlans }: { plans: Plan[] }) {
  return (
    <div className="space-y-4">
      {initialPlans.map((plan) => (
        <PlanCard key={plan.slug} plan={plan} />
      ))}
    </div>
  )
}

function PlanCard({ plan }: { plan: Plan }) {
  const [form, setForm] = useState<Plan>(plan)
  const [committedActive, setCommittedActive] = useState<boolean>(plan.isActive)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isToggling, startToggle] = useTransition()

  const dirty =
    form.title !== plan.title ||
    form.description !== plan.description ||
    form.price !== plan.price ||
    form.currency !== plan.currency ||
    form.taxExempt !== plan.taxExempt ||
    (form.shopifyVariantId ?? "") !== (plan.shopifyVariantId ?? "") ||
    (form.shopifyFirstOrderVariantId ?? "") !== (plan.shopifyFirstOrderVariantId ?? "")

  const handleSave = () => {
    setError(null)
    setSavedAt(null)
    startTransition(async () => {
      const result = await updateSubscriptionPlan(plan.slug, {
        title: form.title,
        description: form.description,
        price: form.price,
        currency: form.currency,
        taxExempt: form.taxExempt,
        isActive: committedActive,
        shopifyVariantId: form.shopifyVariantId,
        shopifyFirstOrderVariantId: form.shopifyFirstOrderVariantId,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSavedAt(Date.now())
      }
    })
  }

  const handleToggleActive = () => {
    const next = !committedActive
    setError(null)
    startToggle(async () => {
      const result = await toggleSubscriptionPlanActive(plan.slug, next)
      if (result.error) {
        setError(result.error)
      } else {
        setCommittedActive(next)
        setForm((f) => ({ ...f, isActive: next }))
      }
    })
  }

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
        committedActive ? "border-zinc-200" : "border-zinc-300 bg-zinc-50/50"
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 bg-zinc-50">
        <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Package className="w-4 h-4 text-amber-700" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-zinc-900">{form.title || plan.slug}</p>
          <p className="text-xs font-mono text-zinc-500 truncate">{plan.slug}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              committedActive
                ? "bg-green-100 text-green-700"
                : "bg-zinc-200 text-zinc-600"
            }`}
          >
            {committedActive ? "En venta" : "Desactivado"}
          </span>
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={isToggling}
            role="switch"
            aria-checked={committedActive}
            title={committedActive ? "Desactivar venta" : "Activar venta"}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
              committedActive ? "bg-amber-600" : "bg-zinc-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                committedActive ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Título</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Precio mensual</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Moneda</label>
            <input
              type="text"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
              maxLength={3}
              className={`${inputClass} uppercase font-mono`}
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.taxExempt}
                onChange={(e) => setForm({ ...form, taxExempt: e.target.checked })}
                className="w-4 h-4 accent-amber-600 rounded"
              />
              <span className="text-sm text-zinc-700">Exento de IVA</span>
            </label>
          </div>

          <div>
            <label className={labelClass}>
              ID de variante Shopify <span className="text-zinc-400">(recurrente)</span>
            </label>
            <input
              type="text"
              value={form.shopifyVariantId ?? ""}
              onChange={(e) => setForm({ ...form, shopifyVariantId: e.target.value })}
              placeholder="gid://shopify/ProductVariant/..."
              className={`${inputClass} font-mono text-xs`}
            />
          </div>

          <div>
            <label className={labelClass}>
              ID de variante kit bienvenida <span className="text-zinc-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={form.shopifyFirstOrderVariantId ?? ""}
              onChange={(e) => setForm({ ...form, shopifyFirstOrderVariantId: e.target.value })}
              placeholder="gid://shopify/ProductVariant/..."
              className={`${inputClass} font-mono text-xs`}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          {savedAt && !dirty && (
            <span className="flex items-center gap-1.5 text-xs text-green-600">
              <Check className="w-3.5 h-3.5" />
              Guardado
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  )
}
