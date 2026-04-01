import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const session = req.auth
  const { pathname } = req.nextUrl

  // Si no hay sesión, redirigir al login
  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", req.url))
  }

  const role = session.user?.role
  const subscriptionStatus = session.user?.subscriptionStatus
  const userId = session.user?.id

  // Usuario OAuth sin cuenta en Supabase → redirigir a suscripción
  if (!userId) {
    return NextResponse.redirect(new URL("/subscribe?oauth=1", req.url))
  }

  // Admins y coaches no necesitan verificación de suscripción
  if (role === "admin" || role === "coach") {
    return NextResponse.next()
  }

  // Rutas de usuario que requieren suscripción activa
  const requiresSubscription =
    pathname.startsWith("/dashboard") || pathname.startsWith("/coach")

  if (requiresSubscription && subscriptionStatus !== "active") {
    // Usuarios con pago vencido pueden ver solo la página de suscripción
    if (subscriptionStatus === "past_due" && pathname.startsWith("/dashboard/subscription")) {
      return NextResponse.next()
    }
    if (subscriptionStatus === "past_due") {
      return NextResponse.redirect(new URL("/dashboard/subscription", req.url))
    }
    return NextResponse.redirect(new URL("/auth/subscription-required", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/dashboard/:path*", "/coach/:path*", "/admin/:path*"],
}
