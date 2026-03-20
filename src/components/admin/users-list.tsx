"use client"

import { useState } from "react"
import { Search, Users } from "lucide-react"

interface User {
  id: string
  name: string | null
  email: string
  role: string
  created_at: string
  coupons_count: number
}

export function UsersList({ users }: { users: User[] }) {
  const [search, setSearch] = useState("")

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      !q ||
      u.name?.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    )
  })

  const roleBadge = (role: string) => {
    if (role === "coach") return "bg-green-100 text-green-700"
    if (role === "admin") return "bg-amber-100 text-amber-700"
    return "bg-zinc-100 text-zinc-600"
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <p className="text-xs text-zinc-400">
        {filtered.length} de {users.length} usuario(s)
      </p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <Users className="w-10 h-10 mb-2" strokeWidth={1} />
            <p className="text-sm">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Usuario
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Rol
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden sm:table-cell">
                    Cupones
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden md:table-cell">
                    Registro
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-zinc-900">{user.name || "Sin nombre"}</p>
                        <p className="text-xs text-zinc-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadge(user.role)}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span className="text-zinc-700 font-medium">{user.coupons_count}</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className="text-xs text-zinc-400">
                        {new Date(user.created_at).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
