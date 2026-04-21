"use client"

import { useRef, useState, type ReactNode } from "react"
import { User, Heart, Link2 } from "lucide-react"

type TabKey = "personal" | "health" | "account"

type Props = {
  personal: ReactNode
  health: ReactNode
  account: ReactNode
}

const TABS: { key: TabKey; label: string; icon: typeof User }[] = [
  { key: "personal", label: "Perfil", icon: User },
  { key: "health", label: "Salud", icon: Heart },
  { key: "account", label: "Cuenta", icon: Link2 },
]

export function ProfileTabs({ personal, health, account }: Props) {
  const [active, setActive] = useState<TabKey>("personal")
  const anchorRef = useRef<HTMLDivElement>(null)

  const panels: Record<TabKey, ReactNode> = {
    personal,
    health,
    account,
  }

  const handleSelect = (key: TabKey) => {
    setActive(key)
    const isMobile = window.matchMedia("(max-width: 1023px)").matches
    const offset = isMobile ? 64 : 68
    const el = anchorRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - offset - 8
    window.scrollTo({ top, behavior: "smooth" })
  }

  return (
    <div className="relative">
      <div ref={anchorRef} aria-hidden className="absolute -top-2 left-0 right-0 h-0" />
      <div className="sticky top-16 lg:top-[68px] z-20 -mx-4 sm:mx-0 bg-zinc-50/95 backdrop-blur-md border-y border-zinc-200 sm:border sm:rounded-2xl sm:shadow-sm sm:bg-white/95 sm:mt-2">
        <div
          role="tablist"
          aria-label="Secciones del perfil"
          className="flex gap-1 overflow-x-auto no-scrollbar px-3 sm:px-3 py-2"
        >
          {TABS.map(({ key, label, icon: Icon }) => {
            const isActive = active === key
            return (
              <button
                key={key}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tab-panel-${key}`}
                onClick={() => handleSelect(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all min-h-[44px] cursor-pointer ${
                  isActive
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.75} />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div
        id={`tab-panel-${active}`}
        role="tabpanel"
        className="mt-4 sm:mt-6 space-y-4 sm:space-y-6"
      >
        {panels[active]}
      </div>
    </div>
  )
}
