"use client"

import { useState, useEffect } from "react"
import { Copy, Check, Share2, Users, Gift } from "lucide-react"

interface ReferralCodeProps {
  referralCode: string
  referralStats?: {
    total_referrals: number
    active_referrals: number
  } | null
}

export function ReferralCode({ referralCode, referralStats }: ReferralCodeProps) {
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
