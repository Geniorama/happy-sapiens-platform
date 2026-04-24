"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

function SetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-red-600 text-sm">El enlace no es válido o ya fue utilizado.</p>
        <p className="text-xs text-zinc-500">Pide al administrador que te reenvíe el correo de invitación.</p>
        <Link href="/auth/login" className="text-sm font-medium text-primary hover:text-primary/90">
          Ir al inicio de sesión
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError("Las contraseñas no coinciden")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Ocurrió un error. Intenta de nuevo.")
        return
      }

      setSuccess(true)
      setTimeout(() => {
        window.location.href = "/auth/login"
      }, 3000)
    } catch {
      setError("Ocurrió un error. Intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="p-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg">
          ¡Contraseña establecida correctamente! Redirigiendo al inicio de sesión...
        </div>
        <Link href="/auth/login" className="text-sm font-medium text-primary hover:text-primary/90">
          Ir al inicio de sesión
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium mb-2">
            Confirmar contraseña
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Repite la contraseña"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full cursor-pointer py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? "Guardando..." : "Establecer contraseña"}
      </button>

      <div className="text-center">
        <Link href="/auth/login" className="text-sm font-medium text-primary hover:text-primary/90">
          Volver al inicio de sesión
        </Link>
      </div>
    </form>
  )
}

export default function SetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 py-5 px-4">
      <div className="w-full max-w-md space-y-8">
        <div>
          <img src="/hs-logo.svg" alt="Happy Sapiens" className="w-46 mx-auto" />
          <h1 className="mt-4 text-center text-xl font-semibold text-zinc-900">
            Bienvenido(a) a Happy Sapiens
          </h1>
          <p className="mt-2 text-center text-zinc-600">
            Establece tu contraseña para acceder a tu cuenta
          </p>
        </div>
        <Suspense>
          <SetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
