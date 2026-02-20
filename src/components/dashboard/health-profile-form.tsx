"use client"

import { useState } from "react"
import { Save, AlertCircle, Laugh, Smile, Meh, Frown, Angry, BatteryLow, Battery, BatteryMedium, BatteryFull, BatteryCharging } from "lucide-react"
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
    consultation_reason?: string | null
    occupation?: string | null
    supplements?: string | null
    surgeries?: string | null
    intolerances?: string | null
    family_history?: string | null
    waist_circumference?: number | null
    body_fat_percent?: number | null
    exercise_type?: string | null
    exercise_frequency?: string | null
    sleep_hours?: number | null
    stress_level?: number | null
    work_type?: string | null
    energy_level?: number | null
    digestion?: string | null
    mood?: string | null
    concentration?: string | null
  }
  onComplete?: () => void
}

export function HealthProfileForm({ userId, existingProfile, onComplete }: HealthProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [formData, setFormData] = useState({
    // 1. Datos básicos
    age: existingProfile?.age?.toString() || "",
    gender: existingProfile?.gender || "",
    occupation: existingProfile?.occupation || "",
    // Motivo de consulta se diligencia en cada agendamiento, no en el perfil
    // 2. Antecedentes médicos
    diseases: existingProfile?.diseases || "",
    medications: existingProfile?.medications || "",
    supplements: existingProfile?.supplements || "",
    surgeries: existingProfile?.surgeries || "",
    allergies: existingProfile?.allergies || "",
    intolerances: existingProfile?.intolerances || "",
    family_history: existingProfile?.family_history || "",
    // 3. Antropométrica
    weight: existingProfile?.weight?.toString() || "",
    height: existingProfile?.height?.toString() || "",
    waist_circumference: existingProfile?.waist_circumference?.toString() || "",
    body_fat_percent: existingProfile?.body_fat_percent?.toString() || "",
    // 5. Estilo de vida
    exercise_type: existingProfile?.exercise_type || "",
    exercise_frequency: existingProfile?.exercise_frequency || "",
    sleep_hours: existingProfile?.sleep_hours?.toString() || "",
    stress_level: existingProfile?.stress_level?.toString() || "",
    work_type: existingProfile?.work_type || "",
    // 6. Evaluación funcional
    energy_level: existingProfile?.energy_level?.toString() || "",
    digestion: existingProfile?.digestion || "",
    mood: existingProfile?.mood || "",
    concentration: existingProfile?.concentration || "",
    // Adicional
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

    if (!formData.weight || !formData.height || !formData.age || !formData.gender) {
      setMessage({ type: "error", text: "Por favor completa todos los campos requeridos (*)" })
      setIsSubmitting(false)
      return
    }

    const result = await saveHealthProfile({
      age: parseInt(formData.age),
      gender: formData.gender,
      consultation_reason: null,
      occupation: formData.occupation || null,
      diseases: formData.diseases || null,
      medications: formData.medications || null,
      supplements: formData.supplements || null,
      surgeries: formData.surgeries || null,
      allergies: formData.allergies || null,
      intolerances: formData.intolerances || null,
      family_history: formData.family_history || null,
      weight: parseFloat(formData.weight),
      height: parseFloat(formData.height),
      waist_circumference: formData.waist_circumference ? parseFloat(formData.waist_circumference) : null,
      body_fat_percent: formData.body_fat_percent ? parseFloat(formData.body_fat_percent) : null,
      exercise_type: formData.exercise_type || null,
      exercise_frequency: formData.exercise_frequency || null,
      sleep_hours: formData.sleep_hours ? parseFloat(formData.sleep_hours) : null,
      stress_level: formData.stress_level ? parseInt(formData.stress_level) : null,
      work_type: formData.work_type || null,
      energy_level: formData.energy_level ? parseInt(formData.energy_level) : null,
      digestion: formData.digestion || null,
      mood: formData.mood || null,
      concentration: formData.concentration || null,
      objectives: formData.objectives || null,
      activity_level: formData.activity_level || null,
      current_exercise_routine: formData.current_exercise_routine || null,
      previous_injuries: formData.previous_injuries || null,
      dietary_restrictions: formData.dietary_restrictions || null,
      additional_notes: formData.additional_notes || null,
    })

    if (result.error) {
      setMessage({ type: "error", text: result.error })
    } else {
      setMessage({ type: "success", text: "Información guardada correctamente" })
      if (onComplete) setTimeout(() => onComplete(), 1500)
    }
    setIsSubmitting(false)
  }

  const inputClass = "w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
  const labelClass = "block text-sm font-medium text-zinc-700 mb-2"

  // Iconos de caras para nivel de estrés (1 = muy bajo, 5 = muy alto)
  const getStressIcon = (level: number) => {
    if (level <= 1) return Laugh
    if (level <= 2) return Smile
    if (level <= 3) return Meh
    if (level <= 4) return Frown
    return Angry
  }

  // Iconos de batería para nivel de energía (1 = muy bajo, 5 = muy alto)
  const getEnergyIcon = (level: number) => {
    if (level <= 1) return Battery
    if (level <= 2) return BatteryLow
    if (level <= 3) return BatteryMedium
    if (level <= 4) return BatteryFull
    return BatteryCharging
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary" strokeWidth={1.5} />
          <h2 className="text-xl sm:text-2xl font-heading text-zinc-900">
            Información Nutricional Inicial
          </h2>
        </div>
        <p className="text-sm sm:text-base text-zinc-600">
          Completa tu información nutricional para poder agendar citas con nuestros coaches. 
          Los datos de contacto (nombre, teléfono, email) se toman de tu perfil.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
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

        {/* 1. DATOS BÁSICOS */}
        <div>
          <h3 className="text-lg font-heading text-zinc-900 mb-3 sm:mb-4">1. Datos básicos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Edad <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0"
                max="120"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className={inputClass}
                placeholder="30"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Sexo <span className="text-red-500">*</span></label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className={inputClass}
                required
              >
                <option value="">Selecciona una opción</option>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
                <option value="other">Otro</option>
                <option value="prefer-not-say">Prefiero no decir</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className={labelClass}>Ocupación</label>
              <input
                type="text"
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                className={inputClass}
                placeholder="Ej: Docente, Comercio..."
              />
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            El motivo de consulta se indica cada vez que agendes una cita con un coach.
          </p>
        </div>

        {/* 2. ANTECEDENTES MÉDICOS */}
        <div>
          <h3 className="text-lg font-heading text-zinc-900 mb-3 sm:mb-4">2. Antecedentes médicos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Enfermedades crónicas</label>
              <textarea
                value={formData.diseases}
                onChange={(e) => setFormData({ ...formData, diseases: e.target.value })}
                rows={2}
                className={`${inputClass} resize-none`}
                placeholder="Ej: Diabetes, Hipertensión..."
              />
            </div>
            <div>
              <label className={labelClass}>Medicamentos</label>
              <textarea
                value={formData.medications}
                onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                rows={2}
                className={`${inputClass} resize-none`}
                placeholder="Medicamentos que tomas actualmente"
              />
            </div>
            <div>
              <label className={labelClass}>Suplementos</label>
              <textarea
                value={formData.supplements}
                onChange={(e) => setFormData({ ...formData, supplements: e.target.value })}
                rows={2}
                className={`${inputClass} resize-none`}
                placeholder="Vitaminas, proteínas..."
              />
            </div>
            <div>
              <label className={labelClass}>Cirugías</label>
              <textarea
                value={formData.surgeries}
                onChange={(e) => setFormData({ ...formData, surgeries: e.target.value })}
                rows={2}
                className={`${inputClass} resize-none`}
                placeholder="Cirugías previas relevantes"
              />
            </div>
            <div>
              <label className={labelClass}>Alergias</label>
              <textarea
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                rows={2}
                className={`${inputClass} resize-none`}
                placeholder="Ej: Penicilina, polen..."
              />
            </div>
            <div>
              <label className={labelClass}>Intolerancias</label>
              <input
                type="text"
                value={formData.intolerances}
                onChange={(e) => setFormData({ ...formData, intolerances: e.target.value })}
                className={inputClass}
                placeholder="Ej: Lactosa, gluten..."
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Antecedentes familiares</label>
              <textarea
                value={formData.family_history}
                onChange={(e) => setFormData({ ...formData, family_history: e.target.value })}
                rows={2}
                className={`${inputClass} resize-none`}
                placeholder="Enfermedades o condiciones en la familia"
              />
            </div>
          </div>
        </div>

        {/* 3. EVALUACIÓN ANTROPOMÉTRICA */}
        <div>
          <h3 className="text-lg font-heading text-zinc-900 mb-3 sm:mb-4">3. Evaluación antropométrica</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Peso actual (kg) <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className={inputClass}
                placeholder="70"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Altura / Talla (cm) <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                className={inputClass}
                placeholder="175"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Circunferencia cintura (cm)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.waist_circumference}
                onChange={(e) => setFormData({ ...formData, waist_circumference: e.target.value })}
                className={inputClass}
                placeholder="85"
              />
            </div>
            <div>
              <label className={labelClass}>% Grasa</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.body_fat_percent}
                onChange={(e) => setFormData({ ...formData, body_fat_percent: e.target.value })}
                className={inputClass}
                placeholder="22"
              />
            </div>
          </div>
        </div>

        {/* 5. ESTILO DE VIDA */}
        <div>
          <h3 className="text-lg font-heading text-zinc-900 mb-3 sm:mb-4">5. Estilo de vida</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Ejercicio (tipo)</label>
              <input
                type="text"
                value={formData.exercise_type}
                onChange={(e) => setFormData({ ...formData, exercise_type: e.target.value })}
                className={inputClass}
                placeholder="Ej: Running, gym, natación..."
              />
            </div>
            <div>
              <label className={labelClass}>Frecuencia semanal</label>
              <input
                type="text"
                value={formData.exercise_frequency}
                onChange={(e) => setFormData({ ...formData, exercise_frequency: e.target.value })}
                className={inputClass}
                placeholder="Ej: 3 veces por semana"
              />
            </div>
            <div>
              <label className={labelClass}>Horas de sueño (promedio diario)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={formData.sleep_hours}
                onChange={(e) => setFormData({ ...formData, sleep_hours: e.target.value })}
                className={inputClass}
                placeholder="7"
              />
            </div>
            <div>
              <label className={labelClass}>Nivel de estrés (1-5)</label>
              <p className="text-xs text-zinc-500 mb-2">Selecciona con la cara que mejor te represente: 1 = sin estrés, 5 = muy estresado</p>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {[1, 2, 3, 4, 5].map((level) => {
                  const Icon = getStressIcon(level)
                  const isSelected = formData.stress_level === level.toString()
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData({ ...formData, stress_level: level.toString() })}
                      title={`Nivel ${level}`}
                      className={`p-2 sm:p-2.5 rounded-lg border-2 transition-colors cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-zinc-200 hover:border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.5} />
                    </button>
                  )
                })}
              </div>
              {formData.stress_level && (
                <p className="text-xs text-zinc-500 mt-1.5">Seleccionado: nivel {formData.stress_level}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Tipo de trabajo</label>
              <input
                type="text"
                value={formData.work_type}
                onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                className={inputClass}
                placeholder="Ej: Sedentario, de pie, trabajo físico..."
              />
            </div>
          </div>
        </div>

        {/* 6. EVALUACIÓN FUNCIONAL */}
        <div>
          <h3 className="text-lg font-heading text-zinc-900 mb-3 sm:mb-4">6. Evaluación funcional</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nivel de energía (1-5)</label>
              <p className="text-xs text-zinc-500 mb-2">Selecciona el nivel que mejor te represente: 1 = sin energía, 5 = mucha energía</p>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {[1, 2, 3, 4, 5].map((level) => {
                  const Icon = getEnergyIcon(level)
                  const isSelected = formData.energy_level === level.toString()
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData({ ...formData, energy_level: level.toString() })}
                      title={`Nivel ${level}`}
                      className={`p-2 sm:p-2.5 rounded-lg border-2 transition-colors cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-zinc-200 hover:border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.5} />
                    </button>
                  )
                })}
              </div>
              {formData.energy_level && (
                <p className="text-xs text-zinc-500 mt-1.5">Seleccionado: nivel {formData.energy_level}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Digestión</label>
              <input
                type="text"
                value={formData.digestion}
                onChange={(e) => setFormData({ ...formData, digestion: e.target.value })}
                className={inputClass}
                placeholder="Ej: Normal, estreñimiento, hinchazón..."
              />
            </div>
            <div>
              <label className={labelClass}>Estado de ánimo</label>
              <input
                type="text"
                value={formData.mood}
                onChange={(e) => setFormData({ ...formData, mood: e.target.value })}
                className={inputClass}
                placeholder="Ej: Estable, ansioso, bajo ánimo..."
              />
            </div>
            <div>
              <label className={labelClass}>Concentración</label>
              <input
                type="text"
                value={formData.concentration}
                onChange={(e) => setFormData({ ...formData, concentration: e.target.value })}
                className={inputClass}
                placeholder="Ej: Buena, dificultades para concentrarse..."
              />
            </div>
          </div>
        </div>

        {/* Notas adicionales (opcional) */}
        <div>
          <h3 className="text-lg font-heading text-zinc-900 mb-3 sm:mb-4">Notas adicionales</h3>
          <textarea
            value={formData.additional_notes}
            onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
            rows={3}
            className={`${inputClass} resize-none`}
            placeholder="Cualquier otra información relevante para el coach..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Save className="w-4 h-4" strokeWidth={1.5} />
            {isSubmitting ? "Guardando..." : "Guardar Información"}
          </button>
        </div>
      </form>
    </div>
  )
}
