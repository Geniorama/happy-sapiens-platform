"use client"

import { useState, useEffect } from "react"
import { Copy, Check, Share2, Users, Gift, History, Star } from "lucide-react"

interface ReferralHistoryItem {
  id: string
  name: string
  status: string
  joined_at: string
  points_earned: number
}

interface ReferralCodeProps {
  referralCode: string
  referralStats?: {
    total_referrals: number
    active_referrals: number
  } | null
  referralHistory?: ReferralHistoryItem[]
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active: { label: "Activo", className: "bg-green-50 text-green-700 border-green-200" },
  paused: { label: "Pausado", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  cancelled: { label: "Cancelado", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  past_due: { label: "Vencido", className: "bg-red-50 text-red-700 border-red-200" },
  inactive: { label: "Inactivo", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function ReferralCode({ referralCode, referralStats, referralHistory = [] }: ReferralCodeProps) {
  const [copied, setCopied] = useState(false)
  const [referralUrl, setReferralUrl] = useState("")

  useEffect(() => {
    // Construir la URL solo en el cliente
    setReferralUrl(`${window.location.origin}/subscribe?ref=${referralCode}`)
  }, [referralCode])

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (!referralUrl) return
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Únete a Happy Sapiens',
          text: `¡Únete a Happy Sapiens con mi código de referido y obtén beneficios exclusivos!`,
          url: referralUrl,
        })
      } catch (error) {
        // Usuario canceló o error
        console.log('Share cancelled')
      }
    } else {
      // Fallback: copiar al portapapeles
      handleCopy(referralUrl)
    }
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Gift className="w-5 h-5 text-primary" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-heading text-zinc-900">Programa de Referidos</h2>
          <p className="text-sm text-zinc-600">Invita amigos y obtén beneficios</p>
        </div>
      </div>

      {/* Código de referido */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          Tu código de referido
        </label>
        <div className="flex gap-2">
          <div className="flex-1 px-4 py-3 bg-primary/5 rounded-lg border-2 border-primary/20">
            <code className="text-lg sm:text-xl lg:text-2xl font-mono font-bold text-primary tracking-widest">
              {referralCode}
            </code>
          </div>
          <button
            onClick={() => handleCopy(referralCode)}
            className="px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
            title="Copiar código"
          >
            {copied ? (
              <Check className="w-5 h-5" strokeWidth={2} />
            ) : (
              <Copy className="w-5 h-5" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      {/* URL de referido */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          Tu link de invitación
        </label>
        <div className="flex gap-2">
          <div className="flex-1 px-4 py-3 bg-zinc-50 rounded-lg border border-zinc-200 overflow-hidden">
            <p className="text-sm text-zinc-900 truncate">
              {referralUrl || 'Cargando...'}
            </p>
          </div>
          <button
            onClick={() => handleCopy(referralUrl)}
            disabled={!referralUrl}
            className="px-4 py-3 border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Copiar link"
          >
            <Copy className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <button
            onClick={handleShare}
            disabled={!referralUrl}
            className="px-4 py-3 border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Compartir"
          >
            <Share2 className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      {referralStats && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/20 rounded-lg border border-secondary">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="w-4 h-4 text-zinc-600" strokeWidth={1.5} />
              <p className="text-sm text-zinc-600">Total referidos</p>
            </div>
            <p className="text-3xl font-heading text-zinc-900">
              {referralStats.total_referrals}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Check className="w-4 h-4 text-green-600" strokeWidth={2} />
              <p className="text-sm text-zinc-600">Activos</p>
            </div>
            <p className="text-3xl font-heading text-green-600">
              {referralStats.active_referrals}
            </p>
          </div>
        </div>
      )}

      {/* Historial de referidos */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-zinc-500" strokeWidth={1.75} />
          <h3 className="text-sm font-semibold text-zinc-900">Historial de referidos</h3>
        </div>
        {referralHistory.length === 0 ? (
          <div className="p-4 bg-zinc-50 rounded-lg border border-dashed border-zinc-300 text-center">
            <p className="text-sm text-zinc-500">
              Aún nadie ha usado tu código. ¡Compártelo para empezar a ver tu historial!
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 overflow-hidden">
            {referralHistory.map((item) => {
              const status = STATUS_LABELS[item.status] ?? STATUS_LABELS.inactive
              return (
                <li
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 bg-white hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{item.name}</p>
                      <p className="text-xs text-zinc-500">Se unió el {formatDate(item.joined_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 pl-12 sm:pl-0 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${status.className}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {status.label}
                    </span>
                    {item.points_earned > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3" fill="currentColor" strokeWidth={0} />
                        +{item.points_earned}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Información */}
      <div className="mt-6 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
        <p className="text-sm text-zinc-600 mb-3">
          <strong className="text-zinc-900">¿Cómo funciona?</strong>
        </p>
        <ul className="space-y-2 text-sm text-zinc-600">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" strokeWidth={2} />
            <span>Comparte tu código o link con amigos</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" strokeWidth={2} />
            <span>Ellos se registran usando tu código</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" strokeWidth={2} />
            <span>Ambos obtienen beneficios exclusivos</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
