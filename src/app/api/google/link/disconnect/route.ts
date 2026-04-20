import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true, stravaAthleteId: true },
  })

  if (!user?.password && !user?.stravaAthleteId) {
    return NextResponse.json(
      { error: "No puedes desvincular Google si es tu único método de acceso. Configura una contraseña o vincula otro proveedor primero." },
      { status: 400 }
    )
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { googleId: null },
    })
  } catch {
    return NextResponse.json({ error: "Error al desvincular" }, { status: 500 })
  }

  revalidatePath("/dashboard/profile")
  return NextResponse.json({ success: true })
}
