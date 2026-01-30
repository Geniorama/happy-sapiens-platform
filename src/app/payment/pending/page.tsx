"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"
import { Clock } from "lucide-react"

function PendingContent() {
  const searchParams = useSearchParams()

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Icono de pendiente */}
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-yellow-600" strokeWidth={1.5} />
          </div>

          <h1 className="text-3xl font-bold text-yellow-600 mb-2">
            Pago Pendiente
          </h1>
          
          <p className="text-zinc-600 mb-6">
            Tu pago está siendo procesado. Recibirás una confirmación por email
            cuando se complete.
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800 mb-2">
              <strong>¿Qué significa esto?</strong>
            </p>
            <p className="text-sm text-yellow-700">
              Algunos métodos de pago (como transferencia bancaria o pago en efectivo)
              pueden tardar hasta 48 horas en confirmarse.
            </p>
          </div>

          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-zinc-700">
              <strong>ID de pago:</strong>{" "}
              {searchParams.get("payment_id") || "N/A"}
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>

        <p className="text-sm text-zinc-600">
          Te notificaremos por email cuando tu suscripción esté activa.
        </p>
      </div>
    </div>
  )
}

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Cargando...</div>}>
      <PendingContent />
    </Suspense>
  )
}
