import { connection, NextRequest, NextResponse } from "next/server";
import {
  deleteTradingFoxCopyStrategy,
  getTradingFoxCopyStrategyDetail,
  updateTradingFoxCopyStrategySettings,
  updateTradingFoxCopyStrategyStatus,
  type UpdateCopyStrategySettingsInput,
} from "@/app/_lib/tradingfox-control-plane";
import { requireTradingFoxSession, tradingFoxErrorResponse } from "../../_session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ strategyId: string }>;
};

type CopyStrategyPatchPayload = UpdateCopyStrategySettingsInput & {
  status?: "running" | "paused" | "stopped";
};

export async function GET(request: NextRequest, context: RouteContext) {
  await connection();

  try {
    const session = await requireTradingFoxSession(request);
    const { strategyId } = await context.params;
    return NextResponse.json(await getTradingFoxCopyStrategyDetail(session, strategyId, {
      orderLimit: request.nextUrl.searchParams.get("orderLimit"),
      orderOffset: request.nextUrl.searchParams.get("orderOffset"),
    }));
  } catch (error) {
    return tradingFoxErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  await connection();

  try {
    const session = await requireTradingFoxSession(request);
    const { strategyId } = await context.params;
    const payload = await request.json() as CopyStrategyPatchPayload;
    if (payload.status !== undefined) {
      if (payload.status !== "running" && payload.status !== "paused" && payload.status !== "stopped") {
        return NextResponse.json({ error: "status must be running, paused, or stopped." }, { status: 400 });
      }
      return NextResponse.json(await updateTradingFoxCopyStrategyStatus(session, strategyId, payload.status));
    }
    return NextResponse.json(await updateTradingFoxCopyStrategySettings(session, strategyId, payload));
  } catch (error) {
    return tradingFoxErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  await connection();

  try {
    const session = await requireTradingFoxSession(request);
    const { strategyId } = await context.params;
    return NextResponse.json(await deleteTradingFoxCopyStrategy(session, strategyId));
  } catch (error) {
    return tradingFoxErrorResponse(error);
  }
}
