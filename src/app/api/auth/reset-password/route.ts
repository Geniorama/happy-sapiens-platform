import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  let token: string, password: string
  try {
    const body = await req.json()
    token = body.token
    password = body.password
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 })
  }

  if (!token || !password) {
    return NextResponse.json({ error: "Token y contraseña son requeridos" }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
  }

  const user = await prisma.user.findFirst({
    where: { resetToken: token },
    select: { id: true, resetTokenExpires: true },
  })

  if (!user) {
    return NextResponse.json({ error: "El enlace no es válido o ya fue utilizado" }, { status: 400 })
  }

  if (!user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    return NextResponse.json({ error: "El enlace ha expirado. Solicita uno nuevo." }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpires: null,
    },
  })

  return NextResponse.json({ message: "Contraseña actualizada correctamente" })
}
