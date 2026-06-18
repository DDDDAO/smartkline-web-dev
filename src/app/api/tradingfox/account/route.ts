import { connection, NextRequest, NextResponse } from "next/server";
import { getTradingFoxAccount } from "@/lib/tradingfox-control-plane";
import { requireTradingFoxSession, tradingFoxErrorResponse } from "../_session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  await connection();

  try {
    const session = await requireTradingFoxSession(request);
    return NextResponse.json(await getTradingFoxAccount(session, {
      includeConnectorAccountEquity: false,
      includeStrategyRuntimeMetrics: false,
    }));
  } catch (error) {
    return tradingFoxErrorResponse(error);
  }
}
