import { connection, NextRequest, NextResponse } from "next/server";
import { syncTradingFoxCopyStrategyPositions } from "@/app/_lib/tradingfox-control-plane";
import { requireTradingFoxSession, tradingFoxErrorResponse } from "../../../_session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ strategyId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  await connection();

  try {
    const session = await requireTradingFoxSession(request);
    const { strategyId } = await context.params;
    return NextResponse.json(await syncTradingFoxCopyStrategyPositions(session, strategyId, await request.json()));
  } catch (error) {
    return tradingFoxErrorResponse(error);
  }
}
