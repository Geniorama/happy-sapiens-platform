import NextAuth, { type DefaultSession } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Strava, { type StravaProfile } from "next-auth/providers/strava"
import { compare } from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/db"

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

// Schema de validación para login
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
})

const authDebugEnabled = process.env.AUTH_DEBUG === "true"
const stravaForceApproval = process.env.STRAVA_FORCE_APPROVAL === "true"

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
          const validatedFields = loginSchema.safeParse(credentials)

          if (!validatedFields.success) {
            return null
          }

          const { email, password } = validatedFields.data

          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user || !user.password) {
            return null
          }

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

    // Provider de Strava (usar provider oficial evita inconsistencias OAuth, p. ej. state vacío)
    Strava({
      clientId: process.env.STRAVA_CLIENT_ID!,
      clientSecret: process.env.STRAVA_CLIENT_SECRET!,
      checks: ["state"],
      authorization: {
        params: {
          scope: "read,profile:read_all,activity:read_all",
          response_type: "code",
          approval_prompt: stravaForceApproval ? "force" : "auto",
        },
      },
      profile(profile: StravaProfile & { email?: string }) {
        return {
          id: String(profile.id),
          name: `${profile.firstname} ${profile.lastname}`,
          // Evitar emails sintéticos para no romper el match con la cuenta suscripta.
          email: profile.email ?? null,
          image: profile.profile,
        }
      },
    }),
  ],
  logger: {
    error(error) {
      console.error("[AUTH][ERROR]", error)
    },
    warn(code) {
      if (authDebugEnabled) {
        console.warn("[AUTH][WARN]", code)
      }
    },
    debug(code, metadata) {
      if (authDebugEnabled) {
        console.log("[AUTH][DEBUG]", code, metadata)
      }
    },
  },
  callbacks: {
    async signIn({ account, user }) {
      // Credentials: la validación ya ocurre en authorize()
      if (account?.provider === "credentials") return true

      if (account?.provider === "strava") {
        const athleteId = account.providerAccountId

        if (authDebugEnabled) {
          console.log("[AUTH][STRAVA][signIn] iniciando validacion de vinculo", {
            athleteId,
            email: maskEmail(user?.email),
          })
        }

        // 1) Si el atleta ya está vinculado a un usuario, permitir acceso.
        if (athleteId) {
          const linkedUser = await prisma.user.findFirst({
            where: { stravaAthleteId: athleteId },
            select: { id: true },
          })

          if (linkedUser) {
            if (authDebugEnabled) {
              console.log("[AUTH][STRAVA][signIn] atleta ya vinculado", {
                userId: linkedUser.id,
              })
            }
            return true
          }
        }

        // 2) Primer login con Strava: intentar vincular por email (si Strava lo entrega).
        if (user?.email && athleteId) {
          const userByEmail = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, stravaAthleteId: true },
          })

          if (userByEmail) {
            // Si ya está vinculado a otro athlete_id, evitar sobrescribir silenciosamente.
            if (userByEmail.stravaAthleteId && userByEmail.stravaAthleteId !== athleteId) {
              return "/auth/error?error=StravaLinkedToDifferentAthlete"
            }

            try {
              await prisma.user.update({
                where: { id: userByEmail.id },
                data: { stravaAthleteId: athleteId },
              })
            } catch {
              return "/auth/error?error=StravaLinkFailed"
            }

            if (authDebugEnabled) {
              console.log("[AUTH][STRAVA][signIn] cuenta vinculada por email", {
                userId: userByEmail.id,
                athleteId,
              })
            }
            return true
          }
        }

        // 3) Sin vínculo previo y sin email útil para vincular.
        if (!user?.email) {
          return "/auth/error?error=StravaEmailRequired"
        }
        return "/auth/error?error=StravaNotLinked"
      }

      return true
    },

    async jwt({ token, user, account }) {
      if (user) {
        // Para credentials, user.id ya es el ID de la DB (retornado por authorize).
        // Para OAuth, user.id es el ID del proveedor → buscamos por email o stravaAthleteId.
        const isCredentials = account?.provider === "credentials"
        const isStrava = account?.provider === "strava"

        let dbUser: { id: string; role: string | null; subscriptionStatus: string | null } | null = null

        try {
          if (isCredentials) {
            dbUser = await prisma.user.findUnique({
              where: { id: user.id as string },
              select: { id: true, role: true, subscriptionStatus: true },
            })
          } else if (isStrava && account?.providerAccountId) {
            dbUser = await prisma.user.findFirst({
              where: { stravaAthleteId: account.providerAccountId },
              select: { id: true, role: true, subscriptionStatus: true },
            })
          } else if (user.email) {
            dbUser = await prisma.user.findUnique({
              where: { email: user.email },
              select: { id: true, role: true, subscriptionStatus: true },
            })
          }

          if (dbUser) {
            if (isStrava && authDebugEnabled) {
              console.log("[AUTH][STRAVA][jwt] usuario encontrado", {
                userId: dbUser.id,
                role: dbUser.role,
                subscriptionStatus: dbUser.subscriptionStatus,
              })
            }
            token.id = dbUser.id
            token.role = dbUser.role || "user"
            token.subscriptionStatus = dbUser.subscriptionStatus ?? null
            token.subscriptionStatusFetchedAt = Date.now()
          } else if (!isCredentials) {
            if (isStrava && authDebugEnabled) {
              console.warn("[AUTH][STRAVA][jwt] no se encontro usuario")
            }
            token.noAccount = true
          }
        } catch {
          if (isStrava && authDebugEnabled) {
            console.error("[AUTH][STRAVA][jwt] error consultando DB")
          }
          token.role = "user"
        }
      } else if (token.id) {
        // Refrescar subscription_status cada 5 minutos para detectar cambios (past_due, cancelled)
        const lastFetch = token.subscriptionStatusFetchedAt as number | undefined
        if (!lastFetch || Date.now() - lastFetch > 5 * 60 * 1000) {
          try {
            const data = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { subscriptionStatus: true },
            })
            if (data) {
              token.subscriptionStatus = data.subscriptionStatus ?? null
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
