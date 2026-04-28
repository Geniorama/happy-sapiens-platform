"use client"

import { ReactNode, useEffect, useRef, useState } from "react"

interface ScrollableNavProps {
  children: ReactNode
  className?: string
}

export function ScrollableNav({ children, className = "" }: ScrollableNavProps) {
  const ref = useRef<HTMLElement>(null)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      setCanScrollUp(el.scrollTop > 4)
      setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4)
    }

    update()
    el.addEventListener("scroll", update, { passive: true })

    const ro = new ResizeObserver(update)
    ro.observe(el)
    Array.from(el.children).forEach((child) => ro.observe(child))

    return () => {
      el.removeEventListener("scroll", update)
      ro.disconnect()
    }
  }, [children])

  return (
    <div className="relative flex-1 min-h-0">
      <nav
        ref={ref}
        className={`h-full overflow-y-auto ${className}`}
      >
        {children}
      </nav>
      <div
        className={`pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-white to-transparent transition-opacity duration-200 ${
          canScrollUp ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent transition-opacity duration-200 ${
          canScrollDown ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  )
}
