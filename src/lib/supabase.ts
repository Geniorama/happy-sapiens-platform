// Cliente mínimo de solo lectura para el Supabase del agente de WhatsApp (n8n).
//
// Es una base de datos aparte de la de la plataforma (RDS + Prisma): aquí solo
// leemos lo que el agente ya escribió. Se usa fetch contra PostgREST en vez de
// @supabase/supabase-js porque no necesitamos auth, realtime ni storage — solo
// SELECTs — y así no se agrega una dependencia al bundle.
//
// La service_role key salta las políticas RLS, así que este módulo NUNCA debe
// importarse desde un componente cliente. Todo su consumo va por server
// components o server actions.

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export function isSupabaseConfigured() {
  return !!(SUPABASE_URL && SUPABASE_KEY)
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY no están configurados')
    this.name = 'SupabaseNotConfiguredError'
  }
}

// Ejecuta un SELECT contra PostgREST. `query` es la ruta con su querystring,
// p.ej. `messages?select=id,content&order=created_at.asc`.
export async function supabaseSelect<T>(query: string): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new SupabaseNotConfiguredError()

  const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${query}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Supabase error ${res.status}: ${await res.text()}`)
  }

  return (await res.json()) as T[]
}

// Actualiza filas y devuelve las afectadas. `query` debe traer siempre un filtro:
// PostgREST sin filtro actualiza la tabla entera.
export async function supabasePatch<T>(query: string, body: Record<string, unknown>): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new SupabaseNotConfiguredError()
  if (!query.includes('=')) {
    throw new Error(`supabasePatch requiere un filtro; recibido: ${query}`)
  }

  const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${query}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Supabase error ${res.status}: ${await res.text()}`)
  }

  return (await res.json()) as T[]
}
