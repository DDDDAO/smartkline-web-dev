import { connection, NextRequest, NextResponse } from "next/server";
import { getTradingFoxStrategyDefinition } from "@/app/_lib/tradingfox-control-plane";
import { requireTradingFoxSession, tradingFoxErrorResponse } from "../../_session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ definitionId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  await connection();

  try {
    await requireTradingFoxSession(request);
    const { definitionId } = await context.params;
    return NextResponse.json(await getTradingFoxStrategyDefinition(definitionId));
  } catch (error) {
    return tradingFoxErrorResponse(error);
  }
}
