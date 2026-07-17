"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Loader2, AlertTriangle, Package } from "lucide-react"

type Plan = { id: string; title: string; price: number; description: string }

export function AddSubscriptionClient({
  plans,
  ownedProducts,
  hasSavedAddress,
}: {
  plans: Plan[]
  ownedProducts: string[]
  hasSavedAddress: boolean
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const owned = new Set(ownedProducts)

  async function handleSubscribe(productId: string) {
    setError(null)
    setLoadingId(productId)
    try {
      const res = await fetch("/api/mercadopago/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // El backend toma email, datos y direcciones de la sesión: solo va el producto.
        body: JSON.stringify({ productId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "No se pudo iniciar la suscripción. Intenta de nuevo.")
        setLoadingId(null)
        return
      }
      window.location.assign(data.initPoint)
    } catch {
      setError("Ocurrió un error al procesar la suscripción")
      setLoadingId(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/subscription"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Mis Suscripciones
        </Link>
        <h1 className="text-2xl sm:text-3xl font-heading text-zinc-900 mb-1">Agregar suscripción</h1>
        <p className="text-sm text-zinc-600">
          Suscríbete a otro producto. Usaremos los datos de facturación y envío de tu cuenta.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {!hasSavedAddress && (
        <div className="mb-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            No tienes una dirección de envío guardada. Puedes suscribirte igual, pero te recomendamos
            completar tus datos en tu perfil para asegurar la entrega.
          </div>
        </div>
      )}

      <div className="space-y-3">
        {plans.map((plan) => {
          const alreadyOwned = owned.has(plan.id)
          const isLoading = loadingId === plan.id
          return (
            <div
              key={plan.id}
              className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-zinc-900">{plan.title}</h3>
                  <p className="text-sm text-zinc-500 line-clamp-2">{plan.description}</p>
                  <p className="text-sm font-semibold text-primary mt-1">
                    ${plan.price.toLocaleString("es-CO")} COP/mes
                  </p>
                </div>
              </div>

              {alreadyOwned ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg shrink-0">
                  <Check className="w-4 h-4" strokeWidth={2} />
                  Suscrito
                </span>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loadingId !== null}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? "Redirigiendo..." : "Suscribirme"}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-center text-zinc-500 mt-6">
        Serás redirigido a Mercado Pago para autorizar el cobro mensual automático
      </p>
    </div>
  )
}
