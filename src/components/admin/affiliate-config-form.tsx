"use client"

import { useState, useTransition } from "react"
import { Percent } from "lucide-react"
import { updateRewardPercent } from "@/app/admin/afiliados/actions"

export function AffiliateConfigForm({ current }: { current: number }) {
  const [value, setValue] = useState(String(current))
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const save = () => {
    setMessage(null)
    const percent = Number(value)
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      setMessage({ type: "error", text: "Ingresa un porcentaje entre 0 y 100" })
      return
    }
    startTransition(async () => {
      const res = await updateRewardPercent(percent)
      if ("error" in res) {
        setMessage({ type: "error", text: res.error })
      } else {
        setMessage({ type: "ok", text: "Porcentaje guardado" })
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-100">
        <Percent className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
        <h2 className="font-semibold text-zinc-900 text-sm">Recompensa por referido</h2>
      </div>
      <div className="p-6">
        <p className="text-sm text-zinc-600 mb-4">
          Porcentaje del precio del plan que gana el afiliado por cada referido que se
          suscribe. Aplica a las recompensas nuevas; las ya registradas conservan su valor.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Porcentaje (%)</label>
            <div className="relative w-40">
              <input
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={isPending}
                className="w-full text-sm border border-zinc-300 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-zinc-50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">%</span>
            </div>
          </div>
          <button
            onClick={save}
            disabled={isPending}
            className="px-5 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? "Guardando..." : "Guardar"}
          </button>
          {message && (
            <span className={`text-sm ${message.type === "ok" ? "text-green-700" : "text-red-600"}`}>
              {message.text}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
