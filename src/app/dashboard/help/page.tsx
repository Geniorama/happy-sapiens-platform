import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { MessageCircle, Mail, Clock } from "lucide-react"
import { SectionCover } from "@/components/dashboard/section-cover"
import { HelpFaq } from "@/components/dashboard/help-faq"

const WHATSAPP_NUMBER = "+57 311 8830405"
const WHATSAPP_LINK = "https://wa.me/573118830405"
const SUPPORT_EMAIL = "info@happysapiens.co"

export default async function HelpPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  const coverRow = await prisma.sectionCover.findFirst({
    where: { sectionKey: "help", isActive: true },
    select: { title: true, subtitle: true, imageUrl: true },
  })

  const waMessage = encodeURIComponent(
    `Hola, soy ${session.user.name ?? "un usuario de Happy Sapiens"} (${session.user.email}). Necesito ayuda con:`
  )
  const emailSubject = encodeURIComponent("Ayuda · Happy Sapiens")
  const emailBody = encodeURIComponent(
    `Hola,\n\nSoy ${session.user.name ?? ""} (${session.user.email}).\n\nNecesito ayuda con:\n`
  )

  return (
    <div className="max-w-7xl mx-auto">
      <SectionCover
        title={coverRow?.title || ""}
        subtitle={coverRow?.subtitle || ""}
        imageUrl={coverRow?.imageUrl}
        fallbackTitle="Ayuda"
        fallbackSubtitle="Estamos aquí para apoyarte. Revisa las preguntas frecuentes o contáctanos directamente."
      />

      <HelpFaq />

      <div className="mt-10 sm:mt-12 mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl uppercase font-heading text-zinc-900 mb-1">
          ¿No resolvimos tu duda?
        </h2>
        <p className="text-sm text-zinc-600">
          Escríbenos por el canal que prefieras y nuestro equipo te responderá lo antes posible.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <a
          href={`${WHATSAPP_LINK}?text=${waMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 hover:border-emerald-400 hover:shadow-md transition-all"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
              <MessageCircle className="w-6 h-6 text-emerald-600" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">WhatsApp</h3>
            <p className="text-sm text-zinc-600 mb-4">
              La forma más rápida de hablar con nosotros. Respuesta en horario laboral.
            </p>
            <p className="text-base font-medium text-zinc-900">{WHATSAPP_NUMBER}</p>
          </div>
          <span className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 group-hover:bg-emerald-700 transition-colors">
            Escribir por WhatsApp
          </span>
        </a>

        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${emailSubject}&body=${emailBody}`}
          className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 hover:border-primary/60 hover:shadow-md transition-all"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Mail className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Correo electrónico</h3>
            <p className="text-sm text-zinc-600 mb-4">
              Ideal para consultas que requieran adjuntos o respuestas detalladas.
            </p>
            <p className="text-base font-medium text-zinc-900 break-all">{SUPPORT_EMAIL}</p>
          </div>
          <span className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary text-white text-sm font-semibold px-4 py-2.5 group-hover:opacity-90 transition-opacity">
            Enviar correo
          </span>
        </a>
      </div>

      <div className="mt-6 sm:mt-8 rounded-2xl bg-zinc-50 border border-zinc-200 p-5 sm:p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-white border border-zinc-200 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-zinc-600" strokeWidth={1.5} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 mb-1">Horario de atención</h4>
          <p className="text-sm text-zinc-600">
            Lunes a viernes de 8:00 a.m. a 6:00 p.m. · Sábados de 9:00 a.m. a 1:00 p.m. (hora Colombia).
            Los mensajes recibidos fuera de este horario se responderán el siguiente día hábil.
          </p>
        </div>
      </div>
    </div>
  )
}
