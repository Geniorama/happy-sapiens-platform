import NextAuth, { type DefaultSession } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Facebook from "next-auth/providers/facebook"
import { compare } from "bcryptjs"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { StravaProfile } from "next-auth/providers/strava"

// Extender los tipos de NextAuth
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      subscriptionStatus: string | null
    } & DefaultSession["user"]
  }
}

// Provider personalizado de Strava
const StravaProvider = {
  id: "strava",
  name: "Strava",
  type: "oauth" as const,
  authorization: {
    url: "https://www.strava.com/oauth/authorize",
    params: {
      scope: "read,activity:read_all",
      response_type: "code",
      approval_prompt: "auto",
    },
  },
  token: {
    url: "https://www.strava.com/oauth/token",
    async request({ params, provider }: { params: { code: string }; provider: { clientId: string; clientSecret: string } }) {
      const response = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: provider.clientId as string,
          client_secret: provider.clientSecret as string,
          code: params.code as string,
          grant_type: "authorization_code",
        }),
      })
      return { tokens: await response.json() }
    },
  },
  userinfo: "https://www.strava.com/api/v3/athlete",
  clientId: process.env.STRAVA_CLIENT_ID,
  clientSecret: process.env.STRAVA_CLIENT_SECRET,
  profile(profile: StravaProfile) {
    return {
      id: String(profile.id),
      name: `${profile.firstname} ${profile.lastname}`,
      email: profile.email || `${profile.id}@strava.com`, // Fallback si no hay email
      image: profile.profile,
    }
  },
  client: {
    token_endpoint_auth_method: "client_secret_post",
  },
}

// Schema de validación para login
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true, // Confiar en el host automáticamente (útil para desarrollo)
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
  },
  providers: [
    // Provider de credenciales (usuario y contraseña)
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        try {
          // Validar credenciales
          const validatedFields = loginSchema.safeParse(credentials)

          if (!validatedFields.success) {
            return null
          }

          const { email, password } = validatedFields.data

          // Buscar usuario en Supabase
          const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email)
            .single()

          if (error || !user || !user.password) {
            return null
          }

          // Verificar contraseña
          const isPasswordValid = await compare(password, user.password)

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        } catch (error) {
          console.error("Error en authorize:", error)
          return null
        }
      },
    }),

    // Provider de Google
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // Provider de Facebook
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),

    // Provider de Strava
    StravaProvider as any,
  ],
  callbacks: {
    async signIn({ account }) {
      // Credentials: la validación ya ocurre en authorize()
      if (account?.provider === "credentials") return true

      // OAuth: el usuario debe tener una suscripción existente en Supabase.
      // No se permite crear cuentas nuevas vía OAuth sin pasar por el checkout.
      // La verificación real del email se hace en el jwt callback (que tiene acceso al user).
      return true
    },

    async jwt({ token, user, account }) {
      if (user) {
        // Para credentials, user.id ya es el ID de Supabase (retornado por authorize).
        // Para OAuth, user.id es el ID del proveedor → buscamos por email.
        const isOAuth = account?.provider !== "credentials"
        const lookupField = isOAuth ? "email" : "id"
        const lookupValue = isOAuth ? user.email : user.id

        if (lookupValue) {
          try {
            const { data } = await supabaseAdmin
              .from("users")
              .select("id, role, subscription_status")
              .eq(lookupField, lookupValue)
              .single()

            if (data) {
              token.id = data.id
              token.role = data.role || "user"
              token.subscriptionStatus = data.subscription_status ?? null
              token.subscriptionStatusFetchedAt = Date.now()
            } else if (isOAuth) {
              token.noAccount = true
            }
          } catch {
            token.role = "user"
          }
        }
      } else if (token.id) {
        // Refrescar subscription_status cada 5 minutos para detectar cambios (past_due, cancelled)
        const lastFetch = token.subscriptionStatusFetchedAt as number | undefined
        if (!lastFetch || Date.now() - lastFetch > 5 * 60 * 1000) {
          try {
            const { data } = await supabaseAdmin
              .from("users")
              .select("subscription_status")
              .eq("id", token.id as string)
              .single()
            if (data) {
              token.subscriptionStatus = data.subscription_status ?? null
              token.subscriptionStatusFetchedAt = Date.now()
            }
          } catch { /* no romper el flujo */ }
        }
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = (token.role as string) || "user"
        session.user.subscriptionStatus = (token.subscriptionStatus as string) ?? null
      }
      return session
    },
  },
})
