import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { prisma } from "@/lib/db"
import { getPointsBalance } from "@/lib/points"

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

  if (session.user.role === "admin") {
    redirect("/admin")
  }

  const [userRow, pointsBalance] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    }),
    getPointsBalance(session.user.id),
  ])

  return (
    <DashboardLayout
      userName={session.user?.name}
      userEmail={session.user?.email}
      userImage={userRow?.image ?? null}
      initialPoints={pointsBalance}
      subscriptionStatus={session.user?.subscriptionStatus}
    >
      {children}
    </DashboardLayout>
  )
}
