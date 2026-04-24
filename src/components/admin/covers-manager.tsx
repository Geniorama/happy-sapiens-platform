"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { Upload, Loader2, X, Check, ImageIcon, Eye, EyeOff } from "lucide-react"
import { updateCover, uploadCoverImage } from "@/app/admin/covers/actions"

interface Cover {
  id: string
  section_key: string
  title: string | null
  subtitle: string | null
  image_url: string | null
  is_active: boolean
}

const SECTION_LABELS: Record<string, string> = {
  profile: "Mi Perfil",
  subscription: "Mi Suscripción",
  points: "Mis Puntos",
  partners: "Aliados",
  coaches: "Ritual Coaches",
  help: "Ayuda",
}

function CoverCard({ cover }: { cover: Cover }) {
  const [title, setTitle] = useState(cover.title || "")
  const [subtitle, setSubtitle] = useState(cover.subtitle || "")
  const [imageUrl, setImageUrl] = useState(cover.image_url || "")
  const [isActive, setIsActive] = useState(cover.is_active)
  const [isPending, startTransition] = useTransition()
  const [isUploading, startUpload] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Sincronizar con datos del servidor tras revalidación
  useEffect(() => {
    setTitle(cover.title || "")
    setSubtitle(cover.subtitle || "")
    setImageUrl(cover.image_url || "")
    setIsActive(cover.is_active)
  }, [cover.title, cover.subtitle, cover.image_url, cover.is_active])

  const handleSave = () => {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateCover(cover.section_key, {
        title,
        subtitle,
        image_url: imageUrl,
        is_active: isActive,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    startUpload(async () => {
      const fd = new FormData()
      fd.append("file", file)
      const result = await uploadCoverImage(fd)
      if (result.error) {
        setError(result.error)
      } else if (result.url) {
        setImageUrl(result.url)
      }
      if (fileRef.current) fileRef.current.value = ""
    })
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
      {/* Preview */}
      <div className="relative h-48 bg-zinc-100">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-300">
            <ImageIcon className="w-12 h-12 mb-2" />
            <span className="text-sm">Sin imagen de portada</span>
          </div>
        )}
        {/* Overlay with title preview */}
        {imageUrl && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col justify-end p-4">
            <p className="text-white font-heading text-xl uppercase">{title || SECTION_LABELS[cover.section_key]}</p>
            {subtitle && <p className="text-white/80 text-sm">{subtitle}</p>}
          </div>
        )}
        {/* Active badge */}
        <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${
          isActive ? "bg-green-100 text-green-700" : "bg-zinc-200 text-zinc-500"
        }`}>
          {isActive ? "Visible" : "Oculta"}
        </div>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded">
            {SECTION_LABELS[cover.section_key] || cover.section_key}
          </span>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              isActive
                ? "text-green-700 bg-green-50 hover:bg-green-100"
                : "text-zinc-500 bg-zinc-100 hover:bg-zinc-200"
            }`}
          >
            {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {isActive ? "Visible" : "Oculta"}
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={SECTION_LABELS[cover.section_key]}
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Subtítulo</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Descripción breve de la sección"
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Imagen de portada</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isUploading}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm border border-dashed border-zinc-300 rounded-lg text-zinc-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </button>
            {imageUrl && (
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="shrink-0 flex items-center px-2 py-2 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
          <p className="text-xs text-zinc-400 mt-1">Recomendado: 1200x400px. JPG, PNG, WebP. Máximo 5MB.</p>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          {isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
          ) : saved ? (
            <><Check className="w-4 h-4" /> Guardado</>
          ) : (
            "Guardar cambios"
          )}
        </button>
      </div>
    </div>
  )
}

export function CoversManager({ covers }: { covers: Cover[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {covers.map((cover) => (
        <CoverCard key={cover.id} cover={cover} />
      ))}
    </div>
  )
}
