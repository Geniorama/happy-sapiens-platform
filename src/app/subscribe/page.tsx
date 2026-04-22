import { Suspense } from "react"
import { SubscriptionForm } from "@/components/subscription/subscription-form"
import { getActiveSubscriptionPlans } from "@/lib/mercadopago"

export default async function SubscribePage() {
  const plans = await getActiveSubscriptionPlans()

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <Suspense fallback={
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-zinc-200 rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-96 bg-zinc-200 rounded"></div>
          </div>
        </div>
      }>
        <SubscriptionForm plans={plans} />
      </Suspense>
    </div>
  )
}
