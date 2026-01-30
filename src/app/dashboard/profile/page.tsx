import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { Calendar, Mail, Hash, Check, Sparkles } from "lucide-react"
import { ProfileForm } from "@/components/dashboard/profile-form"

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  // Obtener información completa del usuario desde Supabase
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", session.user.id)
    .single()

  const subscriptionStatusLabels: Record<string, { label: string; color: string }> = {
    active: { label: "Activa", color: "bg-green-100 text-green-700" },
    inactive: { label: "Inactiva", color: "bg-zinc-100 text-zinc-700" },
    cancelled: { label: "Cancelada", color: "bg-orange-100 text-orange-700" },
    past_due: { label: "Pago Atrasado", color: "bg-red-100 text-red-700" },
  }

  const subscriptionStatus = user?.subscription_status || "inactive"
  const statusInfo = subscriptionStatusLabels[subscriptionStatus] || subscriptionStatusLabels.inactive

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-heading text-zinc-900 mb-2">Mi Perfil</h1>
        <p className="text-zinc-600">Gestiona tu información personal y suscripción</p>
      </div>

      <div className="space-y-6">
        {/* Avatar */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-200">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-primary font-heading text-3xl">
                  {session.user.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm text-zinc-500 mb-1">Tu avatar</p>
              <p className="text-zinc-900 font-medium">{session.user.name || "Sin nombre"}</p>
              <p className="text-sm text-zinc-600">{session.user.email}</p>
            </div>
          </div>
        </div>

        {/* Formulario de Información Personal */}
        <ProfileForm user={user} />

        {/* Información de Cuenta */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-200">
          <h2 className="text-2xl font-heading text-zinc-900 mb-6">Información de Cuenta</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
                <Mail className="w-4 h-4" strokeWidth={1.5} />
                Correo electrónico
              </label>
              <div className="px-4 py-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <p className="text-zinc-900">{user?.email || "No especificado"}</p>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
                <Calendar className="w-4 h-4" strokeWidth={1.5} />
                Miembro desde
              </label>
              <div className="px-4 py-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <p className="text-zinc-900">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "No disponible"}
                </p>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
                <Hash className="w-4 h-4" strokeWidth={1.5} />
                ID de usuario
              </label>
              <div className="px-4 py-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <p className="text-zinc-600 text-xs font-mono truncate">
                  {user?.id || "No disponible"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Información de Suscripción */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-200">
          <h2 className="text-2xl font-heading text-zinc-900 mb-6">Suscripción</h2>
          
          <div className="space-y-4">
            {/* Estado de suscripción */}
            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
              <div>
                <p className="text-sm text-zinc-600 mb-1">Estado actual</p>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>
              {subscriptionStatus === "inactive" && (
                <a
                  href="/subscribe"
                  className="px-6 py-2.5 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Suscribirse
                </a>
              )}
            </div>

            {/* Detalles de suscripción si está activa */}
            {subscriptionStatus === "active" && user?.subscription_start_date && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 mb-1">Fecha de inicio</p>
                  <p className="text-green-900 font-medium">
                    {new Date(user.subscription_start_date).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                {user?.subscription_end_date && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700 mb-1">Próxima renovación</p>
                    <p className="text-green-900 font-medium">
                      {new Date(user.subscription_end_date).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {subscriptionStatus === "inactive" && (
              <div className="p-6 bg-secondary/30 rounded-lg border border-secondary">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg text-zinc-900 mb-1">
                      Desbloquea todo el potencial
                    </h3>
                    <p className="text-sm text-zinc-600 mb-4">
                      Suscríbete para acceder a todas las funcionalidades de la plataforma.
                    </p>
                    <ul className="space-y-2 text-sm text-zinc-600 mb-4">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" strokeWidth={2} />
                        Acceso completo a todos los módulos
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" strokeWidth={2} />
                        Sin límites ni restricciones
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" strokeWidth={2} />
                        Cancela cuando quieras
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
