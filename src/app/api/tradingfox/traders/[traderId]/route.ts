import { connection, NextRequest, NextResponse } from "next/server";
import { updateTradingFoxTraderSettings } from "@/lib/tradingfox-control-plane";
import { requireTradingFoxSession, tradingFoxErrorResponse } from "../../_session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ traderId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  await connection();

  try {
    const session = await requireTradingFoxSession(request);
    const { traderId } = await context.params;
    return NextResponse.json(await updateTradingFoxTraderSettings(
      session,
      traderId,
      await request.json(),
    ));
  } catch (error) {
    return tradingFoxErrorResponse(error);
  }
}
