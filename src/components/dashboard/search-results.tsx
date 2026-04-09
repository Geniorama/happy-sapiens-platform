"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Users, Handshake, Tag, Loader2 } from "lucide-react"

interface Coach {
  id: string
  name: string
  specialization: string | null
  image: string | null
}

interface Partner {
  id: string
  name: string
  category: string | null
  logo_url: string | null
  discount_percentage: number | null
  discount_description: string | null
}

interface Coupon {
  id: string
  title: string | null
  description: string | null
  cover_image_url: string | null
  discount_percentage: number | null
  discount_description: string | null
  partner: {
    id: string
    name: string
    logo_url: string | null
  }
}

interface SearchData {
  coaches: Coach[]
  partners: Partner[]
  coupons: Coupon[]
}

export function SearchResults({ query }: { query: string }) {
  const [data, setData] = useState<SearchData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData({ coaches: [], partners: [], coupons: [] }))
      .finally(() => setLoading(false))
  }, [query])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="ml-2 text-sm text-zinc-500">Buscando...</span>
      </div>
    )
  }

  if (!data) return null

  const hasResults = data.coaches.length > 0 || data.partners.length > 0 || data.coupons.length > 0

  if (!hasResults) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500 text-sm">No se encontraron resultados para &ldquo;{query}&rdquo;</p>
        <p className="text-zinc-400 text-xs mt-1">Intenta con otros términos de búsqueda</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Coaches */}
      {data.coaches.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-heading uppercase text-zinc-900">Coaches</h2>
            <span className="text-xs text-zinc-400">({data.coaches.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.coaches.map((coach) => (
              <Link
                key={coach.id}
                href={`/dashboard/coaches?coach=${coach.id}`}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-zinc-200 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                {coach.image ? (
                  <Image
                    src={coach.image}
                    alt={coach.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-semibold text-sm">
                      {coach.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{coach.name}</p>
                  {coach.specialization && (
                    <p className="text-xs text-zinc-500 truncate">{coach.specialization}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Aliados */}
      {data.partners.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Handshake className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-heading uppercase text-zinc-900">Aliados</h2>
            <span className="text-xs text-zinc-400">({data.partners.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.partners.map((partner) => (
              <Link
                key={partner.id}
                href="/dashboard/partners"
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-zinc-200 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                {partner.logo_url ? (
                  <Image
                    src={partner.logo_url}
                    alt={partner.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-lg object-contain bg-white"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                    <Handshake className="w-5 h-5 text-zinc-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{partner.name}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {partner.discount_description || (partner.discount_percentage ? `${partner.discount_percentage}% de descuento` : partner.category || "")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Cupones */}
      {data.coupons.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-heading uppercase text-zinc-900">Cupones</h2>
            <span className="text-xs text-zinc-400">({data.coupons.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.coupons.map((coupon) => (
              <Link
                key={coupon.id}
                href="/dashboard/partners"
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-zinc-200 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                {coupon.partner?.logo_url ? (
                  <Image
                    src={coupon.partner.logo_url}
                    alt={coupon.partner.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-lg object-contain bg-white"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                    <Tag className="w-5 h-5 text-zinc-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">
                    {coupon.title || coupon.partner?.name}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {coupon.discount_description || coupon.description || (coupon.discount_percentage ? `${coupon.discount_percentage}% de descuento` : "")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
