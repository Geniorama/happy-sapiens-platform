"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Check } from "lucide-react"
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@/lib/mercadopago"
import { COLOMBIA_DEPARTMENTS, COLOMBIA_LOCATIONS } from "@/lib/colombia-locations"

const DOCUMENT_TYPES = [
  { value: "CC", label: "Cédula de Ciudadanía" },
  { value: "CE", label: "Cédula de Extranjería" },
  { value: "NIT", label: "NIT" },
  { value: "PP", label: "Pasaporte" },
  { value: "TI", label: "Tarjeta de Identidad" },
]

const inputClass =
  "w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"

const labelClass = "block text-sm font-medium text-zinc-700 mb-1.5"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-zinc-900 pb-2 border-b border-zinc-200 mb-4">
      {children}
    </h3>
  )
}

type AddressFields = {
  documentType: string
  documentNumber: string
  phone: string
  address: string
  city: string
  department: string
}

const emptyAddress: AddressFields = {
  documentType: "CC",
  documentNumber: "",
  phone: "",
  address: "",
  city: "",
  department: "",
}

export function SubscriptionForm() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [referralCode, setReferralCode] = useState("")
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [oauthNotice, setOauthNotice] = useState(false)

  const [billing, setBilling] = useState<AddressFields>(emptyAddress)
  const [shipping, setShipping] = useState({ fullName: "", ...emptyAddress })
  const [sameAsBilling, setSameAsBilling] = useState(true)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedDataPolicy, setAcceptedDataPolicy] = useState(false)

  useEffect(() => {
    const productId = searchParams.get("product")
    const refCode = searchParams.get("ref")
    if (productId && SUBSCRIPTION_PLANS[productId]) {
      setPlan(SUBSCRIPTION_PLANS[productId])
    }
    if (refCode) {
      setReferralCode(refCode.toUpperCase())
    }
    if (searchParams.get("oauth") === "1") {
      setOauthNotice(true)
    }
  }, [searchParams])

  const handleBilling = (field: keyof AddressFields, value: string) => {
    setBilling((prev) => ({ ...prev, [field]: value }))
  }

  const handleShipping = (field: keyof typeof shipping, value: string) => {
    setShipping((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!plan) return

    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const refCode = formData.get("referralCode") as string

    const shippingData = sameAsBilling
      ? { fullName: name, ...billing }
      : shipping

    try {
      const response = await fetch("/api/mercadopago/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: name,
          userEmail: email,
          productId: plan.id,
          referralCode: refCode || null,
          billing,
          shipping: shippingData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Error al procesar la suscripción")
        return
      }

      window.location.href = data.initPoint
    } catch {
      setError("Ocurrió un error al procesar la suscripción")
    } finally {
      setIsLoading(false)
    }
  }

  if (!plan) {
    return (
      <div className="w-full max-w-md text-center space-y-4">
        {oauthNotice && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 text-left">
            Para iniciar sesión con Google, Facebook o Strava primero necesitas una suscripción activa. Elige tu producto:
          </div>
        )}
        <p className="text-zinc-600">Selecciona un producto para suscribirte:</p>
        <div className="space-y-3">
          {Object.values(SUBSCRIPTION_PLANS).map((p) => (
            <a
              key={p.id}
              href={`/subscribe?product=${p.id}`}
              className="block w-full py-3 px-4 bg-white border-2 border-primary rounded-lg font-medium text-primary hover:bg-primary hover:text-white transition-colors"
            >
              {p.title} — ${p.price.toLocaleString("es-CO")} COP/mes
            </a>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Plan seleccionado */}
      <div className="bg-white border-2 border-primary rounded-lg p-6 text-center">
        <h3 className="text-2xl font-bold mb-2">{plan.title}</h3>
        <div className="text-4xl font-bold text-primary mb-1">
          ${plan.price.toLocaleString("es-CO")}
          <span className="text-lg text-zinc-600"> COP/mes</span>
        </div>
        <p className="text-zinc-500 text-sm mb-4">Cobro mensual automático</p>
        <div className="space-y-2 text-sm text-zinc-600 text-left max-w-xs mx-auto">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
            <span>Producto entregado mensualmente</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
            <span>Acceso completo a la plataforma Happy Sapiens</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
            <span>Cancela cuando quieras</span>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="bg-white border border-zinc-300 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-center mb-1">Suscribirse</h2>
        <p className="text-center text-zinc-600 mb-6 text-sm">
          Completa tus datos para continuar al pago
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Datos personales */}
          <div>
            <SectionTitle>Datos personales</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className={labelClass}>
                  Nombre completo
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className={inputClass}
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label htmlFor="email" className={labelClass}>
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={inputClass}
                  placeholder="tu@email.com"
                />
              </div>
            </div>
          </div>

          {/* Datos de facturación */}
          <div>
            <SectionTitle>Datos de facturación</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tipo de documento</label>
                <select
                  value={billing.documentType}
                  onChange={(e) => handleBilling("documentType", e.target.value)}
                  required
                  className={inputClass}
                >
                  {DOCUMENT_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Número de documento</label>
                <input
                  type="text"
                  value={billing.documentNumber}
                  onChange={(e) => handleBilling("documentNumber", e.target.value)}
                  required
                  className={inputClass}
                  placeholder="1234567890"
                />
              </div>
              <div>
                <label className={labelClass}>Teléfono</label>
                <input
                  type="tel"
                  value={billing.phone}
                  onChange={(e) => handleBilling("phone", e.target.value)}
                  required
                  className={inputClass}
                  placeholder="3001234567"
                />
              </div>
              <div>
                <label className={labelClass}>Dirección</label>
                <input
                  type="text"
                  value={billing.address}
                  onChange={(e) => handleBilling("address", e.target.value)}
                  required
                  className={inputClass}
                  placeholder="Calle 123 # 45-67"
                />
              </div>
              <div>
                <label className={labelClass}>Departamento</label>
                <select
                  value={billing.department}
                  onChange={(e) => {
                    handleBilling("department", e.target.value)
                    handleBilling("city", "")
                  }}
                  required
                  className={inputClass}
                >
                  <option value="">Selecciona un departamento</option>
                  {COLOMBIA_DEPARTMENTS.map((dep) => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Ciudad</label>
                <select
                  value={billing.city}
                  onChange={(e) => handleBilling("city", e.target.value)}
                  required
                  disabled={!billing.department}
                  className={inputClass}
                >
                  <option value="">
                    {billing.department ? "Selecciona una ciudad" : "Primero selecciona un departamento"}
                  </option>
                  {(COLOMBIA_LOCATIONS[billing.department] ?? []).map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dirección de envío */}
          <div>
            <SectionTitle>Dirección de envío</SectionTitle>

            <label className="flex items-center gap-3 cursor-pointer mb-5">
              <input
                type="checkbox"
                checked={sameAsBilling}
                onChange={(e) => setSameAsBilling(e.target.checked)}
                className="w-4 h-4 accent-primary rounded"
              />
              <span className="text-sm text-zinc-700">
                Los datos de envío son los mismos de facturación
              </span>
            </label>

            {!sameAsBilling && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Nombre del destinatario</label>
                  <input
                    type="text"
                    value={shipping.fullName}
                    onChange={(e) => handleShipping("fullName", e.target.value)}
                    required
                    className={inputClass}
                    placeholder="Nombre de quien recibe"
                  />
                </div>
                <div>
                  <label className={labelClass}>Teléfono de contacto</label>
                  <input
                    type="tel"
                    value={shipping.phone}
                    onChange={(e) => handleShipping("phone", e.target.value)}
                    required
                    className={inputClass}
                    placeholder="3001234567"
                  />
                </div>
                <div>
                  <label className={labelClass}>Dirección de envío</label>
                  <input
                    type="text"
                    value={shipping.address}
                    onChange={(e) => handleShipping("address", e.target.value)}
                    required
                    className={inputClass}
                    placeholder="Calle 123 # 45-67"
                  />
                </div>
                <div>
                  <label className={labelClass}>Departamento</label>
                  <select
                    value={shipping.department}
                    onChange={(e) => {
                      handleShipping("department", e.target.value)
                      handleShipping("city", "")
                    }}
                    required
                    className={inputClass}
                  >
                    <option value="">Selecciona un departamento</option>
                    {COLOMBIA_DEPARTMENTS.map((dep) => (
                      <option key={dep} value={dep}>{dep}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Ciudad</label>
                  <select
                    value={shipping.city}
                    onChange={(e) => handleShipping("city", e.target.value)}
                    required
                    disabled={!shipping.department}
                    className={inputClass}
                  >
                    <option value="">
                      {shipping.department ? "Selecciona una ciudad" : "Primero selecciona un departamento"}
                    </option>
                    {(COLOMBIA_LOCATIONS[shipping.department] ?? []).map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Código de referido */}
          <div>
            <SectionTitle>Código de referido</SectionTitle>
            <div>
              <label htmlFor="referralCode" className={labelClass}>
                Código de referido{" "}
                <span className="text-zinc-400 font-normal">(opcional)</span>
              </label>
              <input
                id="referralCode"
                name="referralCode"
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                maxLength={8}
                className={`${inputClass} uppercase font-mono`}
                placeholder="ABC12345"
              />
              {referralCode && (
                <p className="mt-1 text-xs text-green-600">
                  ✓ Código de referido aplicado
                </p>
              )}
            </div>
          </div>

          {/* Aceptación legal */}
          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                required
                className="mt-0.5 w-4 h-4 flex-shrink-0 accent-primary rounded"
              />
              <span className="text-sm text-zinc-700">
                He leído y acepto los{" "}
                <a
                  href="/terminos-servicio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                >
                  términos y condiciones
                </a>{" "}
                del servicio.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedDataPolicy}
                onChange={(e) => setAcceptedDataPolicy(e.target.checked)}
                required
                className="mt-0.5 w-4 h-4 flex-shrink-0 accent-primary rounded"
              />
              <span className="text-sm text-zinc-700">
                He leído y acepto la{" "}
                <a
                  href="/politica-tratamiento-datos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                >
                  política de tratamiento de datos
                </a>.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading || !acceptedTerms || !acceptedDataPolicy}
            className="w-full cursor-pointer py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading
              ? "Procesando..."
              : `Continuar al pago — $${plan.price.toLocaleString("es-CO")} COP/mes`}
          </button>

          <p className="text-xs text-center text-zinc-500">
            Serás redirigido a Mercado Pago para autorizar el cobro mensual automático
          </p>
        </form>
      </div>

      <p className="text-center text-sm text-zinc-600">
        ¿Ya tienes una cuenta?{" "}
        <a href="/auth/login" className="font-medium text-primary hover:text-primary/90">
          Inicia sesión aquí
        </a>
      </p>
    </div>
  )
}
