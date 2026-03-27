export default function SubscribeSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900">
            ¡Suscripción activada!
          </h1>
          <p className="text-gray-600">
            Tu suscripción a Happy Sapiens está activa. En unos minutos recibirás un email para crear tu contraseña y acceder a la plataforma.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500 space-y-2">
          <p>Revisa tu bandeja de entrada y carpeta de spam.</p>
          <p>El email llegará desde <strong>Happy Sapiens</strong> con el asunto <em>"¡Bienvenido a Happy Sapiens!"</em></p>
        </div>
      </div>
    </div>
  )
}
