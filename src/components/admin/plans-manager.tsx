"use client"

import { useState, useTransition } from "react"
import { Package, Save, Check, Plus, Trash2, X } from "lucide-react"
import {
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  updateSubscriptionPlan,
  toggleSubscriptionPlanActive,
} from "@/app/admin/plans/actions"

interface PlanFields {
  title: string
  description: string
  price: number
  currency: string
  taxExempt: boolean
  isActive: boolean
  sortOrder: number
  shopifyVariantId: string | null
  shopifyFirstOrderVariantId: string | null
}

interface Plan extends PlanFields {
  slug: string
  subscriberCount: number
}

const inputClass =
  "w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
const labelClass = "block text-xs font-medium text-zinc-600 mb-1"

const EMPTY_PLAN: PlanFields = {
  title: "",
  description: "",
  price: 0,
  currency: "COP",
  taxExempt: false,
  isActive: false,
  sortOrder: 0,
  shopifyVariantId: null,
  shopifyFirstOrderVariantId: null,
}

export function PlansManager({ plans: initialPlans }: { plans: Plan[] }) {
  const [creating, setCreating] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuevo plan
          </button>
        )}
      </div>

      {creating && <NewPlanCard onClose={() => setCreating(false)} />}

      {initialPlans.map((plan) => (
        <PlanCard key={plan.slug} plan={plan} />
      ))}

      {initialPlans.length === 0 && !creating && (
        <p className="text-sm text-zinc-500 bg-white border border-zinc-200 rounded-xl px-5 py-8 text-center">
          Todavía no hay planes configurados. Crea el primero con “Nuevo plan”.
        </p>
      )}
    </div>
  )
}

// Campos compartidos por el formulario de creación y el de edición, para que
// ambos ofrezcan exactamente las mismas opciones.
function PlanFormFields({
  form,
  setForm,
}: {
  form: PlanFields
  setForm: (updater: (prev: PlanFields) => PlanFields) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className={labelClass}>Título</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
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
          onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
          className={inputClass}
        />
      </div>

      <div className="sm:col-span-2">
        <label className={labelClass}>Descripción</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={2}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Moneda</label>
        <input
          type="text"
          value={form.currency}
          onChange={(e) =>
            setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))
          }
          maxLength={3}
          className={`${inputClass} uppercase font-mono`}
        />
      </div>

      <div>
        <label className={labelClass}>
          Orden <span className="text-zinc-400">(menor aparece primero)</span>
        </label>
        <input
          type="number"
          step="1"
          value={form.sortOrder}
          onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
          className={inputClass}
        />
      </div>

      <div className="flex items-end">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.taxExempt}
            onChange={(e) => setForm((f) => ({ ...f, taxExempt: e.target.checked }))}
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
          onChange={(e) => setForm((f) => ({ ...f, shopifyVariantId: e.target.value }))}
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
          onChange={(e) =>
            setForm((f) => ({ ...f, shopifyFirstOrderVariantId: e.target.value }))
          }
          placeholder="gid://shopify/ProductVariant/..."
          className={`${inputClass} font-mono text-xs`}
        />
      </div>
    </div>
  )
}

