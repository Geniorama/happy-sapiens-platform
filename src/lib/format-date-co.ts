import { APP_TIMEZONE_OFFSET_MIN } from '@/lib/timezone'

// Formateo de fechas en hora Colombia, determinista entre servidor y navegador.
//
// NO se usa Intl/toLocaleString a propósito: con el mismo locale, Node y el
// navegador producen texto distinto (el mes abreviado lleva punto en uno y no en
// otro, y el separador antes de «a. m.» es un espacio angosto en uno y normal en
// otro). Como el servidor corre en UTC y renderiza el HTML que después hidrata el
// navegador, esa diferencia rompe la hidratación de React.
//
// Colombia no observa DST, así que alcanza con restar el offset fijo y leer los
// componentes en UTC. Se usa formato de 24 horas para no depender de a. m./p. m.

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function toBogotaParts(date: Date) {
  const shifted = new Date(new Date(date).getTime() - APP_TIMEZONE_OFFSET_MIN * 60_000)
  const pad = (value: number) => String(value).padStart(2, '0')
  return {
    day: pad(shifted.getUTCDate()),
    month: MONTHS_SHORT[shifted.getUTCMonth()],
    year: shifted.getUTCFullYear(),
    hours: pad(shifted.getUTCHours()),
    minutes: pad(shifted.getUTCMinutes()),
  }
}

function isValid(date: Date | string | null | undefined): date is Date | string {
  if (date === null || date === undefined) return false
  return !Number.isNaN(new Date(date).getTime())
}

// "04 ago 2026"
export function formatDateCO(date: Date | string | null | undefined): string {
  if (!isValid(date)) return '—'
  const { day, month, year } = toBogotaParts(new Date(date))
  return `${day} ${month} ${year}`
}

// "04 ago 2026, 14:38"
export function formatDateTimeCO(date: Date | string | null | undefined): string {
  if (!isValid(date)) return '—'
  const { day, month, year, hours, minutes } = toBogotaParts(new Date(date))
  return `${day} ${month} ${year}, ${hours}:${minutes}`
}

// "14:38"
export function formatTimeCO(date: Date | string | null | undefined): string {
  if (!isValid(date)) return '—'
  const { hours, minutes } = toBogotaParts(new Date(date))
  return `${hours}:${minutes}`
}

const MONTHS_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

// "5 de enero de 2000" — para fechas SIN hora (columnas @db.Date de Postgres:
// fecha de nacimiento, fecha de cita).
//
// Una fecha de calendario no es un instante: el 5 de enero es el 5 de enero en
// cualquier zona horaria. Prisma entrega estas columnas como medianoche UTC
// ("2000-01-05T00:00:00Z") y sus componentes UTC SON los valores guardados en
// Postgres, así que se leen en UTC y no se desplazan.
//
// Por eso aqui NO sirven formatDateCO (resta el offset de Colombia) ni
// toLocaleDateString (el navegador aplica el offset local): en ambos casos la
// medianoche UTC retrocede al dia anterior y el "5 de enero" guardado se muestra
// como "4 de enero".
export function formatCalendarDate(date: Date | string | null | undefined): string {
  if (!isValid(date)) return '—'
  const d = new Date(date)
  return `${d.getUTCDate()} de ${MONTHS_LONG[d.getUTCMonth()]} de ${d.getUTCFullYear()}`
}
