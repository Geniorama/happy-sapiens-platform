"use client"

import { useState } from "react"
import { ExternalLink, Tag, Ticket, Calendar, Info, Package, User } from "lucide-react"
import { assignCoupon } from "@/app/dashboard/partners/actions"

interface Coupon {
  id: string
  title: string | null
  description: string | null
  cover_image_url: string | null
  expires_at: string | null
  max_per_user: number | null
  partner: {
    id: string
    name: string
    website_url: string | null
    category: string | null
    discount_percentage: number | null
    discount_description: string | null
    cover_image_url: string | null
    logo_url: string | null
    terms_and_conditions: string | null
  }
}

interface AvailableCouponCardProps {
  coupon: Coupon
  userId: string
  availableCount: number
  userObtainedCount: number
  maxPerUser: number | null
}

export function AvailableCouponCard({ coupon, userId, availableCount, userObtainedCount, maxPerUser }: AvailableCouponCardProps) {
  const [isAssigning, setIsAssigning] = useState(false)
  const [localCount, setLocalCount] = useState(availableCount)
  const [localUserCount, setLocalUserCount] = useState(userObtainedCount)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  
  const hasReachedLimit = maxPerUser !== null && localUserCount >= maxPerUser
  const canObtain = localCount > 0 && !hasReachedLimit

  const handleAssignCoupon = async () => {
    if (!canObtain) {
      if (hasReachedLimit) {
        setMessage({ type: "error", text: `Ya obtuviste el máximo de ${maxPerUser} cupones de esta campaña` })
      } else {
        setMessage({ type: "error", text: "No hay cupones disponibles" })
      }
      return
    }

    setIsAssigning(true)
    setMessage(null)

    const result = await assignCoupon(coupon.partner.id, coupon.title, coupon.description)

    if (result.error) {
      setMessage({ type: "error", text: result.error })
    } else {
      setLocalCount(prev => prev - 1)
      setLocalUserCount(prev => prev + 1)
      setMessage({ type: "success", text: "¡Cupón obtenido! Ve a 'Mis Cupones' para verlo" })
      
      // Recargar después de 2 segundos para actualizar la lista
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    }

    setIsAssigning(false)
  }

  const getCategoryColor = (category: string | null) => {
    const colors: Record<string, string> = {
      deportes: "bg-blue-100 text-blue-700",
      nutricion: "bg-green-100 text-green-700",
      tecnologia: "bg-purple-100 text-purple-700",
    }
    return category ? colors[category] || "bg-zinc-100 text-zinc-700" : "bg-zinc-100 text-zinc-700"
  }

  const coverImage = coupon.cover_image_url || coupon.partner.cover_image_url
  const couponTitle = coupon.title || coupon.partner.name
  const couponDescription = coupon.description || coupon.partner.discount_description
  const isExpiringSoon = coupon.expires_at && new Date(coupon.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-200 flex flex-col hover:shadow-md transition-shadow">
      {/* Imagen de Portada */}
      {coverImage && (
        <div className="relative w-full h-48 bg-zinc-100">
          <img
            src={coverImage}
            alt={couponTitle}
            className="w-full h-full object-cover"
          />
          {/* Overlay gradiente */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
          
          {/* Categoría, urgencia e inventario */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
            <div className="flex gap-2 flex-wrap">
              {coupon.partner.category && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(coupon.partner.category)} backdrop-blur-sm`}>
                  <Tag className="w-3 h-3" strokeWidth={2} />
                  {coupon.partner.category}
                </span>
              )}
              {isExpiringSoon && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500 text-white backdrop-blur-sm">
                  <Calendar className="w-3 h-3" strokeWidth={2} />
                  Expira pronto
                </span>
              )}
            </div>
            
            {/* Contador de disponibles */}
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
              localCount > 10 ? 'bg-green-500 text-white' : 
              localCount > 5 ? 'bg-yellow-500 text-white' : 
              'bg-red-500 text-white'
            }`}>
              <Package className="w-3 h-3" strokeWidth={2} />
              {localCount}
            </span>
          </div>

          {/* Título sobre la imagen */}
          <div className="absolute bottom-3 left-3 right-3">
            <div className="flex items-center gap-2 mb-1">
              {coupon.partner.logo_url && (
                <div className="w-5 h-5 rounded-full bg-white p-0.5 flex-shrink-0">
                  <img
                    src={coupon.partner.logo_url}
                    alt={coupon.partner.name}
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
              )}
              <p className="text-sm text-white/90 drop-shadow-lg">{coupon.partner.name}</p>
            </div>
            <h3 className="font-heading uppercase text-lg text-white drop-shadow-lg">
              {couponTitle}
            </h3>
          </div>
        </div>
      )}

      {/* Si no hay imagen */}
      {!coverImage && (
        <div className="w-full h-48 bg-gradient-to-br from-primary/10 to-secondary/20 flex items-center justify-center p-6">
          <div className="text-center">
            {coupon.partner.logo_url ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-white p-1 shadow-md">
                  <img
                    src={coupon.partner.logo_url}
                    alt={coupon.partner.name}
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
                <p className="text-sm text-zinc-600">{coupon.partner.name}</p>
                <h3 className="font-heading uppercase text-lg text-zinc-900">{couponTitle}</h3>
              </div>
            ) : (
              <>
                <Ticket className="w-12 h-12 text-primary/40 mx-auto mb-2" strokeWidth={1} />
                <p className="text-sm text-zinc-600">{coupon.partner.name}</p>
                <h3 className="font-heading uppercase text-lg text-zinc-900">{couponTitle}</h3>
              </>
            )}
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="p-6 flex flex-col flex-grow">
        {/* Descripción */}
        {couponDescription && (
          <p className="text-sm text-zinc-600 mb-4">
            {couponDescription}
          </p>
        )}

        {/* Descuento */}
        {coupon.partner.discount_percentage && (
          <div className="bg-secondary/30 rounded-lg p-3 mb-4">
            <div className="text-2xl font-heading text-primary">
              {coupon.partner.discount_percentage}% OFF
            </div>
          </div>
        )}

        {/* Información adicional */}
        <div className="space-y-2 mb-4 text-xs text-zinc-600">
          {/* Límite por usuario */}
          {maxPerUser !== null && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p>
                  Has obtenido: <span className={`font-semibold ${hasReachedLimit ? 'text-red-600' : 'text-primary'}`}>
                    {localUserCount} de {maxPerUser}
                  </span>
                </p>
                {hasReachedLimit && (
                  <p className="text-red-600 font-medium mt-1">
                    Límite alcanzado
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Fecha de expiración */}
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              {coupon.expires_at && (
                <p>
                  Expira: {new Date(coupon.expires_at).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
              {!coupon.expires_at && <p>Sin fecha de vencimiento</p>}
            </div>
          </div>
        </div>

        {/* Mensaje */}
        {message && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Botones */}
        <div className="mt-auto space-y-2">
          <button
            onClick={handleAssignCoupon}
            disabled={isAssigning || !canObtain}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Ticket className="w-4 h-4" strokeWidth={1.5} />
            {isAssigning ? "Obteniendo..." : 
             hasReachedLimit ? "Límite alcanzado" :
             localCount <= 0 ? "Agotado" : 
             "Obtener Cupón"}
          </button>

          {coupon.partner.website_url && (
            <a
              href={coupon.partner.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-zinc-300 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
              Visitar tienda
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
