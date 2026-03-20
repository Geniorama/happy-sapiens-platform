export { auth as middleware } from "@/lib/auth"

export const config = {
  matcher: ["/dashboard/:path*", "/coach/:path*", "/admin/:path*", "/api/protected/:path*"],
}
