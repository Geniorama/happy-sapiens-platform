import { prisma } from "@/lib/db"
import { CoachesManager } from "@/components/admin/coaches-manager"

export default async function AdminCoachesPage() {
  const coachRows = await prisma.user.findMany({
    where: { role: "coach" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      specialization: true,
      bio: true,
      isCoachActive: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  })

  // Count appointments per coach
  const coachIds = coachRows.map((c) => c.id)

  const appointmentCounts: Record<string, number> = {}

  if (coachIds.length > 0) {
    const grouped = await prisma.appointment.groupBy({
      by: ["coachId"],
      where: { coachId: { in: coachIds } },
      _count: { _all: true },
    })
    for (const g of grouped) {
      appointmentCounts[g.coachId] = g._count._all
    }
  }

  const coachesWithCounts = coachRows.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email ?? "",
    image: c.image,
    specialization: c.specialization,
    bio: c.bio,
    is_coach_active: c.isCoachActive ?? false,
    created_at: c.createdAt.toISOString(),
    appointments_count: appointmentCounts[c.id] ?? 0,
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl uppercase font-heading text-zinc-900 mb-1">Coaches</h1>
        <p className="text-sm text-zinc-500">
          Administra los coaches de la plataforma y su estado
        </p>
      </div>

      <CoachesManager coaches={coachesWithCounts} />
    </div>
  )
}
