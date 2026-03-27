"use client"

import { useEffect } from "react"
import { signOut } from "next-auth/react"

export default function LogoutPage() {
  useEffect(() => {
    // redirect: false + window.location.replace fuerza recarga completa del navegador,
    // evitando que el router cache de Next.js sirva páginas autenticadas después del logout
    signOut({ redirect: false }).then(() => {
      window.location.replace("/auth/login")
    })
  }, [])

  return null
}
