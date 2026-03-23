"use client"

import { useState, useTransition } from "react"
import { Save, Loader2, KeyRound, Check } from "lucide-react"
import { updateAdminProfile, updateAdminPassword } from "@/app/admin/profile/actions"
import { PhoneInput } from "@/components/ui/phone-input"

interface AdminProfileFormProps {
  profile: {
    id: string
    name: string | null
    email: string | null
    phone: string | null
    created_at: string | null
  }
}

export function AdminProfileForm({ profile }: AdminProfileFormProps) {
  // Datos personales
  const [name, setName] = useState(profile.name || "")
  const [phone, setPhone] = useState(profile.phone || "")
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isProfilePending, startProfileTransition] = useTransition()

  // Contraseña
  const [currentPwd, setCurrentPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [pwdMsg, setPwdMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isPwdPending, startPwdTransition] = useTransition()

  const handleProfileSave = () => {
    setProfileMsg(null)
    startProfileTransition(async () => {
      const result = await updateAdminProfile({ name, phone })
      if (result.error) {
        setProfileMsg({ type: "error", text: result.error })
      } else {
        setProfileMsg({ type: "success", text: "Perfil actualizado correctamente" })
      }
    })
  }

  const handlePasswordSave = () => {
    setPwdMsg(null)
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: "error", text: "Las contraseñas no coinciden" })
      return
    }
    startPwdTransition(async () => {
      const result = await updateAdminPassword({ currentPassword: currentPwd, newPassword: newPwd })
      if (result.error) {
        setPwdMsg({ type: "error", text: result.error })
      } else {
        setPwdMsg({ type: "success", text: "Contraseña actualizada correctamente" })
        setCurrentPwd("")
        setNewPwd("")
        setConfirmPwd("")
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Datos personales */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
          Información personal
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Teléfono</label>
            <PhoneInput value={phone} onChange={setPhone} variant="amber" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">Email</label>
          <input
            type="email"
            value={profile.email || ""}
            disabled
            className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg bg-zinc-50 text-zinc-400 cursor-not-allowed"
          />
          <p className="text-xs text-zinc-400 mt-1">El email no se puede cambiar desde aquí.</p>
        </div>

        <div className="flex items-center gap-4 pt-1">
          <button
            type="button"
            onClick={handleProfileSave}
            disabled={isProfilePending || !name.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isProfilePending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar cambios
          </button>
          {profileMsg && (
            <p className={`text-sm flex items-center gap-1 ${profileMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {profileMsg.type === "success" && <Check className="w-3.5 h-3.5" />}
              {profileMsg.text}
            </p>
          )}
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            Cambiar contraseña
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Contraseña actual</label>
            <input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Nueva contraseña</label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="mínimo 6 caracteres"
              className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Confirmar nueva contraseña</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 pt-1">
          <button
            type="button"
            onClick={handlePasswordSave}
            disabled={isPwdPending || !currentPwd || !newPwd || !confirmPwd}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isPwdPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Actualizar contraseña
          </button>
          {pwdMsg && (
            <p className={`text-sm flex items-center gap-1 ${pwdMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {pwdMsg.type === "success" && <Check className="w-3.5 h-3.5" />}
              {pwdMsg.text}
            </p>
          )}
        </div>
      </div>

      {/* Información de cuenta */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-3">
          Información de cuenta
        </h2>
        <div className="space-y-2 text-xs text-zinc-500">
          <p>
            <span className="font-medium text-zinc-700">Miembro desde: </span>
            {profile.created_at
              ? new Date(profile.created_at).toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "—"}
          </p>
          <p>
            <span className="font-medium text-zinc-700">ID: </span>
            <span className="font-mono">{profile.id}</span>
          </p>
          <p>
            <span className="font-medium text-zinc-700">Rol: </span>
            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">Administrador</span>
          </p>
        </div>
      </div>
    </div>
  )
}
