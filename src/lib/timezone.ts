// Zona horaria oficial del proyecto. Colombia no observa DST, así que es
// siempre UTC-5 sin excepciones.
export const APP_TIMEZONE = "America/Bogota"
export const APP_TIMEZONE_OFFSET_MIN = 300 // UTC-5, en minutos

/**
 * Combina un @db.Date y un @db.Time de Prisma en un Date que representa el
 * momento UTC real de la cita, interpretando los componentes como hora de
 * pared de Colombia. No depende de la zona horaria del servidor.
 *
 * Prisma lee @db.Date como "2026-05-12T00:00:00Z" y @db.Time como
 * "1970-01-01T10:00:00Z" — los componentes UTC corresponden a los valores
 * almacenados en Postgres (que no tienen TZ).
 */
export function combineAppointmentDateTime(date: Date, time: Date): Date {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  const hours = time.getUTCHours()
  const minutes = time.getUTCMinutes()
  const seconds = time.getUTCSeconds()
  // Date.UTC interpreta los args como UTC; sumamos el offset para convertir
  // wall-clock Colombia → momento real en UTC.
  return new Date(
    Date.UTC(year, month, day, hours, minutes, seconds) +
      APP_TIMEZONE_OFFSET_MIN * 60_000
  )
}

/**
 * Variante que recibe fecha y hora como strings ("YYYY-MM-DD" y "HH:MM" o
 * "HH:MM:SS"), tratándolos como hora de pared de Colombia. Útil para input
 * directo del cliente antes de ir a la base de datos.
 */
export function appointmentDateTimeFromStrings(
  dateStr: string,
  timeStr: string
): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  const parts = timeStr.split(":").map(Number)
  const h = parts[0] ?? 0
  const min = parts[1] ?? 0
  const s = parts[2] ?? 0
  return new Date(
    Date.UTC(y, (m ?? 1) - 1, d ?? 1, h, min, s) +
      APP_TIMEZONE_OFFSET_MIN * 60_000
  )
}

/**
 * Día de la semana (0=Domingo, 6=Sábado) para una fecha "YYYY-MM-DD",
 * independiente del TZ del servidor. Útil para comparar contra
 * coach_availability.day_of_week sin riesgo de rollover en bordes de día.
 */
export function dayOfWeekFromDateStr(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number)
  // Anclamos a mediodía UTC para que ningún TZ lo voltee a otro día.
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12)).getUTCDay()
}
