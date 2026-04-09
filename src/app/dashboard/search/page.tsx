import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SearchResults } from "@/components/dashboard/search-results"

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const { q } = await searchParams
  const query = q?.trim() || ""

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl uppercase font-heading text-zinc-900 mb-1 sm:mb-2">
          Resultados de búsqueda
        </h1>
        {query && (
          <p className="text-sm sm:text-base text-zinc-600">
            Resultados para &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      {query ? (
        <SearchResults query={query} />
      ) : (
        <p className="text-zinc-500 text-sm">Escribe algo en el buscador para ver resultados.</p>
      )}
    </div>
  )
}
