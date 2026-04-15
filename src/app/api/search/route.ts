import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get("q")?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ coaches: [], partners: [], coupons: [] })
  }

  const [coaches, partners, coupons] = await Promise.all([
    // Coaches activos
    prisma.user.findMany({
      where: {
        role: "coach",
        isCoachActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { specialization: { contains: q, mode: "insensitive" } },
          { bio: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, specialization: true, image: true },
      orderBy: { name: "asc" },
      take: 6,
    }),

    // Aliados activos
    prisma.partner.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
          { discountDescription: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        category: true,
        logoUrl: true,
        discountPercentage: true,
        discountDescription: true,
      },
      orderBy: { name: "asc" },
      take: 6,
    }),

    // Cupones disponibles
    prisma.coupon.findMany({
      where: {
        isAssigned: false,
        partner: { isActive: true },
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        coverImageUrl: true,
        discountPercentage: true,
        discountDescription: true,
        partner: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ])

  return NextResponse.json({
    coaches: coaches.map((c) => ({
      id: c.id,
      name: c.name,
      specialization: c.specialization,
      image: c.image,
    })),
    partners: partners.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      logo_url: p.logoUrl,
      discount_percentage: p.discountPercentage,
      discount_description: p.discountDescription,
    })),
    coupons: coupons.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      cover_image_url: c.coverImageUrl,
      discount_percentage: c.discountPercentage,
      discount_description: c.discountDescription,
      partner: c.partner
        ? {
            id: c.partner.id,
            name: c.partner.name,
            logo_url: c.partner.logoUrl,
            is_active: c.partner.isActive,
          }
        : null,
    })),
  })
}
