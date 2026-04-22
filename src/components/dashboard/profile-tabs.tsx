"use client"

import { useRef, useState, type ReactNode } from "react"
import { User, Heart, Link2, type LucideIcon } from "lucide-react"

export type ProfileTabIcon = "user" | "heart" | "link"

const ICONS: Record<ProfileTabIcon, LucideIcon> = {
  user: User,
  heart: Heart,
  link: Link2,
}

export type ProfileTab = {
  key: string
  label: string
  icon: ProfileTabIcon
  content: ReactNode
}

type LegacyProps = {
  personal: ReactNode
  health: ReactNode
  account: ReactNode
}

type ListProps = {
  tabs: ProfileTab[]
}

type Props = LegacyProps | ListProps

function isListProps(p: Props): p is ListProps {
  return (p as ListProps).tabs !== undefined
}

export function ProfileTabs(props: Props) {
  const tabs: ProfileTab[] = isListProps(props)
    ? props.tabs
    : [
        { key: "personal", label: "Perfil", icon: "user", content: props.personal },
        { key: "health", label: "Salud", icon: "heart", content: props.health },
        { key: "account", label: "Cuenta", icon: "link", content: props.account },
      ]

  const [active, setActive] = useState<string>(tabs[0]?.key ?? "")
  const anchorRef = useRef<HTMLDivElement>(null)

  const handleSelect = (key: string) => {
    setActive(key)
    const isMobile = window.matchMedia("(max-width: 1023px)").matches
    const offset = isMobile ? 64 : 68
    const el = anchorRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - offset - 8
    window.scrollTo({ top, behavior: "smooth" })
  }

  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0]

  return (
    <div className="relative">
      <div ref={anchorRef} aria-hidden className="absolute -top-2 left-0 right-0 h-0" />
      <div className="sticky top-16 lg:top-[68px] z-20 -mx-4 sm:mx-0 bg-zinc-50/95 backdrop-blur-md border-y border-zinc-200 sm:border sm:rounded-2xl sm:shadow-sm sm:bg-white/95 sm:mt-2">
        <div
          role="tablist"
          aria-label="Secciones del perfil"
          className="flex gap-1 overflow-x-auto no-scrollbar px-3 sm:px-3 py-2"
        >
          {tabs.map(({ key, label, icon }) => {
            const Icon = ICONS[icon]
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
        id={`tab-panel-${activeTab?.key}`}
        role="tabpanel"
        className="mt-4 sm:mt-6 space-y-4 sm:space-y-6"
      >
        {activeTab?.content}
      </div>
    </div>
  )
}
