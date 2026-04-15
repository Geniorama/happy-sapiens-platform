import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const { hash } = bcrypt
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    email:    { type: 'string' },
    password: { type: 'string' },
    name:     { type: 'string' },
    promote:  { type: 'boolean', default: false },
  },
})

if (!values.email) {
  console.error('Falta --email')
  console.error('Uso: node scripts/create-admin.mjs --email a@b.com --password secret123 --name "Admin"')
  console.error('     node scripts/create-admin.mjs --email a@b.com --promote   (promover existente)')
  process.exit(1)
}

const prisma = new PrismaClient()

const existing = await prisma.user.findUnique({
  where: { email: values.email },
  select: { id: true, role: true, email: true, name: true },
})

if (existing) {
  if (values.promote) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'admin' },
      select: { id: true, email: true, name: true, role: true },
    })
    console.log(`Usuario promovido a admin:`)
    console.log(updated)
  } else {
    console.error(`Ya existe un usuario con email ${values.email} (role: ${existing.role}).`)
    console.error(`Para promoverlo a admin: agregá --promote`)
    process.exit(1)
  }
} else {
  if (!values.password || values.password.length < 6) {
    console.error('Para crear un usuario nuevo, --password debe tener al menos 6 caracteres')
    process.exit(1)
  }

  const hashed = await hash(values.password, 10)

  const created = await prisma.user.create({
    data: {
      email: values.email,
      password: hashed,
      name: values.name ?? 'Admin',
      role: 'admin',
      subscriptionStatus: 'active',
    },
    select: { id: true, email: true, name: true, role: true },
  })

  console.log('Admin creado:')
  console.log(created)
}

await prisma.$disconnect()
