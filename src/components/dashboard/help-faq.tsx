"use client"

import { useState } from "react"
import { ChevronDown, CreditCard, Truck, Users, Handshake, Star, UserCog } from "lucide-react"
import type { ComponentType } from "react"

interface FaqItem {
  q: string
  a: string
}

interface FaqCategory {
  key: string
  title: string
  description: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  items: FaqItem[]
}

const CATEGORIES: FaqCategory[] = [
  {
    key: "suscripcion",
    title: "Suscripción y pagos",
    description: "Renovación, cobros, pausa y cancelación",
    icon: CreditCard,
    items: [
      {
        q: "¿Cómo funciona mi suscripción?",
        a: "Tu suscripción es mensual y se renueva automáticamente el mismo día del mes en que te suscribiste. Cada mes recibirás tu producto en casa y mantendrás acceso completo a la plataforma, coaches y aliados.",
      },
      {
        q: "¿Cuándo se hace el cobro?",
        a: "El cobro se realiza automáticamente a través de Mercado Pago cada 30 días desde la fecha de tu primer pago. Recibirás un correo de confirmación cada vez que se procese.",
      },
      {
        q: "¿Puedo pausar mi suscripción?",
        a: "Sí. En 'Mi Suscripción > Gestionar' puedes pausarla en cualquier momento. Mientras esté pausada no se harán cobros, pero tampoco podrás agendar citas con coaches ni reclamar cupones de aliados.",
      },
      {
        q: "¿Cómo cancelo mi suscripción?",
        a: "Desde 'Mi Suscripción > Gestionar' puedes cancelarla. Mantendrás el acceso hasta el final del período ya pagado y después no se volverá a cobrar.",
      },
      {
        q: "¿Qué pasa si falla el cobro?",
        a: "Si el cobro falla, tu suscripción queda en estado 'pendiente' y lo intentamos de nuevo automáticamente. Te enviaremos un correo para que actualices tu método de pago si es necesario.",
      },
    ],
  },
  {
    key: "envios",
    title: "Envíos y facturación",
    description: "Tiempos, tracking y factura electrónica",
    icon: Truck,
    items: [
      {
        q: "¿Cuándo recibo mi producto?",
        a: "Tu producto se despacha después de cada cobro exitoso. El tiempo de entrega depende de tu ciudad: normalmente 2 a 5 días hábiles en ciudades principales y 4 a 8 días hábiles en otros municipios.",
      },
      {
        q: "¿Quién hace la entrega?",
        a: "Los envíos los realiza Coordinadora. Una vez despachado, recibirás un correo con el número de guía para que hagas el seguimiento.",
      },
      {
        q: "¿Dónde encuentro mi factura electrónica?",
        a: "Tus facturas electrónicas se emiten automáticamente en Siigo (cumpliendo con la DIAN) y te llegan al correo registrado tras cada pago. Si no la recibes, escríbenos por WhatsApp o correo y la reenviamos.",
      },
      {
        q: "¿Puedo cambiar la dirección de envío?",
        a: "Sí. Ingresa a 'Mi Perfil' y actualiza tu dirección antes del próximo cobro. Si el pedido del mes ya fue despachado, el cambio aplicará al siguiente envío.",
      },
    ],
  },
  {
    key: "coaches",
    title: "Coaches y citas",
    description: "Agendar, cancelar y reagendar sesiones",
    icon: Users,
    items: [
      {
        q: "¿Cómo agendo una cita con un coach?",
        a: "Entra a 'Ritual Coaches', elige el coach que prefieras y selecciona un horario disponible en su calendario. Recibirás la confirmación por correo.",
      },
      {
        q: "¿Puedo cancelar o reagendar una cita?",
        a: "Sí. Desde 'Ritual Coaches > Mis citas' puedes cancelar o reagendar. Te pedimos hacerlo con al menos 24 horas de anticipación para que el coach pueda liberar el espacio.",
      },
      {
        q: "¿Las citas tienen costo adicional?",
        a: "No. Las sesiones con coaches están incluidas en tu suscripción activa. Solo necesitas tener tu plan al día para reservar.",
      },
    ],
  },
  {
    key: "aliados",
    title: "Aliados y cupones",
    description: "Descuentos exclusivos en marcas aliadas",
    icon: Handshake,
    items: [
      {
        q: "¿Cómo obtengo un cupón de descuento?",
        a: "Ve a 'Aliados', filtra por categoría o marca y haz clic en 'Obtener cupón'. El código aparecerá en 'Mis Cupones' y podrás usarlo en el sitio de la marca aliada.",
      },
      {
        q: "¿Los cupones tienen fecha de vencimiento?",
        a: "Sí. Cada cupón muestra su fecha de vencimiento y los términos y condiciones específicos de la marca aliada.",
      },
      {
        q: "¿Puedo tener varios cupones de la misma marca?",
        a: "Depende de la campaña. Algunas marcas permiten varios cupones por usuario y otras solo uno. En la tarjeta del cupón se indica el máximo permitido.",
      },
    ],
  },
  {
    key: "puntos",
    title: "Puntos y referidos",
    description: "Gana puntos e invita amigos",
    icon: Star,
    items: [
      {
        q: "¿Cómo gano puntos?",
        a: "Ganas puntos por acciones dentro de la plataforma: completar tu perfil, reservar citas, mantener tu suscripción activa y referir amigos que se suscriban con tu código.",
      },
      {
        q: "¿Dónde encuentro mi código de referido?",
        a: "En 'Mi Perfil' verás tu código personal. Cuando alguien se suscriba usando tu código, ambos recibirán puntos.",
      },
      {
        q: "¿Para qué sirven los puntos?",
        a: "Los puntos se pueden usar para acceder a beneficios exclusivos y recompensas que habilitamos periódicamente dentro de la plataforma.",
      },
    ],
  },
  {
    key: "cuenta",
    title: "Cuenta y vinculaciones",
    description: "Contraseña, Strava y Google",
    icon: UserCog,
    items: [
      {
        q: "¿Cómo cambio mi contraseña?",
        a: "Cierra sesión, ve a 'Iniciar sesión' y haz clic en '¿Olvidaste tu contraseña?'. Te enviaremos un enlace a tu correo para crear una nueva.",
      },
      {
        q: "¿Cómo conecto mi cuenta de Strava?",
        a: "En 'Mi Perfil', busca la tarjeta de Strava y haz clic en 'Conectar'. Te pediremos autorización en Strava y volverás al perfil con la cuenta vinculada.",
      },
      {
        q: "¿Cómo conecto Google?",
        a: "En 'Mi Perfil' puedes vincular tu cuenta de Google para iniciar sesión más rápido la próxima vez.",
      },
      {
        q: "No recuerdo con qué correo me registré",
        a: "Escríbenos por WhatsApp o correo con el nombre completo con el que hiciste la suscripción y te ayudamos a identificar la cuenta.",
      },
    ],
  },
]