function NewPlanCard({ onClose }: { onClose: () => void }) {
  const [slug, setSlug] = useState("")
  const [form, setForm] = useState<PlanFields>(EMPTY_PLAN)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleCreate = () => {
    setError(null)
    startTransition(async () => {
      const result = await createSubscriptionPlan({ slug, ...form })
      if (result.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-amber-300 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-100 bg-amber-50">
        <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Plus className="w-4 h-4 text-amber-700" strokeWidth={1.5} />
        </div>
        <p className="font-semibold text-zinc-900 flex-1">Nuevo plan</p>
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          title="Cancelar"
          className="p-1.5 rounded-lg text-zinc-500 hover:bg-amber-100 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <label className={labelClass}>Identificador (slug)</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="happy-blend"
            className={`${inputClass} font-mono`}
          />
          <p className="mt-1 text-xs text-zinc-500">
            Minúsculas, números y guiones. Identifica el plan en el checkout y en las
            suscripciones; no se puede cambiar después.
          </p>
        </div>

        <PlanFormFields form={form} setForm={setForm} />

        <label className="flex items-start gap-2 cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            className="mt-0.5 w-4 h-4 accent-amber-600 rounded"
          />
          <span className="text-xs text-zinc-700 leading-relaxed">
            <span className="font-medium">Poner en venta al crear.</span> Si lo dejas sin
            marcar, el plan se guarda desactivado y no aparecerá en la página de
            suscripción hasta que lo actives.
          </span>
        </label>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-zinc-600 rounded-lg hover:bg-zinc-100 disabled:opacity-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isPending ? "Creando..." : "Crear plan"}
          </button>
        </div>
      </div>
    </div>
  )
}

interface ApplyResult {
  total: number
  updated: number
  failed: number
  errors: string[]
}

function PlanCard({ plan }: { plan: Plan }) {
  const [form, setForm] = useState<PlanFields>(plan)
  const [committedActive, setCommittedActive] = useState<boolean>(plan.isActive)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [applyToExisting, setApplyToExisting] = useState(false)
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null)
  const [applyWarning, setApplyWarning] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isToggling, startToggle] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  const priceChanged = form.price !== plan.price

  const dirty =
    form.title !== plan.title ||
    form.description !== plan.description ||
    priceChanged ||
    form.currency !== plan.currency ||
    form.taxExempt !== plan.taxExempt ||
    form.sortOrder !== plan.sortOrder ||
    (form.shopifyVariantId ?? "") !== (plan.shopifyVariantId ?? "") ||
    (form.shopifyFirstOrderVariantId ?? "") !== (plan.shopifyFirstOrderVariantId ?? "")

  const handleSave = () => {
    setError(null)
    setSavedAt(null)
    setApplyResult(null)
    setApplyWarning(null)
    // Solo tiene sentido propagar si efectivamente cambió el precio.
    const shouldApply = applyToExisting && priceChanged
    startTransition(async () => {
      const result = await updateSubscriptionPlan(
        plan.slug,
        {
          title: form.title,
          description: form.description,
          price: form.price,
          currency: form.currency,
          taxExempt: form.taxExempt,
          isActive: committedActive,
          sortOrder: form.sortOrder,
          shopifyVariantId: form.shopifyVariantId,
          shopifyFirstOrderVariantId: form.shopifyFirstOrderVariantId,
        },
        shouldApply,
      )
      if (result.error) {
        setError(result.error)
      } else {
        setSavedAt(Date.now())
        setApplyToExisting(false)
        if (result.applyError) setApplyWarning(result.applyError)
        if (result.applied) setApplyResult(result.applied)
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

  const handleDelete = () => {
    setError(null)
    startDelete(async () => {
      const result = await deleteSubscriptionPlan(plan.slug)
      if (result.error) {
        setError(result.error)
        setConfirmDelete(false)
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
          <span className="hidden sm:inline text-xs text-zinc-500">
            {plan.subscriberCount} suscriptor{plan.subscriberCount === 1 ? "" : "es"}
          </span>
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

        <PlanFormFields form={form} setForm={setForm} />

        {priceChanged && (
          <label className="flex items-start gap-2 cursor-pointer rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <input
              type="checkbox"
              checked={applyToExisting}
              onChange={(e) => setApplyToExisting(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-amber-600 rounded"
            />
            <span className="text-xs text-amber-900 leading-relaxed">
              <span className="font-medium">Aplicar el nuevo precio a las suscripciones existentes.</span>{" "}
              Se actualizará el cobro recurrente en Mercado Pago de los suscriptores
              activos de este plan; pagarán el nuevo valor en su próxima renovación.
            </span>
          </label>
        )}

        {applyResult && (
          <div
            className={`text-xs rounded-lg px-3 py-2 border ${
              applyResult.failed > 0
                ? "text-amber-800 bg-amber-50 border-amber-200"
                : "text-green-700 bg-green-50 border-green-200"
            }`}
          >
            Precio aplicado a {applyResult.updated} de {applyResult.total} suscripciones
            {applyResult.failed > 0 && (
              <>
                {" "}
                — {applyResult.failed} fallaron y conservan su precio anterior. Revisa el
                registro de actividad e inténtalo de nuevo.
              </>
            )}
          </div>
        )}

        {applyWarning && (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {applyWarning}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {plan.subscriberCount === 0 &&
            (confirmDelete ? (
              <div className="flex items-center gap-2 mr-auto">
                <span className="text-xs text-zinc-600">¿Eliminar este plan?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isDeleting ? "Eliminando..." : "Sí, eliminar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 rounded-lg hover:bg-zinc-100 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                title="Eliminar plan"
                className="inline-flex items-center gap-1.5 mr-auto px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            ))}

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
