"use client"

import { useState } from "react"
import { Save, AlertCircle } from "lucide-react"
import { saveHealthProfile } from "@/app/dashboard/coaches/actions"

interface HealthProfileFormProps {
  userId: string
  existingProfile?: {
    weight: number | null
    height: number | null
    age: number | null
    gender: string | null
    diseases: string | null
    medications: string | null
    allergies: string | null
    objectives: string | null
    activity_level: string | null
    current_exercise_routine: string | null
    previous_injuries: string | null
    dietary_restrictions: string | null
    additional_notes: string | null
  }
  onComplete?: () => void
}

export function HealthProfileForm({ userId, existingProfile, onComplete }: HealthProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [formData, setFormData] = useState({
    weight: existingProfile?.weight?.toString() || "",
    height: existingProfile?.height?.toString() || "",
    age: existingProfile?.age?.toString() || "",
    gender: existingProfile?.gender || "",
    diseases: existingProfile?.diseases || "",
    medications: existingProfile?.medications || "",
    allergies: existingProfile?.allergies || "",
    objectives: existingProfile?.objectives || "",
    activity_level: existingProfile?.activity_level || "",
    current_exercise_routine: existingProfile?.current_exercise_routine || "",
    previous_injuries: existingProfile?.previous_injuries || "",
    dietary_restrictions: existingProfile?.dietary_restrictions || "",
    additional_notes: existingProfile?.additional_notes || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    // Validar campos requeridos
    if (!formData.weight || !formData.height || !formData.age || !formData.gender || !formData.objectives) {
      setMessage({ 
        type: "error", 
        text: "Por favor completa todos los campos requeridos (*)" 
      })
      setIsSubmitting(false)
      return
    }

    const result = await saveHealthProfile({
      weight: parseFloat(formData.weight),
      height: parseFloat(formData.height),
      age: parseInt(formData.age),
      gender: formData.gender,
      diseases: formData.diseases || null,
      medications: formData.medications || null,
      allergies: formData.allergies || null,
      objectives: formData.objectives,
      activity_level: formData.activity_level || null,
      current_exercise_routine: formData.current_exercise_routine || null,
      previous_injuries: formData.previous_injuries || null,
      dietary_restrictions: formData.dietary_restrictions || null,
      additional_notes: formData.additional_notes || null,
    })

    if (result.error) {
      setMessage({ type: "error", text: result.error })
    } else {
      setMessage({ type: "success", text: "Perfil de salud guardado correctamente" })
      if (onComplete) {
        setTimeout(() => onComplete(), 1500)
      }
    }

    setIsSubmitting(false)
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary" strokeWidth={1.5} />
          <h2 className="text-xl sm:text-2xl font-heading text-zinc-900">
            Perfil de Salud
          </h2>
        </div>
        <p className="text-sm sm:text-base text-zinc-600">
          Completa tu perfil de salud para poder agendar citas con nuestros coaches. 
          Esta información ayudará al coach a prepararse mejor para tu consulta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {message && (
          <div
            className={`p-3 sm:p-4 rounded-lg border ${
              message.type === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Datos Físicos */}
        <div>
          <h3 className="text-lg font-heading text-zinc-900 mb-3 sm:mb-4">Datos Físicos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Peso (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="70.5"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Talla/Altura (cm) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="175"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Edad <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="30"
                required
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Género <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Selecciona una opción</option>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
                <option value="other">Otro</option>
                <option value="prefer-not-say">Prefiero no decir</option>
              </select>
            </div>
          </div>
        </div>

        {/* Información Médica */}
        <div>
          <h3 className="text-lg font-heading text-zinc-900 mb-3 sm:mb-4">Información Médica</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Enfermedades o Condiciones Médicas
              </label>
              <textarea
                value={formData.diseases}
                onChange={(e) => setFormData({ ...formData, diseases: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Ej: Diabetes tipo 2, Hipertensión, Asma..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Medicamentos Actuales
              </label>
              <textarea
                value={formData.medications}
                onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Lista los medicamentos que estás tomando actualmente..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Alergias
              </label>
              <textarea
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Ej: Alergia a la penicilina, alergia al polen..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Lesiones Previas
              </label>
              <textarea
                value={formData.previous_injuries}
                onChange={(e) => setFormData({ ...formData, previous_injuries: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Describe cualquier lesión previa que pueda ser relevante..."
              />
            </div>
          </div>
        </div>

        {/* Objetivos y Actividad */}
        <div>
          <h3 className="text-lg font-heading text-zinc-900 mb-3 sm:mb-4">Objetivos y Actividad</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Objetivos <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.objectives}
                onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Ej: Perder peso, ganar masa muscular, mejorar resistencia, preparación para maratón..."
                required
              />
              <p className="text-xs text-zinc-500 mt-1">
                Describe tus objetivos principales con el coach
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Nivel de Actividad Física
              </label>
              <select
                value={formData.activity_level}
                onChange={(e) => setFormData({ ...formData, activity_level: e.target.value })}
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Selecciona una opción</option>
                <option value="sedentary">Sedentario (poco o nada de ejercicio)</option>
                <option value="light">Ligero (ejercicio ligero 1-3 días/semana)</option>
                <option value="moderate">Moderado (ejercicio moderado 3-5 días/semana)</option>
                <option value="active">Activo (ejercicio intenso 6-7 días/semana)</option>
                <option value="very_active">Muy activo (ejercicio muy intenso, trabajo físico)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Rutina de Ejercicio Actual
              </label>
              <textarea
                value={formData.current_exercise_routine}
                onChange={(e) => setFormData({ ...formData, current_exercise_routine: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Describe tu rutina de ejercicio actual, frecuencia, tipo de ejercicios..."
              />
            </div>
          </div>
        </div>

        {/* Información Adicional */}
        <div>
          <h3 className="text-lg font-heading text-zinc-900 mb-3 sm:mb-4">Información Adicional</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Restricciones Dietéticas
              </label>
              <textarea
                value={formData.dietary_restrictions}
                onChange={(e) => setFormData({ ...formData, dietary_restrictions: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Ej: Vegetariano, vegano, sin gluten, sin lactosa..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Notas Adicionales
              </label>
              <textarea
                value={formData.additional_notes}
                onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Cualquier otra información que consideres relevante para el coach..."
              />
            </div>
          </div>
        </div>

        {/* Botón enviar */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" strokeWidth={1.5} />
            {isSubmitting ? "Guardando..." : "Guardar Perfil"}
          </button>
        </div>
      </form>
    </div>
  )
}
