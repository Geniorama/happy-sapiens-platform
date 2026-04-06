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
    title: "Email no disponible en Strava",
    description:
      "Strava no compartio tu email con Happy Sapiens. Acepta los permisos solicitados o inicia sesion con correo y contraseña.",
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

  const isNoAccount =
    error === "OAuthCreateAccount" || error === "OAuthAccountNotLinked"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600">{description}</p>
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
