import { createHmac } from "crypto"

export function getCalendarToken(userId: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET!)
    .update(userId)
    .digest("hex")
    .slice(0, 32)
}
