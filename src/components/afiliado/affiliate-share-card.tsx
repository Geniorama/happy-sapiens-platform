"use client"

import { useState, useEffect } from "react"
import { Copy, Check, Share2, Gift } from "lucide-react"

interface AffiliateShareCardProps {
  referralCode: string
  rewardPercent: number
}

export function AffiliateShareCard({ referralCode, rewardPercent }: AffiliateShareCardProps) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [referralUrl, setReferralUrl] = useState("")

  useEffect(() => {
    setReferralUrl(`${window.location.origin}/subscribe?ref=${referralCode}`)
  }, [referralCode])

  const copy = async (text: string, which: "code" | "url") => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    if (which === "code") {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } else {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    }
  }

  const handleShare = async () => {
    if (!referralUrl) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Únete a Happy Sapiens",
          text: "¡Únete a Happy Sapiens con mi enlace y empieza tu bienestar!",
          url: referralUrl,
        })
      } catch {
        // Usuario canceló
      }
    } else {
      copy(referralUrl, "url")
    }
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5 text-primary" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-lg font-heading text-zinc-900">Tu enlace de afiliado</h2>
          <p className="text-sm text-zinc-600">
            Ganas el {rewardPercent}% del plan por cada referido que se suscribe
          </p>
        </div>
      </div>

      {/* Código */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-zinc-700 mb-2">Tu código</label>
        <div className="flex gap-2">
          <div className="flex-1 px-4 py-3 bg-primary/5 rounded-lg border-2 border-primary/20">
            <code className="text-lg sm:text-xl font-mono font-bold text-primary tracking-widest">
              {referralCode}
            </code>
          </div>
          <button
            onClick={() => copy(referralCode, "code")}
            className="px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
            title="Copiar código"
          >
            {copiedCode ? <Check className="w-5 h-5" strokeWidth={2} /> : <Copy className="w-5 h-5" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Link */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">Tu link de invitación</label>
        <div className="flex gap-2">
          <div className="flex-1 px-4 py-3 bg-zinc-50 rounded-lg border border-zinc-200 overflow-hidden">
            <p className="text-sm text-zinc-900 truncate">{referralUrl || "Cargando..."}</p>
          </div>
          <button
            onClick={() => copy(referralUrl, "url")}
            disabled={!referralUrl}
            className="px-4 py-3 border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Copiar link"
          >
            {copiedUrl ? <Check className="w-5 h-5" strokeWidth={2} /> : <Copy className="w-5 h-5" strokeWidth={1.5} />}
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
    </div>
  )
}
