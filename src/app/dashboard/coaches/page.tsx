import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { SectionCover } from "@/components/dashboard/section-cover"
import { CoachesList } from "@/components/dashboard/coaches-list"

export default async function CoachesPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  const coverRow = await prisma.sectionCover.findFirst({
    where: { sectionKey: "coaches", isActive: true },
    select: { title: true, subtitle: true, imageUrl: true, isActive: true },
  })

  const cover = coverRow
    ? {
        title: coverRow.title,
        subtitle: coverRow.subtitle,
        image_url: coverRow.imageUrl,
        is_active: coverRow.isActive,
      }
    : null

  // Obtener todos los coaches activos (usuarios con role='coach')
  const coachRows = await prisma.user.findMany({
    where: { role: "coach", isCoachActive: true },
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
    orderBy: { name: "asc" },
  })

  const coaches = coachRows.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    bio: c.bio,
    specialization: c.specialization,
    image: c.image,
    phone: c.phone,
    is_coach_active: c.isCoachActive ?? false,
  }))

  // Obtener las reservas del usuario
  const appointmentRows = await prisma.appointment.findMany({
    where: { userId: session.user.id },
    include: {
      coach: {
        select: { id: true, name: true, image: true, specialization: true },
      },
    },
    orderBy: [{ appointmentDate: "asc" }, { appointmentTime: "asc" }],
  })

  const userAppointments = appointmentRows.map((a) => ({
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
    },
  }))

  return (
    <div className="max-w-7xl mx-auto">
      <SectionCover
        title={cover?.title || ""}
        subtitle={cover?.subtitle || ""}
        imageUrl={cover?.image_url}
        fallbackTitle="Ritual Coaches"
        fallbackSubtitle="Agenda citas con nuestros profesionales especializados"
      />

      <CoachesList
        coaches={coaches}
        userAppointments={userAppointments}
        userId={session.user.id}
        isPaused={session.user.subscriptionStatus === "paused"}
      />
    </div>
  )
}
