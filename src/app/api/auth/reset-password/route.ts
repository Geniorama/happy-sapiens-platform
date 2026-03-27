import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()

  if (!token || !password) {
    return NextResponse.json({ error: "Token y contraseña son requeridos" }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, reset_token_expires")
    .eq("reset_token", token)
    .single()

  if (!user) {
    return NextResponse.json({ error: "El enlace no es válido o ya fue utilizado" }, { status: 400 })
  }

  const expires = new Date(user.reset_token_expires)
  if (expires < new Date()) {
    return NextResponse.json({ error: "El enlace ha expirado. Solicita uno nuevo." }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  await supabaseAdmin
    .from("users")
    .update({
      password: hashedPassword,
      reset_token: null,
      reset_token_expires: null,
    })
    .eq("id", user.id)

  return NextResponse.json({ message: "Contraseña actualizada correctamente" })
}
