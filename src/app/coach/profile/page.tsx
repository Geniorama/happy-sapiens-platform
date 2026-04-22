import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Calendar, Hash, Mail } from "lucide-react"
import { prisma } from "@/lib/db"
import { getCoachProfile } from "@/app/coach/actions"
import { CoachProfileForm } from "@/components/coach/coach-profile-form"
import { AvatarUpload } from "@/components/dashboard/avatar-upload"
import { GoogleLinkCard } from "@/components/dashboard/google-link-card"
import { StravaLinkCard } from "@/components/dashboard/strava-link-card"
import { ReferralCode } from "@/components/dashboard/referral-code"
import { ProfileTabs, type ProfileTab } from "@/components/dashboard/profile-tabs"
import { ensureReferralCode } from "@/lib/referral-code"

export default async function CoachProfilePage() {
  const session = await auth()
  if (!session || session.user.role !== "coach") redirect("/auth/login")

  const [
    { profile, error },
    accountRow,
    referralStatsRow,
    referredUsersRows,
    referralPointsRows,
  ] = await Promise.all([
    getCoachProfile(),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        googleId: true,
        stravaAthleteId: true,
        password: true,
        referralCode: true,
      },
    }),
    prisma.referralStats.findUnique({ where: { userId: session.user.id } }),
    prisma.user.findMany({
      where: { referredBy: session.user.id },
      select: { id: true, name: true, subscriptionStatus: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.pointTransaction.findMany({
      where: {
        userId: session.user.id,
        actionType: { in: ["referral_signup", "referral_subscribed"] },
      },
      select: { amount: true, actionType: true, referenceId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ])

  if (error || !profile) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">
        {error || "Error al cargar el perfil"}
      </div>
    )
  }

  const hasPassword = Boolean(accountRow?.password)
  const hasGoogle = Boolean(accountRow?.googleId)
  const hasStrava = Boolean(accountRow?.stravaAthleteId)

  const referralCode =
    accountRow?.referralCode ?? (await ensureReferralCode(session.user.id))

  const referralStats = referralStatsRow
    ? {
        total_referrals: referralStatsRow.totalReferrals ?? 0,
        active_referrals: referralStatsRow.activeReferrals ?? 0,
        total_earnings: referralStatsRow.totalEarnings
          ? Number(referralStatsRow.totalEarnings)
          : 0,
      }
    : undefined

  function maskName(name: string | null): string {
    if (!name) return "Anónimo"
    const parts = name.trim().split(/\s+/)
    const first = parts[0] ?? ""
    const lastInitial = parts.length > 1 ? ` ${parts[parts.length - 1][0]}.` : ""
    return `${first}${lastInitial}`
  }

  const pointsByReferee = new Map<string, number>()
  for (const tx of referralPointsRows) {
    if (!tx.referenceId) continue
    pointsByReferee.set(tx.referenceId, (pointsByReferee.get(tx.referenceId) ?? 0) + tx.amount)
  }

  const referralHistory = referredUsersRows.map((u) => ({
    id: u.id,
    name: maskName(u.name),
    status: u.subscriptionStatus ?? "inactive",
    joined_at: u.createdAt.toISOString(),
    points_earned: pointsByReferee.get(u.id) ?? 0,
  }))

  const personalPanel = (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">
          Foto de perfil
        </h2>
        <AvatarUpload
          currentImage={profile.image}
          userName={profile.name}
          userId={profile.id}
        />
      </div>

      <CoachProfileForm profile={profile} />

      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">
          Información de cuenta
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 mb-1.5">
              <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
              Correo electrónico
            </label>
            <div className="px-3 py-2.5 bg-zinc-50 rounded-lg border border-zinc-200">
              <p className="text-zinc-900 text-sm break-all">{profile.email || "No especificado"}</p>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 mb-1.5">
              <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
              Miembro desde
            </label>
            <div className="px-3 py-2.5 bg-zinc-50 rounded-lg border border-zinc-200">
              <p className="text-zinc-900 text-sm">
                {profile.created_at
                  ? new Date(profile.created_at).toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "No disponible"}
              </p>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 mb-1.5">
              <Hash className="w-3.5 h-3.5" strokeWidth={1.5} />
              ID
            </label>
            <div className="px-3 py-2.5 bg-zinc-50 rounded-lg border border-zinc-200">
              <p className="text-zinc-600 text-xs font-mono truncate">{profile.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const accountPanel = (
    <div className="space-y-6">
      {referralCode && (
        <ReferralCode
          referralCode={referralCode}
          referralStats={referralStats}
          referralHistory={referralHistory}
        />
      )}
      <GoogleLinkCard
        isLinked={hasGoogle}
        canUnlink={hasPassword || hasStrava}
      />
      <StravaLinkCard
        isLinked={hasStrava}
        athleteId={accountRow?.stravaAthleteId ?? null}
      />
    </div>
  )

  const tabs: ProfileTab[] = [
    { key: "personal", label: "Perfil", icon: "user", content: personalPanel },
    { key: "account", label: "Cuenta", icon: "link", content: accountPanel },
  ]

  return (
    <div className="pb-10">
      <div className="mb-4">
        <h1 className="font-heading text-2xl text-zinc-900">Mi Perfil</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Información visible para los usuarios de la plataforma
        </p>
      </div>

      <ProfileTabs tabs={tabs} />
    </div>
  )
}
