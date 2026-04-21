"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Camera, Upload, X, Loader2 } from "lucide-react"
import { uploadAvatar, deleteAvatar } from "@/app/dashboard/profile/actions"
import { PointsBanner } from "@/components/dashboard/points-banner"

interface AvatarUploadProps {
  currentImage?: string | null
  userName?: string | null
  userId: string
}

export function AvatarUpload({ currentImage, userName, userId }: AvatarUploadProps) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [pointsEarned, setPointsEarned] = useState<number | undefined>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Por favor selecciona una imagen válida" })
      return
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "La imagen debe ser menor a 2MB" })
      return
    }

    setIsUploading(true)
    setMessage(null)

    try {
      // Crear preview local
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Subir a Supabase
      const formData = new FormData()
      formData.append("file", file)
      
      const result = await uploadAvatar(formData)

      if (result.error) {
        setMessage({ type: "error", text: result.error })
        setPreview(currentImage || null)
      } else {
        setMessage({ type: "success", text: "Imagen actualizada correctamente" })
        if (result.pointsEarned) setPointsEarned(result.pointsEarned)
        router.refresh()
      }
    } catch (error) {
      const is413 = error instanceof Error && (
        error.message.includes("Body exceeded") ||
        error.message.includes("413") ||
        (error as { digest?: string }).digest?.includes("413")
      )
      setMessage({
        type: "error",
        text: is413
          ? "La imagen es demasiado grande. El tamaño máximo permitido es 2 MB."
          : "Error al subir la imagen. Intenta de nuevo.",
      })
      setPreview(currentImage || null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de eliminar tu foto de perfil?")) return

    setIsUploading(true)
    setMessage(null)

    const result = await deleteAvatar()

    if (result.error) {
      setMessage({ type: "error", text: result.error })
    } else {
      setPreview(null)
      setMessage({ type: "success", text: "Imagen eliminada correctamente" })
      router.refresh()
    }

    setIsUploading(false)
  }

  return (
    <div className="space-y-4">
      {/* Avatar actual */}
      <div className="flex items-center gap-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {preview ? (
              <img
                src={preview}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-primary font-heading text-4xl">
                {userName?.charAt(0)?.toUpperCase() || "U"}
              </span>
            )}
          </div>
          
          {/* Overlay con botón de cámara */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed cursor-pointer"
          >
            {isUploading ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" strokeWidth={2} />
            ) : (
              <Camera className="w-6 h-6 text-white" strokeWidth={2} />
            )}
          </button>
        </div>

        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-700 mb-2">Foto de perfil</p>
          <p className="text-xs text-zinc-500 mb-3">
            JPG, PNG o GIF. Máximo 2MB.
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Upload className="w-4 h-4" strokeWidth={1.5} />
              Subir nueva
            </button>
            
            {preview && (
              <button
                onClick={handleDelete}
                disabled={isUploading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
                Eliminar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Mensaje de feedback */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {pointsEarned && <PointsBanner points={pointsEarned} />}
    </div>
  )
}
