"use client"

import { Star } from "lucide-react"

interface PointsBannerProps {
  points: number
  lost?: boolean
  className?: string
}

/**
 * Banner inline que aparece cuando el usuario gana o pierde puntos.
 * Úsalo junto al mensaje de éxito/error del formulario.
 */
export function PointsBanner({ points, lost = false, className = "" }: PointsBannerProps) {
  if (points <= 0) return null

  if (lost) {
    return (
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border bg-red-50 border-red-200 text-red-700 ${className}`}>
        <Star className="w-4 h-4 shrink-0" />
        <span className="text-sm font-medium">
          -{points} pts por cancelar la cita
        </span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border bg-amber-50 border-amber-200 text-amber-800 ${className}`}>
      <Star className="w-4 h-4 shrink-0 text-amber-500" fill="currentColor" />
      <span className="text-sm font-semibold">
        ¡Ganaste {points} puntos!
      </span>
    </div>
  )
}
