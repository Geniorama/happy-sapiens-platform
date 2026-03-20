import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import { supabaseAdmin } from "@/lib/supabase"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard")
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("image")
    .eq("id", session.user.id)
    .single()

  return (
    <AdminLayout
      userName={session.user?.name}
      userEmail={session.user?.email}
      userImage={user?.image ?? session.user?.image}
    >
      {children}
    </AdminLayout>
  )
}
