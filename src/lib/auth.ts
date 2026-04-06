import NextAuth, { type DefaultSession } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Facebook from "next-auth/providers/facebook"
import type { OAuthConfig } from "next-auth/providers"
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
const StravaProvider: OAuthConfig<StravaProfile> = {
  id: "strava",
  name: "Strava",
  type: "oauth" as const,
  authorization: {
    url: "https://www.strava.com/oauth/authorize",
    params: {
      // profile:read_all es necesario para obtener email en el perfil.
      scope: "read,profile:read_all,activity:read_all",
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
      // Evitar emails sintéticos para no romper el match con la cuenta suscripta.
      email: profile.email ?? null,
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

const authDebugEnabled = process.env.AUTH_DEBUG === "true"

function maskEmail(email?: string | null) {
  if (!email) return null
  const [localPart, domain] = email.split("@")
  if (!localPart || !domain) return "***"
  const visible = localPart.slice(0, 2)
  return `${visible}***@${domain}`
}

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
    StravaProvider,
  ],
  callbacks: {
    async signIn({ account, user }) {
      // Credentials: la validación ya ocurre en authorize()
      if (account?.provider === "credentials") return true

      if (account?.provider === "strava" && authDebugEnabled) {
        console.log("[AUTH][STRAVA][signIn] user recibido", {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          email: maskEmail(user?.email),
          hasEmail: Boolean(user?.email),
        })
      }

      // En Strava necesitamos email real para vincular con usuario existente.
      if (account?.provider === "strava" && !user?.email) {
        if (authDebugEnabled) {
          console.warn("[AUTH][STRAVA][signIn] Strava no devolvio email")
        }
        return "/auth/error?error=StravaEmailRequired"
      }

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

        if (account?.provider === "strava" && authDebugEnabled) {
          console.log("[AUTH][STRAVA][jwt] lookup inicial", {
            lookupField,
            lookupValue: lookupField === "email" ? maskEmail(lookupValue as string | null) : lookupValue,
          })
        }

        if (lookupValue) {
          try {
            const { data } = await supabaseAdmin
              .from("users")
              .select("id, role, subscription_status")
              .eq(lookupField, lookupValue)
              .single()

            if (data) {
              if (account?.provider === "strava" && authDebugEnabled) {
                console.log("[AUTH][STRAVA][jwt] usuario encontrado en Supabase", {
                  userId: data.id,
                  role: data.role,
                  subscriptionStatus: data.subscription_status ?? null,
                })
              }
              token.id = data.id
              token.role = data.role || "user"
              token.subscriptionStatus = data.subscription_status ?? null
              token.subscriptionStatusFetchedAt = Date.now()
            } else if (isOAuth) {
              if (account?.provider === "strava" && authDebugEnabled) {
                console.warn("[AUTH][STRAVA][jwt] no se encontro usuario por email")
              }
              token.noAccount = true
            }
          } catch {
            if (account?.provider === "strava" && authDebugEnabled) {
              console.error("[AUTH][STRAVA][jwt] error consultando Supabase")
            }
            token.role = "user"
          }
        } else if (account?.provider === "strava" && authDebugEnabled) {
          console.warn("[AUTH][STRAVA][jwt] lookupValue vacio para Strava")
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
