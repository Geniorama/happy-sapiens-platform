"use client"

import { useState } from "react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Ocurrió un error. Intenta de nuevo.")
        return
      }

      setSent(true)
    } catch {
      setError("Ocurrió un error. Intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 py-5 px-4">
      <div className="w-full max-w-md space-y-8">
        <div>
          <img src="/hs-logo.svg" alt="Happy Sapiens" className="w-46 mx-auto" />
          <p className="mt-2 text-center text-zinc-600">
            Recupera tu contraseña
          </p>
        </div>

        {sent ? (
          <div className="space-y-6">
            <div className="p-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg text-center">
              Si el email está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
            </div>
            <p className="text-center text-sm text-zinc-500">
              ¿No recibiste el correo? Revisa tu carpeta de spam o{" "}
              <button
                onClick={() => { setSent(false); setEmail("") }}
                className="font-medium text-primary hover:text-primary/90"
              >
                intenta de nuevo
              </button>
              .
            </p>
            <div className="text-center">
              <Link href="/auth/login" className="text-sm font-medium text-primary hover:text-primary/90">
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <p className="text-sm text-zinc-600 text-center">
              Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="tu@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full cursor-pointer py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Enviando..." : "Enviar enlace"}
            </button>

            <div className="text-center">
              <Link href="/auth/login" className="text-sm font-medium text-primary hover:text-primary/90">
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
