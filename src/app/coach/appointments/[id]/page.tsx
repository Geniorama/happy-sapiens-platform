import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getAppointmentById } from "@/app/coach/actions"
import { AppointmentDetail } from "@/components/coach/appointment-detail"

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || session.user.role !== "coach") redirect("/auth/login")

  const { id } = await params
  const { appointment, error } = await getAppointmentById(id)

  if (error || !appointment) notFound()

  return (
    <div>
      <AppointmentDetail appointment={appointment} />
    </div>
  )
}
