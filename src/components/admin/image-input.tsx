"use client"

import { useState, useRef, useTransition } from "react"
import { Upload, Link, X, Loader2, ImageIcon } from "lucide-react"
import { uploadPartnerImage } from "@/app/admin/partners/actions"

interface ImageInputProps {
  label: string
  value: string
  onChange: (url: string) => void
  aspectRatio?: "square" | "wide"
}

export function ImageInput({ label, value, onChange, aspectRatio = "square" }: ImageInputProps) {
  const [mode, setMode] = useState<"url" | "file">(value ? "url" : "file")
  const [urlInput, setUrlInput] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const preview = value || (mode === "url" ? urlInput : "")

  const handleUrlChange = (v: string) => {
    setUrlInput(v)
    onChange(v)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    startTransition(async () => {
      const fd = new FormData()
      fd.append("file", file)
      const result = await uploadPartnerImage(fd)
      if (result.error) {
        setError(result.error)
      } else if (result.url) {
        setUrlInput(result.url)
        onChange(result.url)
        setMode("url")
      }
      // reset input so the same file can be re-selected
      if (fileRef.current) fileRef.current.value = ""
    })
  }

  const handleClear = () => {
    setUrlInput("")
    onChange("")
    setError(null)
  }

  const previewClass = aspectRatio === "wide"
    ? "w-full h-28 rounded-lg object-cover"
    : "w-20 h-20 rounded-lg object-contain bg-zinc-100"

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-zinc-700">{label}</label>
        {/* Mode toggle */}
        <div className="flex rounded-lg border border-zinc-200 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`flex items-center gap-1 px-2.5 py-1 transition-colors cursor-pointer ${
              mode === "file" ? "bg-amber-600 text-white" : "text-zinc-500 hover:bg-zinc-50"
            }`}
          >
            <Upload className="w-3 h-3" />
            Archivo
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`flex items-center gap-1 px-2.5 py-1 transition-colors cursor-pointer ${
              mode === "url" ? "bg-amber-600 text-white" : "text-zinc-500 hover:bg-zinc-50"
            }`}
          >
            <Link className="w-3 h-3" />
            URL
          </button>
        </div>
      </div>

      <div className="flex gap-3 items-start">
        {/* Preview */}
        <div className={`shrink-0 ${aspectRatio === "wide" ? "hidden" : ""}`}>
          {preview ? (
            <div className="relative group">
              <img src={preview} alt="" className="w-20 h-20 rounded-lg object-contain bg-zinc-100 border border-zinc-200" />
              <button
                type="button"
                onClick={handleClear}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-zinc-300" />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex-1 space-y-2">
          {mode === "url" ? (
            <input
              type="url"
              value={urlInput}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://..."
              className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          ) : (
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm border border-dashed border-zinc-300 rounded-lg text-zinc-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Seleccionar imagen</>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
              <p className="text-xs text-zinc-400 mt-1">JPG, PNG, WebP. Máximo 5MB.</p>
            </div>
          )}

          {/* Wide preview */}
          {aspectRatio === "wide" && preview && (
            <div className="relative group">
              <img src={preview} alt="" className={previewClass} />
              <button
                type="button"
                onClick={handleClear}
                className="absolute top-1 right-1 w-5 h-5 bg-zinc-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}
