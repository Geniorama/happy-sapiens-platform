"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { uploadToS3 } from "@/lib/s3"
import { Prisma } from "@prisma/client"

async function getAdminSession() {
  const session = await auth()
  if (!session?.user?.id) return null
  if (session.user.role !== "admin") return null
  return session
}

export async function uploadPartnerImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") return { error: "No autorizado" }

  const file = formData.get("file") as File
  if (!file) return { error: "No se recibió ningún archivo" }

  if (!file.type.startsWith("image/")) return { error: "El archivo debe ser una imagen" }
  if (file.size > 5 * 1024 * 1024) return { error: "La imagen debe ser menor a 5MB" }

  const ext = file.name.split(".").pop()
  const key = `partners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const url = await uploadToS3(buffer, key, file.type)

  return { url }
}

export interface PartnerFormData {
  name: string
  category: string
  website_url?: string
  discount_percentage?: number | null
  discount_description?: string
  logo_url?: string
  cover_image_url?: string
  terms_and_conditions?: string
}

export async function createPartner(data: PartnerFormData) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!data.name?.trim()) return { error: "El nombre es requerido" }

  try {
    const created = await prisma.partner.create({
      data: {
        name: data.name.trim(),
        category: data.category?.trim() || null,
        websiteUrl: data.website_url?.trim() || null,
        discountPercentage: data.discount_percentage ?? null,
        discountDescription: data.discount_description?.trim() || null,
        logoUrl: data.logo_url?.trim() || null,
        coverImageUrl: data.cover_image_url?.trim() || null,
        termsAndConditions: data.terms_and_conditions?.trim() || null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        category: true,
        websiteUrl: true,
        discountPercentage: true,
        discountDescription: true,
        logoUrl: true,
        coverImageUrl: true,
        termsAndConditions: true,
        isActive: true,
      },
    })

    const partner = {
      id: created.id,
      name: created.name,
      category: created.category,
      website_url: created.websiteUrl,
      discount_percentage: created.discountPercentage,
      discount_description: created.discountDescription,
      logo_url: created.logoUrl,
      cover_image_url: created.coverImageUrl,
      terms_and_conditions: created.termsAndConditions,
      is_active: created.isActive ?? true,
    }

    revalidatePath("/admin/partners")
    revalidatePath("/dashboard/partners")
    return { success: true, partner }
  } catch (err) {
    console.error("Error creando marca:", err)
    return { error: "Error al crear la marca" }
  }
}

export async function updatePartner(id: string, data: PartnerFormData) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!data.name?.trim()) return { error: "El nombre es requerido" }

  try {
    await prisma.partner.update({
      where: { id },
      data: {
        name: data.name.trim(),
        category: data.category?.trim() || null,
        websiteUrl: data.website_url?.trim() || null,
        discountPercentage: data.discount_percentage ?? null,
        discountDescription: data.discount_description?.trim() || null,
        logoUrl: data.logo_url?.trim() || null,
        coverImageUrl: data.cover_image_url?.trim() || null,
        termsAndConditions: data.terms_and_conditions?.trim() || null,
      },
    })
  } catch (err) {
    console.error("Error actualizando marca:", err)
    return { error: "Error al actualizar la marca" }
  }

  revalidatePath("/admin/partners")
  revalidatePath("/dashboard/partners")
  return { success: true }
}

export async function deletePartner(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  try {
    // Eliminar todos los cupones de la marca primero
    await prisma.coupon.deleteMany({ where: { partnerId: id } })
    await prisma.partner.delete({ where: { id } })
  } catch (err) {
    console.error("Error eliminando marca:", err)
    return { error: "Error al eliminar la marca" }
  }

  revalidatePath("/admin/partners")
  revalidatePath("/admin/coupons")
  revalidatePath("/dashboard/partners")
  return { success: true }
}

// ── Categorías ───────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

export async function createCategory(name: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const trimmed = name.trim()
  if (!trimmed) return { error: "El nombre es requerido" }

  const slug = toSlug(trimmed)
  if (!slug) return { error: "El nombre no genera un slug válido" }

  try {
    const created = await prisma.partnerCategory.create({
      data: { slug, name: trimmed },
      select: { id: true, slug: true, name: true },
    })
    revalidatePath("/admin/partners")
    return { success: true, category: created }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Ya existe una categoría con ese slug" }
    }
    console.error("Error creando categoría:", err)
    return { error: "Error al crear la categoría" }
  }
}

export async function deleteCategory(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  try {
    await prisma.partnerCategory.delete({ where: { id } })
  } catch (err) {
    console.error("Error eliminando categoría:", err)
    return { error: "Error al eliminar la categoría" }
  }

  revalidatePath("/admin/partners")
  revalidatePath("/dashboard/partners")
  return { success: true }
}

export async function bulkTogglePartnersActive(ids: string[], isActive: boolean) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  try {
    await prisma.partner.updateMany({
      where: { id: { in: ids } },
      data: { isActive },
    })
  } catch (err) {
    console.error("Error en bulk toggle partners:", err)
    return { error: "Error al actualizar el estado" }
  }

  revalidatePath("/admin/partners")
  revalidatePath("/dashboard/partners")
  return { success: true }
}

export async function bulkDeletePartners(ids: string[]) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  try {
    await prisma.coupon.deleteMany({ where: { partnerId: { in: ids } } })
    await prisma.partner.deleteMany({ where: { id: { in: ids } } })
  } catch (err) {
    console.error("Error en bulk delete partners:", err)
    return { error: "Error al eliminar las marcas" }
  }

  revalidatePath("/admin/partners")
  revalidatePath("/admin/coupons")
  revalidatePath("/dashboard/partners")
  return { success: true }
}

export async function togglePartnerActive(id: string, isActive: boolean) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  try {
    await prisma.partner.update({
      where: { id },
      data: { isActive },
    })
  } catch (err) {
    console.error("Error toggling partner:", err)
    return { error: "Error al actualizar el estado" }
  }

  revalidatePath("/admin/partners")
  revalidatePath("/dashboard/partners")
  return { success: true }
}
