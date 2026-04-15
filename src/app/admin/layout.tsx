import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import { prisma } from "@/lib/db"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  })

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
