"use server"

import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function updateProfile(formData: FormData) {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: "No autenticado" }
  }

  const name = formData.get("name") as string
  const phone = formData.get("phone") as string
  const birthDate = formData.get("birthDate") as string
  const gender = formData.get("gender") as string

  try {
    const { error } = await supabaseAdmin
      .from("users")
      .update({
        name: name || null,
        phone: phone || null,
        birth_date: birthDate || null,
        gender: gender || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id)

    if (error) {
      console.error("Error actualizando perfil:", error)
      return { error: "Error al actualizar el perfil" }
    }

    revalidatePath("/dashboard/profile")
    return { success: true }
  } catch (error) {
    console.error("Error:", error)
    return { error: "Error al actualizar el perfil" }
  }
}
