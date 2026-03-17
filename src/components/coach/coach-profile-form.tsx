"use client"

import { useState, useTransition } from "react"
import { Loader2, Save } from "lucide-react"
import { updateCoachProfile } from "@/app/coach/actions"

interface CoachProfileFormProps {
  profile: {
    id: string
    name?: string | null
    email?: string | null
    phone?: string | null
    bio?: string | null
    specialization?: string | null
    is_coach_active?: boolean | null
    created_at?: string | null
  }
}

export function CoachProfileForm({ profile }: CoachProfileFormProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [name, setName] = useState(profile.name || "")
  const [phone, setPhone] = useState(profile.phone || "")
  const [bio, setBio] = useState(profile.bio || "")
  const [specialization, setSpecialization] = useState(profile.specialization || "")
  const [isActive, setIsActive] = useState(profile.is_coach_active ?? true)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      setMessage(null)
      const result = await updateCoachProfile({
        name,
        phone,
        bio,
        specialization,
        isActive,
      })
      if (result.error) {
        setMessage({ type: "error", text: result.error })
      } else {
        setMessage({ type: "success", text: "Perfil actualizado correctamente" })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información personal */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
          Información personal
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Tu nombre"
              className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Teléfono</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+54 9 11 1234-5678"
              className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">Email</label>
          <input
            type="email"
            value={profile.email || ""}
            disabled
            className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg bg-zinc-50 text-zinc-400 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Perfil profesional */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
          Perfil profesional
        </h2>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">Especialización</label>
          <input
            type="text"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            placeholder="Ej: Nutrición deportiva, Entrenamiento funcional..."
            className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">Biografía</label>
          <textarea
            rows={5}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Cuéntale a tus clientes sobre tu experiencia y metodología..."
            className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
          />
          <p className="text-xs text-zinc-400 mt-1">
            Esta información será visible para los usuarios al explorar coaches.
          </p>
        </div>
      </div>

      {/* Estado */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900">Perfil activo</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Cuando está activo, los usuarios pueden ver tu perfil y agendar citas
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
              isActive ? "bg-primary" : "bg-zinc-200"
            }`}
            aria-label="Toggle activo"
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                isActive ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>
        {!isActive && (
          <p className="mt-3 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Tu perfil está inactivo. Los usuarios no podrán ver tu perfil ni agendar nuevas citas.
          </p>
        )}
      </div>

      {/* Información de cuenta */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-3">
          Información de cuenta
        </h2>
        <div className="space-y-2 text-xs text-zinc-500">
          <p>
            <span className="font-medium text-zinc-700">Miembro desde: </span>
            {profile.created_at
              ? new Date(profile.created_at).toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "—"}
          </p>
          <p>
            <span className="font-medium text-zinc-700">ID: </span>
            <span className="font-mono">{profile.id}</span>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Guardar cambios
        </button>

        {message && (
          <p
            className={`text-sm ${
              message.type === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </form>
  )
}
