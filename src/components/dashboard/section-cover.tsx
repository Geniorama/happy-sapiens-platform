import { ImageIcon } from "lucide-react"

interface SectionCoverProps {
  title: string
  subtitle?: string
  imageUrl?: string | null
  fallbackTitle: string
  fallbackSubtitle: string
}

export function SectionCover({ title, subtitle, imageUrl, fallbackTitle, fallbackSubtitle }: SectionCoverProps) {
  const displayTitle = title || fallbackTitle
  const displaySubtitle = subtitle || fallbackSubtitle

  return (
    <div className="relative w-full h-40 sm:h-48 lg:h-56 rounded-2xl overflow-hidden mb-6 sm:mb-8">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={displayTitle}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-200 flex items-center justify-center">
          <ImageIcon className="w-16 h-16 text-zinc-300" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6 lg:p-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl uppercase font-heading text-white drop-shadow-lg">
          {displayTitle}
        </h1>
        <p className="text-sm sm:text-base text-white/80 mt-1 drop-shadow">
          {displaySubtitle}
        </p>
      </div>
    </div>
  )
}
