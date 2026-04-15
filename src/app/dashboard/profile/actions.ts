"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { uploadToS3, deleteFromS3, extractKeyFromUrl } from "@/lib/s3"
import { awardPointsOnce, POINT_ACTIONS, POINTS_BY_ACTION } from "@/lib/points"

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
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || null,
        phone: phone || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        gender: gender || null,
      },
    })

    revalidatePath("/dashboard/profile")

    // Puntos por completar el perfil (solo la primera vez que todos los campos están llenos)
    let pointsEarned: number | undefined
    if (name && phone && birthDate && gender) {
      const pts = await awardPointsOnce({
        userId: session.user.id,
        actionType: POINT_ACTIONS.COMPLETE_PROFILE,
        description: "Perfil completado",
      })
      if (pts.success && !pts.alreadyEarned) {
        pointsEarned = POINTS_BY_ACTION[POINT_ACTIONS.COMPLETE_PROFILE]
      }
    }

    return { success: true, pointsEarned }
  } catch (error) {
    console.error("Error actualizando perfil:", error)
    return { error: "Error al actualizar el perfil" }
  }
}

export async function uploadAvatar(formData: FormData) {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: "No autenticado" }
  }

  const file = formData.get("file") as File
  if (!file) {
    return { error: "No se recibió ningún archivo" }
  }

  try {
    // Obtener usuario actual para eliminar avatar anterior
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    })

    // Eliminar avatar anterior de S3 si existe
    if (user?.image) {
      const oldKey = extractKeyFromUrl(user.image)
      if (oldKey) {
        try {
          await deleteFromS3(oldKey)
        } catch (error) {
          console.log("No se pudo eliminar imagen anterior:", error)
        }
      }
    }

    // Preparar archivo para S3
    const fileExt = file.name.split(".").pop()
    const timestamp = Date.now()
    const key = `avatars/${session.user.id}/avatar-${timestamp}.${fileExt}`

    // Convertir file a buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Subir a S3
    const publicUrl = await uploadToS3(buffer, key, file.type)

    // Actualizar URL en la base de datos
    try {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { image: publicUrl },
      })
    } catch (updateError) {
      console.error("Error actualizando URL:", updateError)
      // Intentar eliminar de S3 si falla la actualización de BD
      try {
        await deleteFromS3(key)
      } catch {}
      return { error: "Error al actualizar el perfil" }
    }

    revalidatePath("/dashboard/profile")
    revalidatePath("/coach/profile")

    // Puntos por subir foto de perfil (solo la primera vez)
    let pointsEarned: number | undefined
    const pts = await awardPointsOnce({
      userId: session.user.id,
      actionType: POINT_ACTIONS.UPLOAD_AVATAR,
      description: "Foto de perfil subida",
    })
    if (pts.success && !pts.alreadyEarned) {
      pointsEarned = POINTS_BY_ACTION[POINT_ACTIONS.UPLOAD_AVATAR]
    }

    return { success: true, url: publicUrl, pointsEarned }
  } catch (error) {
    console.error("Error:", error)
    return { error: "Error al subir la imagen" }
  }
}

export async function deleteAvatar() {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: "No autenticado" }
  }

  try {
    // Obtener usuario actual para saber qué archivo eliminar
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    })

    if (user?.image) {
      // Extraer la key de la URL
      const key = extractKeyFromUrl(user.image)

      if (key) {
        try {
          // Eliminar archivo de S3
          await deleteFromS3(key)
        } catch (error) {
          console.log("No se pudo eliminar de S3:", error)
        }
      }
    }

    // Actualizar base de datos
    try {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { image: null },
      })
    } catch (updateError) {
      console.error("Error actualizando perfil:", updateError)
      return { error: "Error al actualizar el perfil" }
    }

    revalidatePath("/dashboard/profile")
    revalidatePath("/coach/profile")
    return { success: true }
  } catch (error) {
    console.error("Error:", error)
    return { error: "Error al eliminar la imagen" }
  }
}
