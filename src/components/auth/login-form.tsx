"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import Link from "next/link"

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Credenciales inválidas")
        setIsLoading(false)
        return
      }

      const session = await getSession()
      const role = session?.user?.role

      const destination =
        role === "admin" ? "/admin" : role === "coach" ? "/coach" : "/dashboard"

      window.location.href = destination
    } catch {
      setError("Ocurrió un error al iniciar sesión")
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: string) => {
    setIsLoading(true)
    try {
      await signIn(provider, { callbackUrl: "/dashboard" })
    } catch {
      setError(`Error al iniciar sesión con ${provider}`)
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div>
        <img src="/hs-logo.svg" alt="Happy Sapiens" className="w-46 mx-auto" />
        
        <p className="mt-2 text-center text-zinc-600">
          Accede a tu cuenta de Happy Sapiens
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium">
                Contraseña
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-primary hover:text-primary/90"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full cursor-pointer py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-zinc-50 text-zinc-500">
            O continúa con
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          type="button"
          onClick={() => handleOAuthSignIn("google")}
          disabled={isLoading}
          className="flex cursor-pointer items-center justify-center gap-3 px-4 py-3 border border-zinc-300 rounded-lg hover:bg-zinc-50 hover:border-zinc-400 hover:shadow-sm active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </button>

        <button
          type="button"
          onClick={() => handleOAuthSignIn("strava")}
          disabled={isLoading}
          className="flex cursor-pointer items-center justify-center gap-3 px-4 py-3 border border-zinc-300 rounded-lg hover:bg-zinc-50 hover:border-zinc-400 hover:shadow-sm active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          Strava
        </button>
      </div>

      <p className="text-xs text-center text-zinc-500 -mt-4">
        Para entrar con Strava primero vincúlalo desde tu perfil (ingresa con correo o Google la primera vez).
      </p>

      <p className="text-center text-sm text-zinc-600">
        ¿No tienes una cuenta?{" "}
        <Link
          href="/subscribe"
          className="font-medium text-primary hover:text-primary/90"
        >
          Suscríbete aquí
        </Link>
      </p>
    </div>
  )
}
