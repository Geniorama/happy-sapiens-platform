import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCoachAppointments } from "@/app/coach/actions"
import { AppointmentsManager } from "@/components/coach/appointments-manager"

export default async function CoachAppointmentsPage() {
  const session = await auth()
  if (!session || session.user.role !== "coach") redirect("/auth/login")

  const { appointments, error } = await getCoachAppointments()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-zinc-900">Mis Citas</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Gestiona todas tus citas con clientes
        </p>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">
          {error}
        </div>
      ) : (
        <AppointmentsManager appointments={appointments} />
      )}
    </div>
  )
}
