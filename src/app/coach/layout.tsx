import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { CoachLayout } from "@/components/coach/coach-layout"
import { supabaseAdmin } from "@/lib/supabase"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.role !== "coach") {
    redirect("/dashboard")
  }

  // Obtener imagen actualizada del perfil (puede haber cambiado desde el login)
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("image")
    .eq("id", session.user.id)
    .single()

  return (
    <CoachLayout
      userName={session.user?.name}
      userEmail={session.user?.email}
      userImage={user?.image ?? session.user?.image}
    >
      {children}
    </CoachLayout>
  )
}
