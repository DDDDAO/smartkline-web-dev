import { connection, NextRequest, NextResponse } from "next/server";
import { getTradingFoxCopyStrategyDetail, updateTradingFoxCopyStrategyStatus } from "@/app/_lib/tradingfox-control-plane";
import { requireTradingFoxSession, tradingFoxErrorResponse } from "../../_session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ strategyId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  await connection();

  try {
    const session = await requireTradingFoxSession(request);
    const { strategyId } = await context.params;
    return NextResponse.json(await getTradingFoxCopyStrategyDetail(session, strategyId));
  } catch (error) {
    return tradingFoxErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  await connection();

  try {
    const session = await requireTradingFoxSession(request);
    const { strategyId } = await context.params;
    const payload = await request.json() as { status?: "running" | "paused" | "stopped" };
    if (payload.status !== "running" && payload.status !== "paused" && payload.status !== "stopped") {
      return NextResponse.json({ error: "status must be running, paused, or stopped." }, { status: 400 });
    }
    return NextResponse.json(await updateTradingFoxCopyStrategyStatus(session, strategyId, payload.status));
  } catch (error) {
    return tradingFoxErrorResponse(error);
  }
}
