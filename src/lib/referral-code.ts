import { randomBytes } from "crypto"
import { prisma } from "@/lib/db"

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function generateCode(length = 6): string {
  const bytes = randomBytes(length)
  let code = "HSP-"
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return code
}

export async function ensureReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  })

  if (user?.referralCode) return user.referralCode

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode()
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
        select: { referralCode: true },
      })
      return updated.referralCode!
    } catch {
      // Colisión con unique index o error transitorio: reintentar
    }
  }

  throw new Error("No se pudo generar un código de referido único")
}
