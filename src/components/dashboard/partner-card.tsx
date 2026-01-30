"use client"

import { useState } from "react"
import { ExternalLink, Tag, Gift, Ticket } from "lucide-react"
import { assignCoupon } from "@/app/dashboard/partners/actions"

interface Partner {
  id: string
  name: string
  description: string | null
  logo_url: string | null
  cover_image_url: string | null
  website_url: string | null
  category: string | null
  discount_percentage: number | null
  discount_description: string | null
  terms_and_conditions: string | null
}

interface PartnerCardProps {
  partner: Partner
  userId: string
}

export function PartnerCard({ partner }: PartnerCardProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleAssignCoupon = async () => {
    setIsGenerating(true)
    setMessage(null)

    const result = await assignCoupon(partner.id)

    if (result.error) {
      setMessage({ type: "error", text: result.error })
    } else {
      setMessage({ type: "success", text: "¡Cupón asignado exitosamente!" })
    }

    setIsGenerating(false)
  }

  const getCategoryColor = (category: string | null) => {
    const colors: Record<string, string> = {
      deportes: "bg-blue-100 text-blue-700",
      nutricion: "bg-green-100 text-green-700",
      tecnologia: "bg-purple-100 text-purple-700",
    }
    return category ? colors[category] || "bg-zinc-100 text-zinc-700" : "bg-zinc-100 text-zinc-700"
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-200 flex flex-col">
      {/* Imagen de Portada */}
      {partner.cover_image_url ? (
        <div className="relative w-full h-48 bg-zinc-100">
          <img
            src={partner.cover_image_url}
            alt={partner.name}
            className="w-full h-full object-cover"
          />
          {/* Overlay gradiente */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
          
          {/* Logo sobre la imagen */}
          {partner.logo_url && (
            <div className="absolute bottom-4 left-4 w-16 h-16 bg-white rounded-xl p-2 shadow-lg">
              <img
                src={partner.logo_url}
                alt={partner.name}
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-primary/10 to-secondary/20 flex items-center justify-center">
          <Gift className="w-16 h-16 text-primary/40" strokeWidth={1} />
        </div>
      )}

      {/* Contenido */}
      <div className="p-6 flex flex-col flex-grow">

      {/* Categoría */}
      {partner.category && (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium w-fit mb-3 ${getCategoryColor(partner.category)}`}>
          <Tag className="w-3 h-3" strokeWidth={2} />
          {partner.category}
        </span>
      )}

      {/* Nombre y descripción */}
      <h3 className="text-xl font-heading text-zinc-900 mb-2">{partner.name}</h3>
      <p className="text-sm text-zinc-600 mb-4 flex-grow">
        {partner.description || "Marca aliada"}
      </p>

      {/* Descuento */}
      {partner.discount_percentage && (
        <div className="bg-secondary/30 rounded-lg p-4 mb-4">
          <div className="text-3xl font-heading text-primary mb-1">
            {partner.discount_percentage}% OFF
          </div>
          <p className="text-sm text-zinc-700">
            {partner.discount_description || "Descuento en toda la tienda"}
          </p>
        </div>
      )}

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
      <div className="space-y-2">
        <button
          onClick={handleAssignCoupon}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Ticket className="w-4 h-4" strokeWidth={1.5} />
          {isGenerating ? "Asignando..." : "Obtener Cupón"}
        </button>

        <div className="flex gap-2">
          {partner.website_url && (
            <a
              href={partner.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-zinc-300 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
              Visitar
            </a>
          )}

          {partner.terms_and_conditions && (
            <button
              onClick={() => setShowTerms(!showTerms)}
              className="flex-1 px-4 py-2 border border-zinc-300 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-50 transition-colors"
            >
              {showTerms ? "Ocultar" : "Ver"} Términos
            </button>
          )}
        </div>
      </div>

      {/* Términos y condiciones */}
      {showTerms && partner.terms_and_conditions && (
        <div className="mt-4 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
          <p className="text-xs text-zinc-600">{partner.terms_and_conditions}</p>
        </div>
      )}
      </div>
    </div>
  )
}
