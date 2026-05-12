import { prisma } from "@/lib/db"
import { RemindersManager } from "@/components/admin/reminders-manager"

export default async function AdminRemindersPage() {
  const rows = await prisma.appointmentReminderRule.findMany({
    orderBy: { hoursBefore: "desc" },
  })

  const rules = rows.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    hoursBefore: Number(r.hoursBefore),
    windowMinutes: r.windowMinutes,
    isActive: r.isActive,
    sendToUser: r.sendToUser,
    sendToCoach: r.sendToCoach,
    subjectUser: r.subjectUser,
    bodyUser: r.bodyUser,
    subjectCoach: r.subjectCoach,
    bodyCoach: r.bodyCoach,
  }))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl uppercase font-heading text-zinc-900 mb-1">
          Recordatorios de citas
        </h1>
        <p className="text-sm text-zinc-500">
          Configura cuándo y qué se envía a usuarios y coaches antes de cada cita. El cron externo
          (cron-job.org) debe llamar al endpoint cada 15 minutos para que las reglas se disparen.
        </p>
      </div>

      <RemindersManager initialRules={rules} />
    </div>
  )
}
