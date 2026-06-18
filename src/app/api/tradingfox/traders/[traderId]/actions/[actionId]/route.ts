import { connection, NextRequest, NextResponse } from "next/server";
import { executeTradingFoxTraderAction } from "@/lib/tradingfox-control-plane";
import { requireTradingFoxSession, tradingFoxErrorResponse } from "../../../../_session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ actionId: string; traderId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  await connection();

  try {
    const session = await requireTradingFoxSession(request);
    const { actionId, traderId } = await context.params;
    return NextResponse.json(await executeTradingFoxTraderAction(
      session,
      traderId,
      actionId,
      await request.json().catch(() => ({})),
    ));
  } catch (error) {
    return tradingFoxErrorResponse(error);
  }
}
