"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "No se completó la autorización con Google.",
  invalid_state: "La sesión de vinculación expiró. Intenta de nuevo.",
  token_exchange: "No pudimos validar tu cuenta con Google. Intenta de nuevo.",
  userinfo: "No pudimos obtener tu información de Google.",
  no_google_id: "Google no devolvió tu identificador de cuenta.",
  already_linked: "Esa cuenta de Google ya está vinculada a otro usuario.",
  db_save: "No pudimos guardar la vinculación. Intenta de nuevo.",
}

type Props = {
  isLinked: boolean
  canUnlink: boolean
}

export function GoogleLinkCard({ isLinked, canUnlink }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    const connected = searchParams.get("google_connected")
    const errorCode = searchParams.get("google_error")

    if (connected) {
      setBanner({ type: "success", message: "Tu cuenta de Google quedó vinculada." })
    } else if (errorCode) {
      setBanner({
        type: "error",
        message: ERROR_MESSAGES[errorCode] || "No se pudo vincular Google.",
      })
    }

    if (connected || errorCode) {
      const url = new URL(window.location.href)
      url.searchParams.delete("google_connected")
      url.searchParams.delete("google_error")
      window.history.replaceState({}, "", url.toString())
    }
  }, [searchParams])

  const handleConnect = () => {
    window.location.href = "/api/google/link/connect"
  }

  const handleDisconnect = () => {
    if (!confirm("¿Seguro que quieres desvincular tu cuenta de Google?")) return

    startTransition(async () => {
      const res = await fetch("/api/google/link/disconnect", { method: "POST" })
      if (res.ok) {
        setBanner({ type: "success", message: "Tu cuenta de Google quedó desvinculada." })
        router.refresh()
      } else {
        const data = await res.json().catch(() => null)
        setBanner({
          type: "error",
          message: data?.error || "No se pudo desvincular Google. Intenta de nuevo.",
        })
      }
    })
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
      <div className="flex items-start gap-3 mb-4 sm:mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-zinc-200">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-heading text-zinc-900">Conectar con Google</h2>
          <p className="text-sm text-zinc-600 mt-1">
            Vincula tu cuenta para iniciar sesión con Google.
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
          </div>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={isPending || !canUnlink}
            title={!canUnlink ? "Configura una contraseña u otro proveedor antes de desvincular" : undefined}
            className="px-4 py-2 text-sm font-medium border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? "Desvinculando..." : "Desvincular Google"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleConnect}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white text-zinc-700 font-medium rounded-lg border border-zinc-300 hover:bg-zinc-50 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Conectar con Google
        </button>
      )}
    </div>
  )
}
