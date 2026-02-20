import Link from "next/link"

export const metadata = {
  title: "Términos y condiciones",
  description: "Términos y condiciones de los cupones y ofertas de Happy Sapiens",
}

export default function TerminosCondicionesPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <Link
          href="/dashboard/partners"
          className="inline-flex items-center text-sm text-zinc-600 hover:text-zinc-900 mb-6"
        >
          Volver a cupones
        </Link>
        <h1 className="text-2xl sm:text-3xl font-heading text-zinc-900 mb-6">
          Términos y condiciones
        </h1>
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 sm:p-8 text-sm text-zinc-600 space-y-4">
          <p>
            Los cupones y ofertas disponibles en la sección de partners de Happy Sapiens están
            sujetos a las condiciones de cada marca participante y a las siguientes reglas de uso.
          </p>
          <p>
            Al obtener o utilizar un cupón, aceptas cumplir con los términos específicos que la
            marca asociada pueda indicar en la ficha del cupón. Las condiciones particulares de
            cada oferta (vigencia, uso único, productos aplicables, etc.) se detallan en cada
            campaña.
          </p>
          <p>
            Para consultar los términos y condiciones concretos de una oferta, revisa el enlace
            o el texto de términos y condiciones que aparece en la tarjeta del cupón correspondiente.
          </p>
          <p>
            Si tienes dudas sobre una oferta concreta, contacta con el partner o con Happy Sapiens.
          </p>
        </div>
      </div>
    </div>
  )
}
