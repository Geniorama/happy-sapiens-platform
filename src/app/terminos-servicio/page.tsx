export const metadata = {
  title: "Términos y condiciones del servicio — Happy Sapiens",
  description: "Términos y condiciones del servicio de suscripción de Happy Sapiens",
}

export default function TerminosServicioPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-heading text-zinc-900 mb-2">
          Términos y condiciones del servicio
        </h1>
        <p className="text-sm text-zinc-500 mb-8">Última actualización: marzo de 2026</p>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 sm:p-8 text-sm text-zinc-600 space-y-6">

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">1. Descripción del servicio</h2>
            <p>
              Happy Sapiens ofrece una suscripción mensual que incluye la entrega de un producto físico
              (Happy Blend, Happy On o Happy Off) y el acceso a la plataforma digital de bienestar
              Happy Sapiens con todos sus módulos y funcionalidades.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">2. Suscripción y cobro</h2>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                La suscripción tiene una vigencia mensual y se renueva automáticamente cada mes
                mediante cobro recurrente a través de MercadoPago.
              </li>
              <li>
                El valor del cobro corresponde al producto seleccionado al momento de la suscripción.
              </li>
              <li>
                El primer cobro se realiza al autorizar la suscripción en MercadoPago. Los cobros
                siguientes se realizan en la misma fecha del mes.
              </li>
              <li>
                En caso de fallo en el cobro, MercadoPago puede realizar reintentos según su política.
                Si el pago no se procesa, el acceso a la plataforma puede ser suspendido.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">3. Entrega del producto</h2>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                El despacho se realiza mensualmente una vez confirmado el pago, a la dirección de
                envío registrada al momento de la suscripción.
              </li>
              <li>
                Los tiempos de entrega dependen de la empresa de logística (Coordinadora) y pueden
                variar según la ciudad de destino.
              </li>
              <li>
                Es responsabilidad del usuario mantener actualizada la dirección de envío. Para
                actualizarla comunícate con nosotros a{" "}
                <a href="mailto:hola@happysapiens.co" className="text-primary underline">
                  hola@happysapiens.co
                </a>.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">4. Acceso a la plataforma digital</h2>
            <p>
              El acceso a la plataforma Happy Sapiens está condicionado a tener una suscripción
              activa. Al cancelar o pausar la suscripción, el acceso será suspendido al finalizar
              el período pagado.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">5. Cancelación</h2>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                Puedes cancelar tu suscripción en cualquier momento directamente desde tu cuenta
                de MercadoPago o contactándonos a{" "}
                <a href="mailto:hola@happysapiens.co" className="text-primary underline">
                  hola@happysapiens.co
                </a>.
              </li>
              <li>
                La cancelación aplica a partir del siguiente ciclo de cobro. No se realizan
                reembolsos del período en curso.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">6. Uso aceptable</h2>
            <p>
              El acceso a la plataforma es personal e intransferible. Está prohibido compartir
              credenciales de acceso o utilizar el servicio para fines distintos a los de uso
              personal de bienestar.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">7. Modificaciones al servicio</h2>
            <p>
              Happy Sapiens se reserva el derecho de modificar los contenidos de la plataforma,
              los productos incluidos en la suscripción o el precio, con previo aviso de al menos
              30 días a los suscriptores activos.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">8. Ley aplicable</h2>
            <p>
              Estos términos se rigen por las leyes de la República de Colombia. Cualquier
              controversia será resuelta ante los tribunales competentes de la ciudad de Bogotá D.C.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
