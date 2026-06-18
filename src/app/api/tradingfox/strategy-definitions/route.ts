import { connection, NextRequest, NextResponse } from "next/server";
import { listTradingFoxStrategyDefinitions } from "@/lib/tradingfox-control-plane";
import { requireTradingFoxSession, tradingFoxErrorResponse } from "../_session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  await connection();

  try {
    await requireTradingFoxSession(request);
    return NextResponse.json({ items: await listTradingFoxStrategyDefinitions() });
  } catch (error) {
    return tradingFoxErrorResponse(error);
  }
}
