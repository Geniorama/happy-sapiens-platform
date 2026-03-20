import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase"
import { AdminProfileForm } from "@/components/admin/admin-profile-form"
import { AvatarUpload } from "@/components/dashboard/avatar-upload"

export default async function AdminProfilePage() {
  const session = await auth()
  if (!session || session.user.role !== "admin") redirect("/auth/login")

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("id, name, email, phone, image, created_at")
    .eq("id", session.user.id)
    .single()

  if (!profile) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">
        Error al cargar el perfil
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl sm:text-3xl uppercase font-heading text-zinc-900 mb-1">Mi Perfil</h1>
        <p className="text-sm text-zinc-500">Gestiona tu información y acceso</p>
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

      <AdminProfileForm profile={profile} />
    </div>
  )
}
