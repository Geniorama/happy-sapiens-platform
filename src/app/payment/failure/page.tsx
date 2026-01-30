"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"
import { XCircle } from "lucide-react"

function FailureContent() {
  const searchParams = useSearchParams()

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Icono de error */}
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-600" strokeWidth={1.5} />
          </div>

          <h1 className="text-3xl font-bold text-red-600 mb-2">
            Pago Rechazado
          </h1>
          
          <p className="text-zinc-600 mb-6">
            No pudimos procesar tu pago. Por favor, verifica tu información e
            intenta nuevamente.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-red-800 mb-2">
              <strong>Posibles razones:</strong>
            </p>
            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
              <li>Fondos insuficientes</li>
              <li>Datos de tarjeta incorrectos</li>
              <li>Transacción rechazada por el banco</li>
              <li>Límite de compra excedido</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Link
              href="/subscribe"
              className="block w-full py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              Intentar Nuevamente
            </Link>

            <Link
              href="/"
              className="block w-full py-3 px-4 border border-zinc-300 text-zinc-700 font-medium rounded-lg hover:bg-zinc-50 transition-colors"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>

        <p className="text-sm text-zinc-600">
          ¿Necesitas ayuda?{" "}
          <a href="mailto:soporte@happysapiens.com" className="text-primary hover:underline">
            Contacta a soporte
          </a>
        </p>
      </div>
    </div>
  )
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Cargando...</div>}>
      <FailureContent />
    </Suspense>
  )
}
