import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import {
  awardPoints,
  spendPoints,
  getPointsBalance,
  getPointsHistory,
  POINT_ACTIONS,
  type PointActionType,
} from "@/lib/points"

// GET /api/points?history=true&limit=20&offset=0
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const includeHistory = searchParams.get("history") === "true"
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100)
  const offset = Number(searchParams.get("offset") ?? 0)

  const balance = await getPointsBalance(session.user.id)

  if (!includeHistory) {
    return NextResponse.json({ balance })
  }

  const history = await getPointsHistory(session.user.id, { limit, offset })
  return NextResponse.json({ balance, history })
}

const awardSchema = z.object({
  action: z.enum(Object.values(POINT_ACTIONS) as [PointActionType, ...PointActionType[]]),
  description: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
})

const spendSchema = z.object({
  amount: z.number().int().positive(),
  description: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
})

// POST /api/points  { type: "award" | "spend", ... }
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await request.json()
  const { type, ...rest } = body

  if (type === "award") {
    const parsed = awardSchema.safeParse(rest)
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const result = await awardPoints({ userId: session.user.id, actionType: parsed.data.action, ...parsed.data })
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    const balance = await getPointsBalance(session.user.id)
    return NextResponse.json({ success: true, transactionId: result.transactionId, balance })
  }

  if (type === "spend") {
    const parsed = spendSchema.safeParse(rest)
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const result = await spendPoints({
      userId: session.user.id,
      actionType: "redeem_reward",
      ...parsed.data,
    })
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    const balance = await getPointsBalance(session.user.id)
    return NextResponse.json({ success: true, transactionId: result.transactionId, balance })
  }

  return NextResponse.json({ error: "Tipo de operación inválido. Usa 'award' o 'spend'" }, { status: 400 })
}
