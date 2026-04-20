import Link from "next/link"

const errorMessages: Record<string, { title: string; description: string }> = {
  OAuthAccountNotLinked: {
    title: "Cuenta no vinculada",
    description:
      "El correo de tu cuenta de Facebook o Google no coincide con ninguna cuenta registrada. Para acceder necesitas una suscripción activa.",
  },
  OAuthSignin: {
    title: "Error al iniciar sesión",
    description:
      "No se pudo conectar con el proveedor externo. Intenta de nuevo o usa tu correo y contraseña.",
  },
  OAuthCallback: {
    title: "Error en la respuesta",
    description:
      "Hubo un problema al procesar la respuesta del proveedor externo. Intenta de nuevo.",
  },
  OAuthCreateAccount: {
    title: "No tienes una cuenta",
    description:
      "Tu cuenta de Facebook o Google no está registrada en la plataforma. Para acceder necesitas una suscripción activa.",
  },
  StravaEmailRequired: {
    title: "No pudimos identificarte con Strava",
    description:
      "Strava no comparte tu email con Happy Sapiens, así que no podemos reconocerte automáticamente. Si ya tienes cuenta, inicia sesión con correo (o Google) y vincula Strava desde tu perfil. Si aún no tienes cuenta, primero necesitas una suscripción.",
  },
  StravaNotLinked: {
    title: "Esta cuenta de Strava no está vinculada",
    description:
      "Tu Strava aún no está conectado a un usuario de Happy Sapiens. Si ya tienes cuenta, inicia sesión con correo (o Google) y vincula Strava desde tu perfil. Si aún no tienes cuenta, primero necesitas una suscripción.",
  },
  StravaLinkedToDifferentAthlete: {
    title: "Conflicto de vinculación en Strava",
    description:
      "Tu usuario ya está vinculado a otro atleta de Strava. Contáctanos para actualizar la vinculación de forma segura.",
  },
  StravaLinkFailed: {
    title: "No se pudo vincular Strava",
    description:
      "Ocurrió un error al guardar la vinculación con Strava. Intenta de nuevo en unos minutos.",
  },
  GoogleNotLinked: {
    title: "Esta cuenta de Google no está vinculada",
    description:
      "Tu cuenta de Google aún no está conectada a un usuario de Happy Sapiens. Si ya tienes cuenta, inicia sesión con correo y vincula Google desde tu perfil. Si aún no tienes cuenta, primero necesitas una suscripción.",
  },
  GoogleLinkedToDifferentAccount: {
    title: "Conflicto de vinculación en Google",
    description:
      "Tu usuario ya está vinculado a otra cuenta de Google. Contáctanos para actualizar la vinculación de forma segura.",
  },
  GoogleLinkFailed: {
    title: "No se pudo vincular Google",
    description:
      "Ocurrió un error al guardar la vinculación con Google. Intenta de nuevo en unos minutos.",
  },
  CredentialsSignin: {
    title: "Credenciales incorrectas",
    description: "El correo o la contraseña son incorrectos. Verifica tus datos e intenta de nuevo.",
  },
  SessionRequired: {
    title: "Sesión requerida",
    description: "Debes iniciar sesión para acceder a este contenido.",
  },
}

const defaultError = {
  title: "Error de autenticación",
  description:
    "Ocurrió un problema al iniciar sesión. Intenta de nuevo o contáctanos si el problema persiste.",
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const { title, description } = (error && errorMessages[error]) || defaultError
  const showDebugCode = process.env.AUTH_DEBUG === "true"

  const isNoAccount =
    error === "OAuthCreateAccount" || error === "OAuthAccountNotLinked"

  const isStravaNotLinked =
    error === "StravaEmailRequired" || error === "StravaNotLinked"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600">{description}</p>
          {showDebugCode && error ? (
            <p className="text-xs text-gray-500 font-mono">
              Código técnico: {error}
            </p>
          ) : null}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          {isNoAccount ? (
            <a
              href={`https://${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}`}
              className="block w-full bg-black text-white rounded-lg py-3 px-4 font-medium hover:bg-gray-800 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Suscribirme
            </a>
          ) : null}

          {isStravaNotLinked ? (
            <>
              <div className="text-left text-sm text-gray-700 bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                <p className="font-medium text-gray-900">Ya tengo cuenta: ¿cómo vincular Strava?</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Inicia sesión con tu correo y contraseña.</li>
                  <li>Ve a <span className="font-medium">Mi Perfil</span>.</li>
                  <li>Pulsa <span className="font-medium">Conectar con Strava</span>.</li>
                </ol>
              </div>
              <div className="text-left text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <p className="font-medium text-gray-900">Aún no tengo cuenta</p>
                <p className="text-gray-600">
                  Necesitas una suscripción activa. Tu cuenta se crea automáticamente al completar el pago.
                </p>
                <Link
                  href="/subscribe"
                  className="inline-block mt-1 text-sm font-medium text-primary hover:text-primary/90"
                >
                  Ver planes de suscripción →
                </Link>
              </div>
            </>
          ) : null}

          <Link
            href="/auth/login"
            className="block w-full bg-black text-white rounded-lg py-3 px-4 font-medium hover:bg-gray-800 transition-colors"
          >
            Volver al login
          </Link>

          <Link
            href="/auth/forgot-password"
            className="block w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>
    </div>
  )
}
