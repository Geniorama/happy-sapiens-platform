'use client'

import { useState } from "react"
import { ArrowLeft, PauseCircle, PlayCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react"
import Link from "next/link"
import { pauseSubscription, reactivateSubscription, cancelSubscription } from "./actions"

type Action = "pause" | "reactivate" | "cancel" | null

const CANCEL_REASONS = [
  "El precio es muy alto",
  "No estoy usando el producto",
  "Voy a pausarla temporalmente",
  "El producto no cumplió mis expectativas",
  "Tuve problemas con los envíos",
  "Encontré una mejor alternativa",
  "Otro",
]

const CONFIRMATIONS: Record<NonNullable<Action>, { description: string; cta: string; bgColor: string; btnColor: string; borderColor: string; textColor: string }> = {
  pause: {
    description: "Tu suscripción quedará en pausa. No se realizarán cobros ni envíos mientras esté pausada. Puedes reactivarla cuando quieras.",
    cta: "Sí, pausar",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    btnColor: "bg-yellow-600 hover:bg-yellow-700",
    textColor: "text-yellow-800",
  },
  reactivate: {
    description: "Tu suscripción se reactivará y los cobros y envíos mensuales continuarán normalmente.",
    cta: "Sí, reactivar",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    btnColor: "bg-green-600 hover:bg-green-700",
    textColor: "text-green-800",
  },
  cancel: {
    description: "Esta acción es permanente. Se cancelarán todos los cobros futuros y perderás acceso a los beneficios de la suscripción. No se puede deshacer.",
    cta: "Sí, cancelar definitivamente",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    btnColor: "bg-red-600 hover:bg-red-700",
    textColor: "text-red-800",
  },
}

export function ManageSubscriptionClient({ status }: { status: string }) {
  const [pending, setPending] = useState<Action>(null)
  const [confirming, setConfirming] = useState<Action>(null)
  const [error, setError] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState<string>("")
  const [cancelOther, setCancelOther] = useState<string>("")

  const isActive = status === "active" || status === "past_due"
  const isPaused = status === "paused"

  async function handleAction(action: NonNullable<Action>) {
    setPending(action)
    setError(null)

    if (action === "cancel") {
      const reason = cancelReason === "Otro" ? cancelOther.trim() || undefined
        : cancelReason || undefined
      const result = await cancelSubscription(reason)
      if (result && "error" in result) {
        setError(result.error)
        setPending(null)
      }
      return
    }

    const fn = action === "pause" ? pauseSubscription : reactivateSubscription
    const result = await fn()
    if (result && "error" in result) {
      setError(result.error)
      setPending(null)
    }
  }

  function ConfirmPanel({ action }: { action: NonNullable<Action> }) {
    const cfg = CONFIRMATIONS[action]
    return (
      <div className={`p-4 ${cfg.bgColor} rounded-lg border ${cfg.borderColor} space-y-3`}>
        <p className={`text-sm ${cfg.textColor}`}>{cfg.description}</p>
        <div className="flex gap-2">
          <button
            onClick={() => handleAction(action)}
            disabled={pending !== null}
            className={`inline-flex items-center gap-2 px-4 py-2 ${cfg.btnColor} text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60`}
          >
            {pending === action && <Loader2 className="w-4 h-4 animate-spin" />}
            {cfg.cta}
          </button>
          <button
            onClick={() => setConfirming(null)}
            disabled={pending !== null}
            className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            {action === "cancel" ? "No cancelar" : "Cancelar"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/subscription"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Mi Suscripción
        </Link>
        <h1 className="text-2xl sm:text-3xl font-heading text-zinc-900 mb-1">Gestionar suscripción</h1>
        <p className="text-sm text-zinc-600">Administra el estado de tu suscripción</p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm divide-y divide-zinc-100">

        {/* Pausar */}
        {isActive && (
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center shrink-0">
                <PauseCircle className="w-5 h-5 text-yellow-600" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h2 className="font-medium text-zinc-900 mb-1">Pausar suscripción</h2>
                <p className="text-sm text-zinc-500 mb-4">
                  Detén temporalmente los cobros y envíos. Puedes reactivarla en cualquier momento.
                </p>
                {confirming === "pause"
                  ? <ConfirmPanel action="pause" />
                  : <button onClick={() => setConfirming("pause")} className="px-4 py-2 border border-yellow-300 text-yellow-700 text-sm font-medium rounded-lg hover:bg-yellow-50 transition-colors">
                      Pausar suscripción
                    </button>
                }
              </div>
            </div>
          </div>
        )}

        {/* Reactivar */}
        {isPaused && (
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                <PlayCircle className="w-5 h-5 text-green-600" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h2 className="font-medium text-zinc-900 mb-1">Reactivar suscripción</h2>
                <p className="text-sm text-zinc-500 mb-4">
                  Reanuda los cobros y envíos mensuales desde donde los dejaste.
                </p>
                {confirming === "reactivate"
                  ? <ConfirmPanel action="reactivate" />
                  : <button onClick={() => setConfirming("reactivate")} className="px-4 py-2 border border-green-300 text-green-700 text-sm font-medium rounded-lg hover:bg-green-50 transition-colors">
                      Reactivar suscripción
                    </button>
                }
              </div>
            </div>
          </div>
        )}

        {/* Cancelar */}
        {(isActive || isPaused) && (
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-red-500" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h2 className="font-medium text-zinc-900 mb-1">Cancelar suscripción</h2>
                <p className="text-sm text-zinc-500 mb-4">
                  Cancela definitivamente. Esta acción no se puede deshacer.
                </p>
                {confirming === "cancel" ? (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200 space-y-4">
                    <p className="text-sm text-red-800">{CONFIRMATIONS.cancel.description}</p>

                    {/* Motivo (opcional) */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-zinc-600">
                        ¿Por qué cancelas? <span className="font-normal text-zinc-400">(opcional)</span>
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {CANCEL_REASONS.map((r) => (
                          <label key={r} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="cancel-reason"
                              value={r}
                              checked={cancelReason === r}
                              onChange={() => setCancelReason(r)}
                              className="accent-red-500"
                            />
                            <span className="text-sm text-zinc-700">{r}</span>
                          </label>
                        ))}
                      </div>
                      {cancelReason === "Otro" && (
                        <textarea
                          value={cancelOther}
                          onChange={(e) => setCancelOther(e.target.value)}
                          placeholder="Cuéntanos más (opcional)..."
                          rows={2}
                          className="w-full mt-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                        />
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleAction("cancel")}
                        disabled={pending !== null}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
                      >
                        {pending === "cancel" && <Loader2 className="w-4 h-4 animate-spin" />}
                        {CONFIRMATIONS.cancel.cta}
                      </button>
                      <button
                        onClick={() => { setConfirming(null); setCancelReason(""); setCancelOther("") }}
                        disabled={pending !== null}
                        className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
                      >
                        No cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirming("cancel")} className="px-4 py-2 border border-red-200 text-red-500 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors">
                    Cancelar suscripción
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {!isActive && !isPaused && (
          <div className="p-6 text-center">
            <p className="text-sm text-zinc-500 mb-4">No tienes una suscripción activa para gestionar.</p>
            <Link href="/subscribe" className="inline-block px-5 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
              Suscribirse
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
