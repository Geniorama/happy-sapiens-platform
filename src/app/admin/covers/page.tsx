import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { CoversManager } from "@/components/admin/covers-manager"

export default async function CoversPage() {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== "admin") {
    redirect("/auth/login")
  }

  const rows = await prisma.sectionCover.findMany({
    orderBy: { createdAt: "asc" },
  })

  const covers = rows.map((c) => ({
    id: c.id,
    section_key: c.sectionKey,
    title: c.title,
    subtitle: c.subtitle,
    image_url: c.imageUrl,
    is_active: c.isActive ?? false,
  }))

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl uppercase font-heading text-zinc-900 mb-1 sm:mb-2">
          Portadas
        </h1>
        <p className="text-sm sm:text-base text-zinc-600">
          Gestiona las imágenes de portada de cada sección del dashboard
        </p>
      </div>

      <CoversManager covers={covers} />
    </div>
  )
}
