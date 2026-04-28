"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ReactNode, useState } from "react"
import { LayoutDashboard, Building2, Tag, UserCheck, Users, Star, User, LogOut, Menu, X, ScrollText, ImageIcon, CreditCard, BarChart3, ShoppingBag, ExternalLink } from "lucide-react"
import { handleSignOut } from "@/app/dashboard/actions"
import { ScrollableNav } from "@/components/ui/scrollable-nav"

function LogoutButton() {
  return (
    <form action={handleSignOut}>
      <button
        type="submit"
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-600 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        Cerrar Sesión
      </button>
    </form>
  )
}

interface AdminLayoutProps {
  children: ReactNode
  userName?: string | null
  userEmail?: string | null
  userImage?: string | null
}

export function AdminLayout({ children, userName, userEmail, userImage }: AdminLayoutProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigation = [
    { name: "Inicio", href: "/admin", icon: LayoutDashboard, exact: true },
    { name: "Marcas", href: "/admin/partners", icon: Building2, exact: false },
    { name: "Cupones", href: "/admin/coupons", icon: Tag, exact: false },
    { name: "Coaches", href: "/admin/coaches", icon: UserCheck, exact: false },
    { name: "Usuarios", href: "/admin/users", icon: Users, exact: false },
    { name: "Estadísticas", href: "/admin/stats", icon: BarChart3, exact: false },
    { name: "Planes", href: "/admin/plans", icon: CreditCard, exact: false },
    { name: "Puntos", href: "/admin/points", icon: Star, exact: false },
    { name: "Portadas", href: "/admin/covers", icon: ImageIcon, exact: false },
    { name: "Logs", href: "/admin/logs", icon: ScrollText, exact: false },
    { name: "Mi Perfil", href: "/admin/profile", icon: User, exact: false },
  ]

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-4 z-50">
        <Link href="/admin" className="flex items-center">
          <img
            src="https://cdn.shopify.com/s/files/1/0957/4632/6892/files/hsRecurso_1_1.png?v=1775847307"
            alt="Happy Sapiens"
            className="h-12 w-auto"
          />
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6 text-zinc-700" />
          ) : (
            <Menu className="w-6 h-6 text-zinc-700" />
          )}
        </button>
      </header>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 cursor-pointer"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 w-64 bg-white border-r border-zinc-200 flex flex-col z-50
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="relative flex items-center justify-center px-6 py-6 border-b border-zinc-200 shrink-0">
          <Link
            href="/admin"
            className="flex items-center"
            onClick={() => setMobileMenuOpen(false)}
          >
            <img
              src="https://cdn.shopify.com/s/files/1/0957/4632/6892/files/hsRecurso_1_1.png?v=1775847307"
              alt="Happy Sapiens"
              className="h-14 w-auto"
            />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-zinc-700" />
          </button>
        </div>

        {/* User Info */}
        <div className="px-6 py-6 border-b border-zinc-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center overflow-hidden shrink-0">
              {userImage ? (
                <img src={userImage} alt={userName || "Admin"} className="w-full h-full object-cover" />
              ) : (
                <span className="text-amber-700 font-semibold text-sm">
                  {userName?.charAt(0)?.toUpperCase() || "A"}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">
                {userName || "Administrador"}
              </p>
              <p className="text-xs text-zinc-500 truncate">{userEmail}</p>
            </div>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-100 rounded-lg px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
            <span className="text-xs font-semibold text-amber-700">Administrador</span>
          </div>
        </div>

        {/* Navigation */}
        <ScrollableNav className="px-3 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/")
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
                  ${
                    isActive
                      ? "bg-amber-50 text-amber-700"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }
                `}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                {item.name}
              </Link>
            )
          })}
          <a
            href="https://happysapiens.co"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
            <span className="flex-1">Tienda</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" strokeWidth={1.5} />
          </a>
        </ScrollableNav>

        {/* Logout */}
        <div className="p-3 border-t border-zinc-200 shrink-0">
          <LogoutButton />
          <p className="mt-2 text-center text-[10px] text-zinc-400">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">{children}</div>
      </main>
    </div>
  )
}
