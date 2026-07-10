import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function Home() {
  const session = await auth()

  if (session?.user) {
    const role = session.user.role
    const home =
      role === "coach" ? "/coach/appointments" : role === "afiliado" ? "/afiliado" : "/dashboard"
    redirect(home)
  }

  redirect("/auth/login")
}