export function HelpFaq() {
  const [activeKey, setActiveKey] = useState<string>(CATEGORIES[0].key)
  const active = CATEGORIES.find((c) => c.key === activeKey) ?? CATEGORIES[0]

  return (
    <div>
      <div className="mb-5 sm:mb-6">
        <h2 className="text-xl sm:text-2xl uppercase font-heading text-zinc-900 mb-1">
          Preguntas frecuentes
        </h2>
        <p className="text-sm text-zinc-600">
          Elige un tema para ver las respuestas. Si no encuentras lo que buscas, escríbenos más abajo.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {CATEGORIES.map((category) => {
          const Icon = category.icon
          const isActive = category.key === activeKey
          return (
            <button
              key={category.key}
              type="button"
              onClick={() => setActiveKey(category.key)}
              aria-pressed={isActive}
              className={`
                group relative text-left rounded-2xl border p-4 transition-all cursor-pointer
                ${isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"}
              `}
            >
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors
                ${isActive ? "bg-primary/15" : "bg-zinc-100 group-hover:bg-zinc-200"}
              `}>
                <Icon
                  className={isActive ? "w-5 h-5 text-primary" : "w-5 h-5 text-zinc-600"}
                  strokeWidth={1.75}
                />
              </div>
              <h3 className={`
                text-sm font-semibold leading-tight mb-1
                ${isActive ? "text-primary" : "text-zinc-900"}
              `}>
                {category.title}
              </h3>
              <p className="text-xs text-zinc-500 leading-snug">
                {category.description}
              </p>
            </button>
          )
        })}
      </div>

      <div className="mt-5 sm:mt-6 rounded-2xl border border-zinc-200 bg-white divide-y divide-zinc-100 overflow-hidden">
        {active.items.map((item, idx) => (
          <details key={`${active.key}-${idx}`} className="group">
            <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none hover:bg-zinc-50 transition-colors">
              <span className="text-sm sm:text-base font-medium text-zinc-900">
                {item.q}
              </span>
              <ChevronDown
                className="w-4 h-4 text-zinc-500 shrink-0 transition-transform group-open:rotate-180"
                strokeWidth={1.75}
              />
            </summary>
            <div className="px-5 pt-2 pb-5 text-sm text-zinc-600 leading-relaxed">
              {item.a}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
