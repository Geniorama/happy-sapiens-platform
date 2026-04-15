import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import { CoachDetail } from "@/components/dashboard/coach-detail"
import { getHealthProfile } from "@/app/dashboard/coaches/actions"
import { getGoogleCalendarBlocked } from "@/lib/google-calendar"

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export default async function CoachDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  // Obtener información del coach
  const coachRow = await prisma.user.findFirst({
    where: { id, role: "coach", isCoachActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      specialization: true,
      image: true,
      phone: true,
      isCoachActive: true,
    },
  })

  if (!coachRow) notFound()

  const coach = {
    id: coachRow.id,
    name: coachRow.name,
    email: coachRow.email,
    bio: coachRow.bio,
    specialization: coachRow.specialization,
    image: coachRow.image,
    phone: coachRow.phone,
    is_coach_active: coachRow.isCoachActive ?? false,
  }

  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 60)
  const startStr = toLocalDateStr(startDate)
  const endStr = toLocalDateStr(endDate)

  // Consultas en paralelo
  const [availabilityRows, existingAppointmentRows, healthResult, googleBlocked] =
    await Promise.all([
      prisma.coachAvailability.findMany({
        where: { coachId: id, isAvailable: true },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      }),
      prisma.appointment.findMany({
        where: {
          coachId: id,
          status: "scheduled",
          appointmentDate: {
            gte: new Date(`${startStr}T00:00:00.000Z`),
            lte: new Date(`${endStr}T00:00:00.000Z`),
          },
        },
        select: { appointmentDate: true, appointmentTime: true },
      }),
      getHealthProfile(),
      // Bloqueados por Google Calendar (falla silenciosamente si no está conectado)
      getGoogleCalendarBlocked(id, startStr, endStr).catch(() => []),
    ])

  const { profile: healthProfile } = healthResult

  const availability = availabilityRows.map((av) => ({
    id: av.id,
    coach_id: av.coachId,
    day_of_week: av.dayOfWeek,
    start_time: av.startTime.toISOString().slice(11, 19),
    end_time: av.endTime.toISOString().slice(11, 19),
    is_available: av.isAvailable ?? true,
    slot_duration: av.slotDuration,
    created_at: av.createdAt.toISOString(),
  }))

  const existingAppointments = existingAppointmentRows.map((a) => ({
    appointment_date: a.appointmentDate.toISOString().slice(0, 10),
    appointment_time: a.appointmentTime.toISOString().slice(11, 19),
  }))

  return (
    <div className="max-w-4xl mx-auto">
      <CoachDetail
        coach={coach}
        availability={availability}
        existingAppointments={existingAppointments}
        externalBlocked={googleBlocked}
        userId={session.user.id}
        healthProfile={healthProfile}
        isPaused={session.user.subscriptionStatus === "paused"}
      />
    </div>
  )
}
