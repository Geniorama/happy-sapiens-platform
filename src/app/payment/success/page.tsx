"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle } from "lucide-react"

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    // Limpiar datos temporales
    sessionStorage.removeItem('pendingUser')

    // Countdown para redirección automática
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/auth/login')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Icono de éxito */}
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" strokeWidth={1.5} />
          </div>

          <h1 className="text-3xl font-bold text-green-600 mb-2">
            ¡Pago Exitoso!
          </h1>
          
          <p className="text-zinc-600 mb-6">
            Tu suscripción ha sido activada correctamente. Ya puedes acceder a
            todas las funcionalidades de Happy Sapiens.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800">
              <strong>ID de transacción:</strong>{" "}
              {searchParams.get("payment_id") || "N/A"}
            </p>
          </div>

          <p className="text-sm text-zinc-500 mb-4">
            Redirigiendo al inicio de sesión en {countdown} segundos...
          </p>

          <Link
            href="/auth/login"
            className="inline-block w-full py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Ir a Iniciar Sesión
          </Link>
        </div>

        <p className="text-sm text-zinc-600">
          Recibirás un email de confirmación con los detalles de tu suscripción.
        </p>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Cargando...</div>}>
      <SuccessContent />
    </Suspense>
  )
}
