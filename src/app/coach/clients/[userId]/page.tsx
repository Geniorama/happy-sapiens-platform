import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getClientHistory } from "@/app/coach/actions"
import { ClientHistory } from "@/components/coach/client-history"

export default async function ClientHistoryPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const session = await auth()
  if (!session || session.user.role !== "coach") redirect("/auth/login")

  const { userId } = await params
  const { client, healthProfile, appointments, error } = await getClientHistory(userId)

  if (error === "Sin acceso a este cliente" || !client) notFound()

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">
        {error}
      </div>
    )
  }

  return (
    <ClientHistory
      client={client}
      healthProfile={healthProfile}
      appointments={appointments}
      currentCoachId={session.user.id}
    />
  )
}
