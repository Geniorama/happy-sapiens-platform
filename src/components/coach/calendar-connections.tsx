"use client"

import { useState, useTransition, useEffect } from "react"
import { CheckCircle, Link2, Loader2, LogOut, AlertCircle, ArrowLeftRight, Video, Shield } from "lucide-react"
import { useSearchParams } from "next/navigation"

interface CalendarConnectionsProps {
  googleConnected: boolean
  googleEmail?: string
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export function CalendarConnections({ googleConnected, googleEmail }: CalendarConnectionsProps) {
  const [isPending, startTransition] = useTransition()
  const [disconnecting, setDisconnecting] = useState(false)
  const searchParams = useSearchParams()
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    const connected = searchParams.get("calendar_connected")
    const error = searchParams.get("calendar_error")
    if (connected === "google") {
      setBanner({ type: "success", text: "Google Calendar conectado correctamente. Tus eventos ya bloquean horarios en la app." })
    } else if (error) {
      const msgs: Record<string, string> = {
        access_denied: "Acceso denegado. Vuelve a intentarlo y acepta los permisos.",
        invalid_state: "Error de seguridad. Intenta conectar de nuevo.",
        token_exchange: "No se pudo completar la conexión con Google. Intenta de nuevo.",
        db_save: "Los tokens se recibieron pero no se pudieron guardar. Revisá la consola del servidor.",
      }
      setBanner({ type: "error", text: msgs[error] ?? "Error al conectar el calendario." })
    }
  }, [searchParams])

  function handleConnect() {
    startTransition(() => {
      window.location.href = "/api/coach/calendar/google/connect"
    })
  }

  async function handleDisconnect() {
    if (!confirm("¿Desconectar Google Calendar? Tus eventos ya no bloquearán horarios en la app.")) return
    setDisconnecting(true)
    await fetch("/api/coach/calendar/google/disconnect", { method: "POST" })
    window.location.reload()
  }

  return (
    <div className="rounded-xl border-2 border-primary/30 overflow-hidden bg-white shadow-sm">
      {/* Header destacado */}
      <div className="px-6 py-4 border-b border-primary/10 bg-primary/5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ArrowLeftRight className="w-4 h-4 text-primary" strokeWidth={2} />
            <h2 className="font-heading text-base text-zinc-900">Sincronización bidireccional</h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-primary text-white rounded-full">Recomendado</span>
          </div>
          <p className="text-xs text-zinc-600">
            Conecta tu Google Calendar para una integración completa. Tus eventos bloquean horarios en la app y las citas aparecen automáticamente en tu calendario.
          </p>
        </div>
      </div>

      {/* Qué incluye */}
      <div className="px-6 py-4 border-b border-zinc-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-xs text-zinc-700">Tus eventos de Google <strong>bloquean horarios</strong> en la app automáticamente</p>
        </div>
        <div className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-xs text-zinc-700">Las citas agendadas <strong>aparecen en tu Google Calendar</strong> en tiempo real</p>
        </div>
        <div className="flex items-start gap-2">
          <Video className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-xs text-zinc-700">Se genera un <strong>link de Google Meet</strong> automáticamente en cada cita</p>
        </div>
      </div>

      {/* Banner feedback */}
      {banner && (
        <div className={`mx-6 mt-4 flex items-start gap-2.5 p-3 rounded-lg text-sm border ${
          banner.type === "success"
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {banner.type === "success"
            ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          }
          {banner.text}
        </div>
      )}

      <div className="divide-y divide-zinc-100">
        {/* Google Calendar */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <GoogleIcon />
            <div>
              <p className="text-sm font-medium text-zinc-900">Google Calendar</p>
              {googleConnected && googleEmail ? (
                <p className="text-xs text-zinc-500 mt-0.5">{googleEmail}</p>
              ) : (
                <p className="text-xs text-zinc-400 mt-0.5">No conectado</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {googleConnected ? (
              <>
                <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Conectado
                </span>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 border border-zinc-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  Desconectar
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                Conectar Google Calendar
              </button>
            )}
          </div>
        </div>

        {/* Outlook — próximamente */}
        <div className="flex items-center justify-between px-6 py-4 opacity-50">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center">
              <span className="text-[#0078D4] text-base font-bold leading-none">⊞</span>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">Outlook Calendar</p>
              <p className="text-xs text-zinc-400 mt-0.5">Próximamente</p>
            </div>
          </div>
          <span className="text-xs text-zinc-400 border border-zinc-200 px-2.5 py-1 rounded-lg">Próximamente</span>
        </div>
      </div>

      {/* Nota de seguridad */}
      <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100 flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
        <p className="text-xs text-zinc-500">
          Happy Sapiens solo solicita permisos para leer y crear eventos. Nunca modifica ni elimina eventos existentes en tu calendario.
        </p>
      </div>
    </div>
  )
}
