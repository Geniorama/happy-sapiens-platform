import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCoachAvailability } from "@/app/coach/actions"
import { getCalendarToken } from "@/lib/coach-utils"
import { isGoogleCalendarConnected } from "@/lib/google-calendar"
import { AvailabilityManager } from "@/components/coach/availability-manager"
import { CalendarConnections } from "@/components/coach/calendar-connections"
import { Suspense } from "react"

export const dynamic = "force-dynamic"

export default async function CoachAvailabilityPage() {
  const session = await auth()
  if (!session || session.user.role !== "coach") redirect("/auth/login")

  const [{ availability, error }, googleStatus] = await Promise.all([
    getCoachAvailability(),
    isGoogleCalendarConnected(session.user.id),
  ])

  const token = getCalendarToken(session.user.id)
  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000"
  const calendarUrl = `${baseUrl}/api/coach/calendar/${token}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-zinc-900">Disponibilidad</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Configura tu horario, sincroniza tu calendario y conecta calendarios externos
        </p>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">
          {error}
        </div>
      ) : (
        <AvailabilityManager initialSlots={availability as any} calendarUrl={calendarUrl} />
      )}

      {/* Calendarios externos */}
      <Suspense>
        <CalendarConnections
          googleConnected={googleStatus.connected}
          googleEmail={googleStatus.email}
        />
      </Suspense>
    </div>
  )
}
