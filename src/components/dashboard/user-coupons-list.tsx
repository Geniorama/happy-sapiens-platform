"use client"

import { useState } from "react"
import { Copy, Check, ExternalLink, Clock, CheckCircle, XCircle } from "lucide-react"
import { markCouponAsUsed } from "@/app/dashboard/partners/actions"

interface Coupon {
  id: string
  coupon_code: string
  is_assigned: boolean
  assigned_at: string
  used_at: string | null
  expires_at: string | null
  partner: {
    id: string
    name: string
    website_url: string | null
    discount_description: string | null
  }
}

interface UserCouponsListProps {
  coupons: Coupon[]
}

export function UserCouponsList({ coupons }: UserCouponsListProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [isMarkingUsed, setIsMarkingUsed] = useState<string | null>(null)

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

  const getStatusInfo = (usedAt: string | null, expiresAt: string | null) => {
    const now = new Date()
    const expires = expiresAt ? new Date(expiresAt) : null

    if (usedAt) {
      return {
        label: "Usado",
        color: "bg-zinc-100 text-zinc-700",
        icon: CheckCircle,
      }
    }

    if (expires && expires < now) {
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {coupons.map((coupon) => {
        const statusInfo = getStatusInfo(coupon.used_at, coupon.expires_at)
        const StatusIcon = statusInfo.icon
        const isActive = !coupon.used_at && 
          (!coupon.expires_at || new Date(coupon.expires_at) > new Date())

        return (
          <div
            key={coupon.id}
            className="bg-white rounded-xl p-6 shadow-sm border border-zinc-200"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-heading text-lg text-zinc-900 mb-1">
                  {coupon.partner.name}
                </h3>
                {coupon.partner.discount_description && (
                  <p className="text-sm text-zinc-600">
                    {coupon.partner.discount_description}
                  </p>
                )}
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                <StatusIcon className="w-3 h-3" strokeWidth={2} />
                {statusInfo.label}
              </span>
            </div>

            {/* Código de cupón */}
            <div className="bg-secondary/20 rounded-lg p-4 mb-4">
              <p className="text-xs text-zinc-600 mb-1">Código de cupón</p>
              <div className="flex items-center justify-between">
                <code className="text-xl font-mono font-bold text-zinc-900 tracking-wider">
                  {coupon.coupon_code}
                </code>
                <button
                  onClick={() => handleCopy(coupon.coupon_code)}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                  title="Copiar código"
                >
                  {copiedCode === coupon.coupon_code ? (
                    <Check className="w-5 h-5 text-green-600" strokeWidth={2} />
                  ) : (
                    <Copy className="w-5 h-5 text-zinc-600" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {/* Información de fechas */}
            <div className="space-y-2 mb-4 text-xs text-zinc-600">
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

            {/* Botones */}
            {isActive && (
              <div className="flex gap-2">
                {coupon.partner.website_url && (
                  <a
                    href={coupon.partner.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                    Usar ahora
                  </a>
                )}
                <button
                  onClick={() => handleMarkAsUsed(coupon.id)}
                  disabled={isMarkingUsed === coupon.id}
                  className="px-4 py-2 border border-zinc-300 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50"
                >
                  {isMarkingUsed === coupon.id ? "..." : "Marcar como usado"}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
