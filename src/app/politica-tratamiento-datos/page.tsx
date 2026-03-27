export const metadata = {
  title: "Política de tratamiento de datos — Happy Sapiens",
  description: "Política de tratamiento de datos personales de Happy Sapiens",
}

export default function PoliticaTratamientoDatosPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-heading text-zinc-900 mb-2">
          Política de tratamiento de datos personales
        </h1>
        <p className="text-sm text-zinc-500 mb-8">Última actualización: marzo de 2026</p>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 sm:p-8 text-sm text-zinc-600 space-y-6">

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">1. Responsable del tratamiento</h2>
            <p>
              Happy Sapiens es el responsable del tratamiento de los datos personales recolectados a través
              de esta plataforma, en cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013 de la
              República de Colombia.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">2. Datos que recolectamos</h2>
            <p>Recolectamos los siguientes datos personales:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Nombre completo</li>
              <li>Correo electrónico</li>
              <li>Número de teléfono</li>
              <li>Tipo y número de documento de identidad</li>
              <li>Dirección de facturación y envío</li>
              <li>Ciudad y departamento de residencia</li>
              <li>Información de perfil de salud (cuando aplique)</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">3. Finalidades del tratamiento</h2>
            <p>Los datos personales serán tratados para las siguientes finalidades:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Gestionar y ejecutar la suscripción y los cobros recurrentes</li>
              <li>Coordinar el despacho y entrega mensual del producto</li>
              <li>Crear y administrar la cuenta de usuario en la plataforma</li>
              <li>Enviar comunicaciones relacionadas con el servicio (confirmaciones, recordatorios)</li>
              <li>Atender solicitudes de soporte o cancelación</li>
              <li>Cumplir con obligaciones legales y tributarias</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">4. Transferencia de datos a terceros</h2>
            <p>
              Para prestar el servicio correctamente, compartimos datos con los siguientes terceros:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>MercadoPago:</strong> procesamiento de pagos y cobros recurrentes</li>
              <li><strong>Shopify:</strong> gestión de órdenes y logística de despacho</li>
              <li><strong>Coordinadora:</strong> servicio de envío y entrega del producto</li>
            </ul>
            <p>
              Estos terceros actúan como encargados del tratamiento bajo sus propias políticas de
              privacidad y únicamente para las finalidades descritas.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">5. Derechos del titular</h2>
            <p>Como titular de los datos tienes derecho a:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Conocer, actualizar y rectificar tus datos personales</li>
              <li>Solicitar prueba de la autorización otorgada</li>
              <li>Ser informado sobre el uso de tus datos</li>
              <li>Presentar quejas ante la Superintendencia de Industria y Comercio</li>
              <li>Revocar la autorización y solicitar la supresión de tus datos, salvo que exista
                  obligación legal de conservarlos</li>
            </ul>
            <p>
              Para ejercer estos derechos escríbenos a{" "}
              <a href="mailto:hola@happysapiens.co" className="text-primary underline">
                hola@happysapiens.co
              </a>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">6. Seguridad de los datos</h2>
            <p>
              Implementamos medidas técnicas y organizativas para proteger tus datos personales
              contra acceso no autorizado, pérdida o divulgación indebida, incluyendo cifrado en
              tránsito y en reposo, y acceso restringido a personal autorizado.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">7. Vigencia</h2>
            <p>
              Los datos personales serán conservados durante el tiempo que dure la relación
              contractual y hasta cinco (5) años después de su terminación, o el tiempo que
              exijan las normas legales aplicables.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900">8. Cambios a esta política</h2>
            <p>
              Podemos actualizar esta política en cualquier momento. Los cambios sustanciales serán
              comunicados por correo electrónico o mediante un aviso visible en la plataforma.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
