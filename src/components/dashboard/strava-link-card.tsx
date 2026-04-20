"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "No se completó la autorización con Strava.",
  invalid_state: "La sesión de vinculación expiró. Intenta de nuevo.",
  token_exchange: "No pudimos validar tu cuenta con Strava. Intenta de nuevo.",
  no_athlete: "Strava no devolvió tu identificador de atleta.",
  already_linked: "Ese atleta de Strava ya está vinculado a otra cuenta.",
  db_save: "No pudimos guardar la vinculación. Intenta de nuevo.",
}

type Props = {
  isLinked: boolean
  athleteId: string | null
}

export function StravaLinkCard({ isLinked, athleteId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    const connected = searchParams.get("strava_connected")
    const errorCode = searchParams.get("strava_error")

    if (connected) {
      setBanner({ type: "success", message: "Tu cuenta de Strava quedó vinculada." })
    } else if (errorCode) {
      setBanner({
        type: "error",
        message: ERROR_MESSAGES[errorCode] || "No se pudo vincular Strava.",
      })
    }

    if (connected || errorCode) {
      const url = new URL(window.location.href)
      url.searchParams.delete("strava_connected")
      url.searchParams.delete("strava_error")
      window.history.replaceState({}, "", url.toString())
    }
  }, [searchParams])

  const handleConnect = () => {
    window.location.href = "/api/strava/link/connect"
  }

  const handleDisconnect = () => {
    if (!confirm("¿Seguro que quieres desvincular tu cuenta de Strava?")) return

    startTransition(async () => {
      const res = await fetch("/api/strava/link/disconnect", { method: "POST" })
      if (res.ok) {
        setBanner({ type: "success", message: "Tu cuenta de Strava quedó desvinculada." })
        router.refresh()
      } else {
        setBanner({ type: "error", message: "No se pudo desvincular Strava. Intenta de nuevo." })
      }
    })
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
      <div className="flex items-start gap-3 mb-4 sm:mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#FC4C02]">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-heading text-zinc-900">Conectar con Strava</h2>
          <p className="text-sm text-zinc-600 mt-1">
            Vincula tu cuenta para iniciar sesión con Strava y sincronizar tu actividad.
          </p>
        </div>
      </div>

      {banner && (
        <div
          className={`mb-4 p-3 text-sm rounded-lg border ${
            banner.type === "success"
              ? "text-green-700 bg-green-50 border-green-200"
              : "text-red-700 bg-red-50 border-red-200"
          }`}
        >
          {banner.message}
        </div>
      )}

      {isLinked ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Vinculado
            </span>
            {athleteId && (
              <span className="text-zinc-500 font-mono text-xs">Atleta #{athleteId}</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? "Desvinculando..." : "Desvincular Strava"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleConnect}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-[#FC4C02] text-white font-medium rounded-lg hover:bg-[#e34402] transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          Conectar con Strava
        </button>
      )}
    </div>
  )
}
