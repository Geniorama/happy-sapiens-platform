import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { getActiveSubscriptionPlans } from "@/lib/mercadopago"
import { AddSubscriptionClient } from "./add-subscription-client"

export default async function AddSubscriptionPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const [plans, userRow, activeSubs] = await Promise.all([
    getActiveSubscriptionPlans(),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { billingAddress: true, shippingAddress: true },
    }),
    prisma.subscription.findMany({
      where: { userId: session.user.id, status: { in: ["active", "past_due", "paused"] } },
      select: { product: true },
    }),
  ])

  // Productos que el usuario ya tiene vigentes (una suscripción por producto).
  const ownedProducts = activeSubs
    .map((s) => s.product)
    .filter((p): p is string => !!p)

  // El "agregar producto" reutiliza los datos de facturación/envío guardados. Si el
  // usuario nunca completó un checkout (sin dirección en su ficha), lo mandamos al
  // checkout completo para capturarlos.
  const hasSavedAddress = !!(userRow?.billingAddress || userRow?.shippingAddress)

  return (
    <AddSubscriptionClient
      plans={plans.map((p) => ({ id: p.id, title: p.title, price: p.price, description: p.description }))}
      ownedProducts={ownedProducts}
      hasSavedAddress={hasSavedAddress}
    />
  )
}
