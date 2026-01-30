import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { PartnerCard } from "@/components/dashboard/partner-card"
import { UserCouponsList } from "@/components/dashboard/user-coupons-list"

export default async function PartnersPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  // Obtener marcas aliadas activas
  const { data: partners } = await supabaseAdmin
    .from("partners")
    .select("*")
    .eq("is_active", true)
    .order("name")

  // Obtener cupones asignados al usuario
  const { data: userCoupons } = await supabaseAdmin
    .from("coupons")
    .select(`
      *,
      partner:partners(*)
    `)
    .eq("user_id", session.user.id)
    .eq("is_assigned", true)
    .order("assigned_at", { ascending: false })

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-heading text-zinc-900 mb-2">Aliados</h1>
        <p className="text-zinc-600">
          Genera cupones de descuento exclusivos para usar en nuestras marcas aliadas
        </p>
      </div>

      <div className="space-y-8">
        {/* Mis Cupones */}
        {userCoupons && userCoupons.length > 0 && (
          <div>
            <h2 className="text-2xl font-heading text-zinc-900 mb-4">Mis Cupones</h2>
            <UserCouponsList coupons={userCoupons} />
          </div>
        )}

        {/* Marcas Aliadas */}
        <div>
          <h2 className="text-2xl font-heading text-zinc-900 mb-4">
            Marcas Aliadas
          </h2>
          
          {partners && partners.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.map((partner) => (
                <PartnerCard 
                  key={partner.id} 
                  partner={partner}
                  userId={session.user.id}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-zinc-200 text-center">
              <p className="text-zinc-600">
                No hay marcas aliadas disponibles en este momento.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
