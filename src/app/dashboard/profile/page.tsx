import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { Calendar, Mail, Hash } from "lucide-react"
import { SectionCover } from "@/components/dashboard/section-cover"
import { ProfileForm } from "@/components/dashboard/profile-form"
import { AvatarUpload } from "@/components/dashboard/avatar-upload"
import { ReferralCode } from "@/components/dashboard/referral-code"
import { HealthProfileForm } from "@/components/dashboard/health-profile-form"
import { getHealthProfile } from "@/app/dashboard/coaches/actions"

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", session.user.id)
    .single()

  const { data: referralStats } = await supabaseAdmin
    .from("referral_stats")
    .select("*")
    .eq("user_id", session.user.id)
    .single()

  const { profile: healthProfile } = await getHealthProfile()

  const { data: cover } = await supabaseAdmin
    .from("section_covers")
    .select("title, subtitle, image_url, is_active")
    .eq("section_key", "profile")
    .eq("is_active", true)
    .single()

  return (
    <div>
      <SectionCover
        title={cover?.title || ""}
        subtitle={cover?.subtitle || ""}
        imageUrl={cover?.image_url}
        fallbackTitle="Mi Perfil"
        fallbackSubtitle="Gestiona tu información personal"
      />
      <div className="max-w-7xl mx-auto">

      <div className="space-y-4 sm:space-y-6">
        {/* Avatar */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-heading text-zinc-900 mb-4 sm:mb-6">Foto de Perfil</h2>
          <AvatarUpload
            currentImage={user?.image}
            userName={session.user.name}
            userId={session.user.id}
          />
        </div>

        {/* Información Personal */}
        <ProfileForm user={user} />

        {/* Información de Cuenta */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-zinc-200">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-heading text-zinc-900 mb-4 sm:mb-6">Información de Cuenta</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
                    ? new Date(user.created_at).toLocaleDateString("es-CO", {
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
                <p className="text-zinc-600 text-xs font-mono truncate">{user?.id || "No disponible"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Perfil de Salud */}
        <HealthProfileForm
          userId={session.user.id}
          existingProfile={healthProfile || undefined}
        />

        {/* Código de Referido */}
        {user?.referral_code && (
          <ReferralCode
            referralCode={user.referral_code}
            referralStats={referralStats}
          />
        )}
      </div>
      </div>
    </div>
  )
}
