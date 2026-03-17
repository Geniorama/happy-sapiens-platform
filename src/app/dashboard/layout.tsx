import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

export default async function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.role === "coach") {
    redirect("/coach")
  }

  return (
    <DashboardLayout 
      userName={session.user?.name} 
      userEmail={session.user?.email}
    >
      {children}
    </DashboardLayout>
  )
}
