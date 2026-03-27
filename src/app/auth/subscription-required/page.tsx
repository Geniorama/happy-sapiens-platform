import Link from "next/link"

export default function SubscriptionRequiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Suscripción requerida
          </h1>
          <p className="text-gray-600">
            Para acceder a la plataforma necesitas una suscripción activa.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <p className="text-sm text-gray-500">
            Si ya tienes una suscripción activa en Shopify y ves este mensaje,
            puede que tu cuenta aún no esté sincronizada. Intenta cerrar sesión
            y volver a ingresar.
          </p>

          <a
            href={`https://${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}`}
            className="block w-full bg-black text-white rounded-lg py-3 px-4 font-medium hover:bg-gray-800 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Suscribirme en Shopify
          </a>

          <Link
            href="/auth/logout"
            className="block w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cerrar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
