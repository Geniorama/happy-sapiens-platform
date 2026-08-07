"use client"

import { useRef, useState, useTransition } from "react"
import { X, Upload, Download, Loader2, FileUp, CheckCircle2, AlertTriangle } from "lucide-react"
import { bulkCreateUsers, type AdminUserRow, type AdminUserPayload } from "@/app/admin/users/actions"

const ROLES = ["user", "coach", "admin", "afiliado"] as const
type Role = (typeof ROLES)[number]

const TEMPLATE_HEADERS = [
  "firstName",
  "lastName",
  "email",
  "role",
  "subscriptionStatus",
  "subscriptionStartDate",
  "subscriptionEndDate",
]

const TEMPLATE_CSV = `${TEMPLATE_HEADERS.join(",")}
Ana,Pérez,ana@mail.com,user,active,2026-08-07,2027-08-07
Luis,Gómez,luis@mail.com,coach,inactive,,
`

// Parser CSV mínimo: soporta comillas dobles y comas dentro de campos entrecomillados.
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let field = ""
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
      continue
    }
    if (c === '"') { inQuotes = true; continue }
    if (c === ",") { row.push(field); field = ""; continue }
    if (c === "\r") continue
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue }
    field += c
  }
  // Última fila si el archivo no termina en salto de línea
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

interface ParsedRow {
  line: number // número de línea de datos (1-based, sin contar cabecera)
  data: AdminUserRow
  error: string | null
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function buildRow(cells: string[], line: number): ParsedRow {
  const get = (i: number) => (cells[i] ?? "").trim()
  const firstName = get(0)
  const lastName = get(1)
  const email = get(2)
  const roleRaw = get(3).toLowerCase() || "user"
  const statusRaw = get(4).toLowerCase() || "inactive"
  const startDate = get(5)
  const endDate = get(6)

  const role = roleRaw as Role
  const status = (statusRaw === "active" ? "active" : "inactive") as "active" | "inactive"

  const data: AdminUserRow = {
    first_name: firstName,
    last_name: lastName,
    email,
    role,
    subscription_status: status,
    subscription_start_date: startDate || undefined,
    subscription_end_date: endDate || undefined,
  }

  let error: string | null = null
  if (!firstName) error = "Nombre requerido"
  else if (!lastName) error = "Apellido requerido"
  else if (!email) error = "Email requerido"
  else if (!ROLES.includes(role)) error = `Rol inválido: "${roleRaw}"`
  else if (statusRaw !== "active" && statusRaw !== "inactive") error = `Suscripción inválida: "${statusRaw}"`
  else if (role === "user" && status === "active") {
    if (!startDate || !endDate) error = "Fechas de suscripción requeridas para user activo"
    else if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) error = "Fechas deben ser YYYY-MM-DD"
    else if (new Date(endDate) <= new Date(startDate)) error = "Vencimiento debe ser posterior al inicio"
  }

  return { line, data, error }
}

export function BulkCreateUsers({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (users: AdminUserPayload[]) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [sendInvites, setSendInvites] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<
    | { created: number; skipped: { row: number; email: string; reason: string }[]; invitesFailed: number }
    | null
  >(null)

  const validRows = parsed?.filter((r) => !r.error) ?? []
  const invalidRows = parsed?.filter((r) => r.error) ?? []

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "plantilla-usuarios.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFile = async (file: File) => {
    setResult(null)
    setParseError(null)
    setParsed(null)
    setFileName(file.name)
    const text = await file.text()
    const matrix = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ""))
    if (matrix.length === 0) { setParseError("El archivo está vacío"); return }

    // Detectar y saltar cabecera si la primera fila parece encabezado
    const first = matrix[0].map((c) => c.trim().toLowerCase())
    const hasHeader = first.includes("email") || first.includes("firstname")
    const dataRows = hasHeader ? matrix.slice(1) : matrix

    if (dataRows.length === 0) { setParseError("No hay filas de datos"); return }

    const rows = dataRows.map((cells, idx) => buildRow(cells, idx + 1))
    setParsed(rows)
  }

  const handleSubmit = () => {
    if (validRows.length === 0) return
    setResult(null)
    startTransition(async () => {
      const res = await bulkCreateUsers(validRows.map((r) => r.data), { sendInvites })
      if ("error" in res) { setParseError(res.error); return }
      onCreated(res.created)
      setResult({ created: res.created.length, skipped: res.skipped, invitesFailed: res.invitesFailed })
      setParsed(null)
      setFileName(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    })
  }

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-zinc-900 text-sm flex items-center gap-2">
          <FileUp className="w-4 h-4" /> Carga masiva de usuarios
        </h3>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        Sube un archivo <code className="text-zinc-700">.csv</code> con las columnas de la plantilla.
        Las filas inválidas o con emails ya existentes se omiten y se reportan. Máximo 500 usuarios por carga.
      </p>

      <div className="flex flex-wrap gap-2">
        <button onClick={downloadTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer">
          <Download className="w-3.5 h-3.5" /> Descargar plantilla CSV
        </button>
        <button onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer">
          <Upload className="w-3.5 h-3.5" /> {fileName ? "Cambiar archivo" : "Elegir archivo CSV"}
        </button>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {fileName && <span className="text-xs text-zinc-500 self-center">{fileName}</span>}
      </div>

      {parseError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{parseError}</p>
      )}

      {parsed && (
        <div className="space-y-3">
          <div className="text-xs text-zinc-600">
            <span className="font-medium text-green-700">{validRows.length}</span> fila(s) válida(s)
            {invalidRows.length > 0 && (
              <> · <span className="font-medium text-amber-700">{invalidRows.length}</span> con errores (se omitirán)</>
            )}
          </div>

          {invalidRows.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 text-xs">
              {invalidRows.map((r) => (
                <div key={r.line} className="px-3 py-1.5 border-b border-amber-100 last:border-0 text-amber-800">
                  <span className="font-medium">Fila {r.line}</span>
                  {r.data.email ? ` (${r.data.email})` : ""} — {r.error}
                </div>
              ))}
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
            <input type="checkbox" checked={sendInvites} onChange={(e) => setSendInvites(e.target.checked)}
              className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500" />
            Enviar correo de invitación (establecer contraseña) a cada usuario creado
          </label>

          <div className="flex gap-2 justify-end">
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-600 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer">
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={isPending || validRows.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors cursor-pointer">
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {isPending ? "Cargando..." : `Cargar ${validRows.length} usuario(s)`}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-4 h-4" />
            Creados <strong>{result.created}</strong> · Omitidos <strong>{result.skipped.length}</strong>
          </p>
          {result.invitesFailed > 0 && (
            <p className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              {result.invitesFailed} correo(s) de invitación fallaron. Puedes reenviarlos desde el panel de cada usuario.
            </p>
          )}
          {result.skipped.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-zinc-200 bg-white text-xs">
              {result.skipped.map((s) => (
                <div key={s.row} className="px-3 py-1.5 border-b border-zinc-100 last:border-0 text-zinc-600">
                  <span className="font-medium">Fila {s.row}</span>
                  {s.email ? ` (${s.email})` : ""} — {s.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
