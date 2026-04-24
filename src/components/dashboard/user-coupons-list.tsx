"use client"

import { useState } from "react"
import { Copy, Check, ExternalLink, Clock, CheckCircle, XCircle, FileText, X } from "lucide-react"
import { markCouponAsUsed } from "@/app/dashboard/partners/actions"

interface Coupon {
  id: string
  coupon_code: string
  title: string | null
  description: string | null
  cover_image_url: string | null
  is_assigned: boolean
  assigned_at: string
  used_at: string | null
  expires_at: string | null
  terms_and_conditions: string | null
  discount_percentage: number | null
  discount_description: string | null
  partner: {
    id: string
    name: string
    website_url: string | null
    discount_percentage: number | null
    discount_description: string | null
    cover_image_url: string | null
    logo_url: string | null
    terms_and_conditions: string | null
  }
}

interface UserCouponsListProps {
  coupons: Coupon[]
}

export function UserCouponsList({ coupons }: UserCouponsListProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [isMarkingUsed, setIsMarkingUsed] = useState<string | null>(null)
  const [termsModalCouponId, setTermsModalCouponId] = useState<string | null>(null)

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleMarkAsUsed = async (couponId: string) => {
    setIsMarkingUsed(couponId)
    await markCouponAsUsed(couponId)
    setIsMarkingUsed(null)
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    const expires = new Date(expiresAt)
    // El cupón vence al final del día (UTC) indicado, no al inicio
    const expiresEndOfDay = Date.UTC(
      expires.getUTCFullYear(),
      expires.getUTCMonth(),
      expires.getUTCDate() + 1,
    )
    return Date.now() >= expiresEndOfDay
  }

  const getStatusInfo = (usedAt: string | null, expiresAt: string | null) => {
    if (usedAt) {
      return {
        label: "Usado",
        color: "bg-zinc-100 text-zinc-700",
        icon: CheckCircle,
      }
    }

    if (isExpired(expiresAt)) {
      return {
        label: "Expirado",
        color: "bg-red-100 text-red-700",
        icon: XCircle,
      }
    }

    return {
      label: "Activo",
      color: "bg-green-100 text-green-700",
      icon: Clock,
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {coupons.map((coupon) => {
        const statusInfo = getStatusInfo(coupon.used_at, coupon.expires_at)
        const StatusIcon = statusInfo.icon
        const isActive = !coupon.used_at && !isExpired(coupon.expires_at)
        
        // Usar imagen del cupón, si no existe usar la de la marca
        const coverImage = coupon.cover_image_url || coupon.partner.cover_image_url
        const couponTitle = coupon.title || coupon.partner.name
        const couponDescription = coupon.description || coupon.partner.discount_description
        const discountPercentage = coupon.discount_percentage ?? coupon.partner.discount_percentage
        const discountDescriptionText = coupon.discount_description || coupon.partner.discount_description

        return (
          <div
            key={coupon.id}
            className="bg-white rounded-xl overflow-hidden shadow-sm border border-zinc-200"
          >
            {/* Imagen de Portada */}
            {coverImage && (
              <div className="relative w-full h-20 bg-zinc-100">
                <img
                  src={coverImage}
                  alt={couponTitle}
                  className="w-full h-full object-cover"
                />
                {/* Overlay gradiente */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
                
                {/* Badge de estado sobre la imagen */}
                <span className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color} backdrop-blur-sm`}>
                  <StatusIcon className="w-2.5 h-2.5" strokeWidth={2} />
                  {statusInfo.label}
                </span>

                {/* Título sobre la imagen */}
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="flex items-center gap-1.5">
                    {coupon.partner.logo_url && (
                      <div className="w-4 h-4 rounded-full bg-white p-0.5 flex-shrink-0">
                        <img
                          src={coupon.partner.logo_url}
                          alt={coupon.partner.name}
                          className="w-full h-full object-contain rounded-full"
                        />
                      </div>
                    )}
                    <h3 className="font-heading text-base text-white drop-shadow-lg truncate">
                      {couponTitle}
                    </h3>
                  </div>
                </div>
              </div>
            )}

            {/* Contenido */}
            <div className="p-4">
              {/* Header (si no hay imagen) */}
              {!coverImage && (
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {coupon.partner.logo_url && (
                      <div className="w-5 h-5 rounded-full bg-white border border-zinc-200 p-0.5 flex-shrink-0 shadow-sm">
                        <img
                          src={coupon.partner.logo_url}
                          alt={coupon.partner.name}
                          className="w-full h-full object-contain rounded-full"
                        />
                      </div>
                    )}
                    <h3 className="font-heading text-base text-zinc-900 truncate">
                      {couponTitle}
                    </h3>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color} flex-shrink-0 ml-2`}>
                    <StatusIcon className="w-2.5 h-2.5" strokeWidth={2} />
                    {statusInfo.label}
                  </span>
                </div>
              )}

              {/* Descripción */}
              {couponDescription && (
                <p className="text-sm text-zinc-600 mb-3 line-clamp-2">
                  {couponDescription}
                </p>
              )}

            {/* Descuento */}
            {(discountPercentage || discountDescriptionText) && (
              <div className="bg-secondary/30 rounded-lg p-2.5 mb-3">
                {discountPercentage && (
                  <div className="text-lg font-heading text-primary">
                    {discountPercentage}% OFF
                  </div>
                )}
                {discountDescriptionText && (
                  <p className={`text-xs text-zinc-600 ${discountPercentage ? "mt-0.5" : ""}`}>{discountDescriptionText}</p>
                )}
              </div>
            )}

            {/* Código de cupón */}
            <div className="bg-secondary/20 rounded-lg p-2.5 mb-3">
              <p className="text-xs text-zinc-600 mb-1">Código de cupón</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-lg font-mono font-bold text-zinc-900 tracking-wider truncate flex-1">
                  {coupon.coupon_code}
                </code>
                <button
                  onClick={() => handleCopy(coupon.coupon_code)}
                  className="p-1.5 hover:bg-white rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                  title="Copiar código"
                >
                  {copiedCode === coupon.coupon_code ? (
                    <Check className="w-4 h-4 text-green-600" strokeWidth={2} />
                  ) : (
                    <Copy className="w-4 h-4 text-zinc-600" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {/* Información de fechas */}
            <div className="space-y-1 mb-3 text-xs text-zinc-600">
              <div className="flex justify-between">
                <span>Asignado:</span>
                <span>
                  {new Date(coupon.assigned_at).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              {coupon.expires_at && (
                <div className="flex justify-between">
                  <span>Expira:</span>
                  <span>
                    {new Date(coupon.expires_at).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                </div>
              )}
              {coupon.used_at && (
                <div className="flex justify-between">
                  <span>Usado:</span>
                  <span>
                    {new Date(coupon.used_at).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Términos y condiciones (siempre visibles para este cupón) */}
            <div className="mb-3 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setTermsModalCouponId(coupon.id)}
                className="inline-flex items-center gap-1.5 text-xs text-primary underline underline-offset-2 hover:text-primary/80 transition-colors cursor-pointer"
              >
                <FileText className="w-3 h-3" strokeWidth={1.5} />
                Términos y condiciones
              </button>
            </div>

            {/* Botones */}
            {isActive && (
              <div className="flex gap-1.5">
                {coupon.partner.website_url && (
                  <a
                    href={coupon.partner.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Usar ahora
                  </a>
                )}
                <button
                  onClick={() => handleMarkAsUsed(coupon.id)}
                  disabled={isMarkingUsed === coupon.id}
                  className="px-3 py-2 border border-zinc-300 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                >
                  {isMarkingUsed === coupon.id ? "..." : "Usado"}
                </button>
              </div>
            )}
            </div>
          </div>
        )
      })}

      {/* Modal de términos y condiciones */}
      {termsModalCouponId && (() => {
        const coupon = coupons.find((c) => c.id === termsModalCouponId)
        if (!coupon) return null
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 cursor-pointer"
            onClick={() => setTermsModalCouponId(null)}
          >
            <div
              className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 shrink-0">
                <h3 className="font-heading text-base text-zinc-900">Términos y condiciones</h3>
                <button
                  type="button"
                  onClick={() => setTermsModalCouponId(null)}
                  className="p-1 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors cursor-pointer"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto text-sm text-zinc-600 space-y-3">
                {coupon.terms_and_conditions ? (
                  <>
                    <p className="whitespace-pre-wrap">{coupon.terms_and_conditions}</p>
                    {coupon.partner.terms_and_conditions && (
                      <>
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide pt-2 border-t border-zinc-100">
                          Condiciones generales de {coupon.partner.name}
                        </p>
                        <p className="whitespace-pre-wrap text-zinc-500">{coupon.partner.terms_and_conditions}</p>
                      </>
                    )}
                  </>
                ) : coupon.partner.terms_and_conditions ? (
                  <p className="whitespace-pre-wrap">{coupon.partner.terms_and_conditions}</p>
                ) : (
                  <p>{`Aplican las condiciones de uso de ${coupon.partner.name}. Consulta su web para más información.`}</p>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
