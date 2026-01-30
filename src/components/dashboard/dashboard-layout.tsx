"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ReactNode } from "react"
import { User, LogOut, Handshake } from "lucide-react"
import { handleSignOut } from "@/app/dashboard/actions"

function LogoutButton() {
  return (
    <form action={handleSignOut}>
      <button
        type="submit"
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-600 hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Cerrar Sesión
      </button>
    </form>
  )
}

interface DashboardLayoutProps {
  children: ReactNode
  userName?: string | null
  userEmail?: string | null
}

export function DashboardLayout({ children, userName, userEmail }: DashboardLayoutProps) {
  const pathname = usePathname()

  const navigation = [
    { name: "Mi Perfil", href: "/dashboard/profile", icon: User },
    { name: "Aliados", href: "/dashboard/partners", icon: Handshake },
    // Aquí se pueden agregar más módulos en el futuro
    // { name: "Configuración", href: "/dashboard/settings", icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-zinc-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-200">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">HS</span>
            </div>
            <span className="font-heading text-xl text-zinc-900">Happy Sapiens</span>
          </Link>
        </div>

        {/* User Info */}
        <div className="px-6 py-6 border-b border-zinc-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold text-sm">
                {userName?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">
                {userName || "Usuario"}
              </p>
              <p className="text-xs text-zinc-500 truncate">{userEmail}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }
                `}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-zinc-200">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64">
        <div className="min-h-screen p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
