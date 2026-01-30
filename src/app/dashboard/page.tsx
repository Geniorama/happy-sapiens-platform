import { redirect } from "next/navigation"

export default function DashboardPage() {
  // Redirigir directamente a Mi Perfil
  redirect("/dashboard/profile")
}
