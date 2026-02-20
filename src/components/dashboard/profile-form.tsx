"use client"

import { useState } from "react"
import { User, Phone, Calendar, Users } from "lucide-react"
import { updateProfile } from "@/app/dashboard/profile/actions"

interface ProfileFormProps {
  user: {
    name?: string | null
    email?: string | null
    phone?: string | null
    birth_date?: string | null
    gender?: string | null
  }
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const result = await updateProfile(formData)

    if (result.error) {
      setMessage({ type: "error", text: result.error })
    } else {
      setMessage({ type: "success", text: "Perfil actualizado correctamente" })
      setIsEditing(false)
    }

    setIsLoading(false)
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return ""
    return new Date(dateString).toISOString().split("T")[0]
  }

  const getGenderLabel = (gender: string | null | undefined) => {
    const labels: Record<string, string> = {
      male: "Masculino",
      female: "Femenino",
      other: "Otro",
      "prefer-not-say": "Prefiero no decir",
    }
    return gender ? labels[gender] || gender : "No especificado"
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-heading text-zinc-900">Información Personal</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
          >
            Editar
          </button>
        )}
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
              <User className="w-4 h-4" strokeWidth={1.5} />
              Nombre completo
            </label>
            <input
              type="text"
              name="name"
              defaultValue={user.name || ""}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Tu nombre completo"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
              <Phone className="w-4 h-4" strokeWidth={1.5} />
              Teléfono / WhatsApp
            </label>
            <input
              type="tel"
              name="phone"
              defaultValue={user.phone || ""}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="+54 9 11 1234 5678"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
              <Calendar className="w-4 h-4" strokeWidth={1.5} />
              Fecha de nacimiento
            </label>
            <input
              type="date"
              name="birthDate"
              defaultValue={formatDate(user.birth_date)}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
              <Users className="w-4 h-4" strokeWidth={1.5} />
              Género
            </label>
            <select
              name="gender"
              defaultValue={user.gender || ""}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
            >
              <option value="">Selecciona una opción</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
              <option value="other">Otro</option>
              <option value="prefer-not-say">Prefiero no decir</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setMessage(null)
              }}
              disabled={isLoading}
              className="px-6 py-3 border border-zinc-300 text-zinc-700 font-medium rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
              <User className="w-4 h-4" strokeWidth={1.5} />
              Nombre completo
            </label>
            <div className="px-4 py-3 bg-zinc-50 rounded-lg border border-zinc-200">
              <p className="text-zinc-900">{user.name || "No especificado"}</p>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
              <Phone className="w-4 h-4" strokeWidth={1.5} />
              Teléfono / WhatsApp
            </label>
            <div className="px-4 py-3 bg-zinc-50 rounded-lg border border-zinc-200">
              <p className="text-zinc-900">{user.phone || "No especificado"}</p>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
              <Calendar className="w-4 h-4" strokeWidth={1.5} />
              Fecha de nacimiento
            </label>
            <div className="px-4 py-3 bg-zinc-50 rounded-lg border border-zinc-200">
              <p className="text-zinc-900">
                {user.birth_date
                  ? new Date(user.birth_date).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "No especificada"}
              </p>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
              <Users className="w-4 h-4" strokeWidth={1.5} />
              Género
            </label>
            <div className="px-4 py-3 bg-zinc-50 rounded-lg border border-zinc-200">
              <p className="text-zinc-900">{getGenderLabel(user.gender)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
