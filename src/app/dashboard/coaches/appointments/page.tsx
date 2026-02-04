import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { UserAppointments } from "@/components/dashboard/user-appointments"

export default async function AppointmentsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  // Obtener todas las reservas del usuario
  const { data: appointments } = await supabaseAdmin
    .from("appointments")
    .select(`
      *,
      coach:users!coach_id(id, name, image, specialization, bio)
    `)
    .eq("user_id", session.user.id)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true })

  // Separar citas por estado
  const scheduled = appointments?.filter(apt => apt.status === "scheduled") || []
  const completed = appointments?.filter(apt => apt.status === "completed") || []
  const cancelled = appointments?.filter(apt => apt.status === "cancelled") || []

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl uppercase font-heading text-zinc-900 mb-1 sm:mb-2">
          Mis Citas
        </h1>
        <p className="text-sm sm:text-base text-zinc-600">
          Gestiona tus citas con los coaches
        </p>
      </div>

      <UserAppointments
        scheduled={scheduled}
        completed={completed}
        cancelled={cancelled}
      />
    </div>
  )
}
