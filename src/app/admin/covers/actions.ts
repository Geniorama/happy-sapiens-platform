"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { uploadToS3 } from "@/lib/s3"

async function getAdminSession() {
  const session = await auth()
  if (!session?.user?.id) return null
  if (session.user.role !== "admin") return null
  return session
}

export async function uploadCoverImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const file = formData.get("file") as File
  if (!file) return { error: "No se recibió ningún archivo" }

  if (!file.type.startsWith("image/")) return { error: "El archivo debe ser una imagen" }
  if (file.size > 5 * 1024 * 1024) return { error: "La imagen debe ser menor a 5MB" }

  const ext = file.name.split(".").pop()
  const key = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const url = await uploadToS3(buffer, key, file.type)

  return { url }
}

export interface CoverFormData {
  title?: string
  subtitle?: string
  image_url?: string
  is_active?: boolean
}

export async function updateCover(sectionKey: string, data: CoverFormData) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  try {
    await prisma.sectionCover.update({
      where: { sectionKey },
      data: {
        title: data.title?.trim() || null,
        subtitle: data.subtitle?.trim() || null,
        imageUrl: data.image_url?.trim() || null,
        isActive: data.is_active ?? true,
      },
    })
  } catch (err) {
    console.error("Error actualizando portada:", err)
    return { error: "Error al actualizar la portada" }
  }

  revalidatePath("/admin/covers")
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/profile")
  revalidatePath("/dashboard/subscription")
  revalidatePath("/dashboard/points")
  revalidatePath("/dashboard/partners")
  revalidatePath("/dashboard/coaches")
  return { success: true }
}
