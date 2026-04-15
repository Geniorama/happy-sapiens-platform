import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { UserAppointments } from "@/components/dashboard/user-appointments"

export default async function AppointmentsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  // Obtener todas las reservas del usuario
  const appointmentRows = await prisma.appointment.findMany({
    where: { userId: session.user.id },
    include: {
      coach: {
        select: { id: true, name: true, image: true, specialization: true, bio: true },
      },
    },
    orderBy: [{ appointmentDate: "asc" }, { appointmentTime: "asc" }],
  })

  const appointments = appointmentRows.map((a) => ({
    id: a.id,
    user_id: a.userId,
    coach_id: a.coachId,
    appointment_date: a.appointmentDate.toISOString().slice(0, 10),
    appointment_time: a.appointmentTime.toISOString().slice(11, 19),
    duration_minutes: a.durationMinutes ?? 60,
    status: a.status ?? "scheduled",
    notes: a.notes,
    google_event_id: a.googleEventId,
    meeting_link: a.meetingLink,
    consultation_reason: a.consultationReason,
    created_at: a.createdAt.toISOString(),
    updated_at: a.updatedAt.toISOString(),
    coach: {
      id: a.coach.id,
      name: a.coach.name,
      image: a.coach.image,
      specialization: a.coach.specialization,
      bio: a.coach.bio,
    },
  }))

  // Separar citas por estado
  const scheduled = appointments.filter((apt) => apt.status === "scheduled")
  const completed = appointments.filter((apt) => apt.status === "completed")
  const cancelled = appointments.filter((apt) => apt.status === "cancelled")

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
