const GENDER_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Femenino",
  other: "Otro",
  "prefer-not-say": "Prefiero no decir",
}

const ACTIVITY_LEVEL_LABELS: Record<string, string> = {
  sedentary: "Sedentario",
  light: "Levemente activo",
  moderate: "Moderadamente activo",
  active: "Activo",
  very_active: "Muy activo",
}

const STRESS_LABELS: Record<number, string> = {
  1: "1 — Sin estrés",
  2: "2 — Bajo",
  3: "3 — Moderado",
  4: "4 — Alto",
  5: "5 — Muy estresado",
}

const ENERGY_LABELS: Record<number, string> = {
  1: "1 — Sin energía",
  2: "2 — Baja",
  3: "3 — Moderada",
  4: "4 — Alta",
  5: "5 — Muy alta",
}

export function formatHealthValue(field: string, value: unknown): string {
  if (value == null) return ""

  if (field === "gender") {
    return GENDER_LABELS[String(value)] ?? String(value)
  }

  if (field === "activity_level") {
    return ACTIVITY_LEVEL_LABELS[String(value)] ?? String(value)
  }

  if (field === "stress_level") {
    const n = Number(value)
    return STRESS_LABELS[n] ?? String(value)
  }

  if (field === "energy_level") {
    const n = Number(value)
    return ENERGY_LABELS[n] ?? String(value)
  }

  return String(value)
}
