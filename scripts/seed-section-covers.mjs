import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const defaults = [
  { sectionKey: 'profile',      title: 'Mi Perfil',       subtitle: 'Tu espacio personal en Happy Sapiens' },
  { sectionKey: 'subscription', title: 'Mi Suscripción',  subtitle: 'Gestiona tu plan y beneficios' },
  { sectionKey: 'points',       title: 'Mis Puntos',      subtitle: 'Acumula y disfruta tus recompensas' },
  { sectionKey: 'partners',     title: 'Aliados',         subtitle: 'Descuentos exclusivos de nuestras marcas aliadas' },
  { sectionKey: 'coaches',      title: 'Ritual Coaches',  subtitle: 'Agenda citas con nuestros profesionales especializados' },
]

for (const cover of defaults) {
  await prisma.sectionCover.upsert({
    where: { sectionKey: cover.sectionKey },
    create: cover,
    update: {},
  })
  console.log(`  ✓ ${cover.sectionKey}`)
}

await prisma.$disconnect()
