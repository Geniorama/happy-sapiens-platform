"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ReactNode, useState } from "react"
import { User, LogOut, Handshake, Menu, X, Users, Star, CreditCard, PauseCircle, HelpCircle, ShoppingBag, ExternalLink } from "lucide-react"
import { handleSignOut } from "@/app/dashboard/actions"
import { SearchBar } from "@/components/dashboard/search-bar"

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

interface DashboardLayoutProps {
  children: ReactNode
  userName?: string | null
  userEmail?: string | null
  userImage?: string | null
  initialPoints?: number | null
  subscriptionStatus?: string | null
}

export function DashboardLayout({ children, userName, userEmail, userImage, initialPoints, subscriptionStatus }: DashboardLayoutProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const points = initialPoints ?? null

  const navigation = [
    { name: "Mi Perfil", href: "/dashboard/profile", icon: User },
    { name: "Mi Suscripción", href: "/dashboard/subscription", icon: CreditCard },
    { name: "Mis Puntos", href: "/dashboard/points", icon: Star },
    { name: "Aliados", href: "/dashboard/partners", icon: Handshake },
    { name: "Ritual Coaches", href: "/dashboard/coaches", icon: Users },
    { name: "Ayuda", href: "/dashboard/help", icon: HelpCircle },
  ]

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-4 z-50">
        <Link href="/dashboard" className="flex items-center">
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

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 cursor-pointer"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-white border-r border-zinc-200 flex flex-col z-50
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="relative flex items-center justify-center px-6 py-6 border-b border-zinc-200">
          <Link href="/dashboard" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
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
        <div className="px-6 py-6 border-b border-zinc-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
              {userImage ? (
                <img
                  src={userImage}
                  alt={userName ?? "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-primary font-semibold text-sm">
                  {userName?.charAt(0)?.toUpperCase() || "U"}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">
                {userName || "Usuario"}
              </p>
              <p className="text-xs text-zinc-500 truncate">{userEmail}</p>
            </div>
          </div>
          {/* Puntos */}
          <Link
            href="/dashboard/points"
            onClick={() => setMobileMenuOpen(false)}
            className="mt-3 flex items-center gap-2 bg-amber-50 hover:bg-amber-100 transition-colors rounded-lg px-3 py-2"
          >
            <Star className="w-4 h-4 text-amber-500 shrink-0" fill="currentColor" />
            <span className="text-xs font-semibold text-amber-700">
              {points === null ? "—" : points.toLocaleString()} puntos
            </span>
          </Link>
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
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
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
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-zinc-200">
          <LogoutButton />
          <p className="mt-2 text-center text-[10px] text-zinc-400">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64">
        {/* Search Bar */}
        <div className="sticky top-0 lg:top-0 z-30 bg-white border-b border-zinc-200 px-4 sm:px-6 lg:px-8 py-3 mt-16 lg:mt-0">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-xl mx-auto">
              <SearchBar />
            </div>
          </div>
        </div>

        {subscriptionStatus === "paused" && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 sm:px-6 lg:px-8 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-yellow-800">
                <PauseCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span>Tu suscripción está pausada. No puedes agendar citas ni obtener cupones mientras esté en pausa.</span>
              </div>
              <Link
                href="/dashboard/subscription/manage"
                className="shrink-0 text-xs font-semibold text-yellow-700 underline underline-offset-2 hover:text-yellow-900 transition-colors"
              >
                Reactivar
              </Link>
            </div>
          </div>
        )}
        <div className="min-h-screen px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 pb-4 sm:pb-6 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>

        {/* Everyday Ritual */}
        <section className="bg-primary px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 lg:gap-16">
            <h2 className="font-heading text-4xl sm:text-5xl lg:text-7xl uppercase text-white leading-tight text-center lg:text-left shrink-0">
              Everyday<br />Ritual
            </h2>
            <p className="text-sm sm:text-base text-white/85 leading-relaxed text-center lg:text-left max-w-xl">
              Los grandes cambios no empiezan con decisiones enormes, sino con pequeños actos repetidos con intención. Un momento al día puede convertirse en tu ancla, tu pausa, tu forma de volver a ti. Cuando algo se vuelve ritual, deja de ser esfuerzo y se convierte en parte de quién eres.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-zinc-200 bg-white px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <a href="https://www.instagram.com/happysapiensco" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-600 transition-colors" aria-label="Instagram">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://www.facebook.com/profile.php?id=61584910522920" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-600 transition-colors" aria-label="Facebook">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="https://www.tiktok.com/@happysapiensco" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-600 transition-colors" aria-label="TikTok">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
              </a>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-xs text-zinc-400">
                &copy; {new Date().getFullYear()} Happy Sapiens. Todos los derechos reservados.
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Desarrollado por{" "}
                <a href="https://geniorama.co" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-700 font-medium transition-colors">
                  Geniorama
                </a>
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
