"use server"

import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { uploadToS3 } from "@/lib/s3"

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

  logo_url?: string
  cover_image_url?: string
  terms_and_conditions?: string
}

export async function createPartner(data: PartnerFormData) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!data.name?.trim()) return { error: "El nombre es requerido" }

  const { data: created, error } = await supabaseAdmin
    .from("partners")
    .insert({
      name: data.name.trim(),
      category: data.category?.trim() || null,
      website_url: data.website_url?.trim() || null,
      logo_url: data.logo_url?.trim() || null,
      cover_image_url: data.cover_image_url?.trim() || null,
      terms_and_conditions: data.terms_and_conditions?.trim() || null,
      is_active: true,
    })
    .select("id, name, category, website_url, logo_url, cover_image_url, terms_and_conditions, is_active")
    .single()

  if (error) {
    console.error("Error creando marca:", error)
    return { error: "Error al crear la marca" }
  }

  revalidatePath("/admin/partners")
  return { success: true, partner: created }
}

export async function updatePartner(id: string, data: PartnerFormData) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  if (!data.name?.trim()) return { error: "El nombre es requerido" }

  const { error } = await supabaseAdmin
    .from("partners")
    .update({
      name: data.name.trim(),
      category: data.category?.trim() || null,
      website_url: data.website_url?.trim() || null,
      logo_url: data.logo_url?.trim() || null,
      cover_image_url: data.cover_image_url?.trim() || null,
      terms_and_conditions: data.terms_and_conditions?.trim() || null,
    })
    .eq("id", id)

  if (error) {
    console.error("Error actualizando marca:", error)
    return { error: "Error al actualizar la marca" }
  }

  revalidatePath("/admin/partners")
  return { success: true }
}

export async function deletePartner(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  // Eliminar todos los cupones de la marca primero
  const { error: couponsError } = await supabaseAdmin
    .from("coupons")
    .delete()
    .eq("partner_id", id)

  if (couponsError) {
    console.error("Error eliminando cupones de la marca:", couponsError)
    return { error: "Error al eliminar los cupones de la marca" }
  }

  const { error } = await supabaseAdmin.from("partners").delete().eq("id", id)

  if (error) {
    console.error("Error eliminando marca:", error)
    return { error: "Error al eliminar la marca" }
  }

  revalidatePath("/admin/partners")
  revalidatePath("/admin/coupons")
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

  const { data: created, error } = await supabaseAdmin
    .from("partner_categories")
    .insert({ slug, name: trimmed })
    .select("id, slug, name")
    .single()

  if (error) {
    if (error.code === "23505") return { error: "Ya existe una categoría con ese slug" }
    console.error("Error creando categoría:", error)
    return { error: "Error al crear la categoría" }
  }

  revalidatePath("/admin/partners")
  return { success: true, category: created }
}

export async function deleteCategory(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const { error } = await supabaseAdmin
    .from("partner_categories")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error eliminando categoría:", error)
    return { error: "Error al eliminar la categoría" }
  }

  revalidatePath("/admin/partners")
  return { success: true }
}

export async function bulkTogglePartnersActive(ids: string[], isActive: boolean) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const { error } = await supabaseAdmin
    .from("partners")
    .update({ is_active: isActive })
    .in("id", ids)

  if (error) {
    console.error("Error en bulk toggle partners:", error)
    return { error: "Error al actualizar el estado" }
  }

  revalidatePath("/admin/partners")
  return { success: true }
}

export async function bulkDeletePartners(ids: string[]) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const { error: couponsError } = await supabaseAdmin
    .from("coupons")
    .delete()
    .in("partner_id", ids)

  if (couponsError) {
    console.error("Error eliminando cupones en bulk:", couponsError)
    return { error: "Error al eliminar los cupones asociados" }
  }

  const { error } = await supabaseAdmin.from("partners").delete().in("id", ids)

  if (error) {
    console.error("Error en bulk delete partners:", error)
    return { error: "Error al eliminar las marcas" }
  }

  revalidatePath("/admin/partners")
  revalidatePath("/admin/coupons")
  return { success: true }
}

export async function togglePartnerActive(id: string, isActive: boolean) {
  const session = await getAdminSession()
  if (!session) return { error: "No autorizado" }

  const { error } = await supabaseAdmin
    .from("partners")
    .update({ is_active: isActive })
    .eq("id", id)

  if (error) {
    console.error("Error toggling partner:", error)
    return { error: "Error al actualizar el estado" }
  }

  revalidatePath("/admin/partners")
  return { success: true }
}
