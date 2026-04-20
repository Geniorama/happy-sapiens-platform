import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== "user" && role !== "coach") {
    return NextResponse.json({ error: "Rol no permitido" }, { status: 403 })
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { stravaAthleteId: null },
    })
  } catch {
    return NextResponse.json({ error: "Error al desvincular" }, { status: 500 })
  }

  revalidatePath("/dashboard/profile")
  return NextResponse.json({ success: true })
}
