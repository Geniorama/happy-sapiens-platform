import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCoachProfile } from "@/app/coach/actions"
import { CoachProfileForm } from "@/components/coach/coach-profile-form"
import { AvatarUpload } from "@/components/dashboard/avatar-upload"

export default async function CoachProfilePage() {
  const session = await auth()
  if (!session || session.user.role !== "coach") redirect("/auth/login")

  const { profile, error } = await getCoachProfile()

  if (error || !profile) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">
        {error || "Error al cargar el perfil"}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl text-zinc-900">Mi Perfil</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Información visible para los usuarios de la plataforma
        </p>
      </div>

      {/* Avatar */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">
          Foto de perfil
        </h2>
        <AvatarUpload
          currentImage={profile.image}
          userName={profile.name}
          userId={profile.id}
        />
      </div>

      {/* Profile form */}
      <CoachProfileForm profile={profile} />
    </div>
  )
}
