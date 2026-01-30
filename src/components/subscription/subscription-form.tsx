"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Check } from "lucide-react"
import { SUBSCRIPTION_PLAN } from "@/lib/mercadopago"

declare global {
  interface Window {
    MercadoPago?: unknown
  }
}

export function SubscriptionForm() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [referralCode, setReferralCode] = useState<string>("")

  useEffect(() => {
    // Capturar código de referido de la URL
    const refCode = searchParams.get("ref")
    if (refCode) {
      setReferralCode(refCode.toUpperCase())
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string
    const refCode = formData.get("referralCode") as string

    // Validaciones
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      setIsLoading(false)
      return
    }

    try {
      // Crear preferencia de pago
      const response = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName: name,
          userEmail: email,
          userPassword: password,
          referralCode: refCode || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Error al procesar el pago")
        return
      }

      // Guardar datos temporalmente en sessionStorage para recuperar después del pago
      sessionStorage.setItem('pendingUser', JSON.stringify({
        name,
        email,
        password,
      }))

      // Redirigir a Mercado Pago
      window.location.href = data.initPoint
    } catch (err) {
      setError("Ocurrió un error al procesar el pago")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Plan de suscripción */}
      <div className="bg-white border-2 border-primary rounded-lg p-6 text-center">
        <h3 className="text-2xl font-bold mb-2">Plan Mensual</h3>
        <div className="text-4xl font-bold text-primary mb-4">
          ${SUBSCRIPTION_PLAN.price.toFixed(2)}
          <span className="text-lg text-zinc-600">/{SUBSCRIPTION_PLAN.currency}</span>
        </div>
        <p className="text-zinc-600 mb-4">{SUBSCRIPTION_PLAN.description}</p>
        <div className="space-y-2 text-sm text-zinc-600">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
            <span>Acceso completo a la plataforma</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
            <span>Renovación automática mensual</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
            <span>Cancela cuando quieras</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
            <span>Soporte prioritario</span>
          </div>
        </div>
      </div>

      {/* Formulario de registro */}
      <div className="bg-white border border-zinc-300 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-center mb-2">
          Crear Cuenta
        </h2>
        <p className="text-center text-zinc-600 mb-6">
          Completa tus datos para continuar al pago
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Nombre completo
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Juan Pérez"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium mb-2"
            >
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label
              htmlFor="referralCode"
              className="block text-sm font-medium mb-2"
            >
              Código de referido (opcional)
            </label>
            <input
              id="referralCode"
              name="referralCode"
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent uppercase font-mono"
              placeholder="ABC12345"
            />
            {referralCode && (
              <p className="mt-1 text-xs text-green-600">
                ✓ Código de referido aplicado
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full cursor-pointer py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Procesando..." : `Continuar al Pago - $${SUBSCRIPTION_PLAN.price.toFixed(2)}`}
          </button>

          <p className="text-xs text-center text-zinc-500">
            Serás redirigido a Mercado Pago para completar el pago de forma segura
          </p>
        </form>
      </div>

      <p className="text-center text-sm text-zinc-600">
        ¿Ya tienes una cuenta?{" "}
        <a
          href="/auth/login"
          className="font-medium text-primary hover:text-primary/90"
        >
          Inicia sesión aquí
        </a>
      </p>
    </div>
  )
}
