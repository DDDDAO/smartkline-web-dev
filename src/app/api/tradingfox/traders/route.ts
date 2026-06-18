import { connection, NextRequest, NextResponse } from "next/server";
import { createTradingFoxStrategy } from "@/lib/tradingfox-control-plane";
import { requireTradingFoxSession, tradingFoxErrorResponse } from "../_session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  await connection();

  try {
    const session = await requireTradingFoxSession(request);
    return NextResponse.json(await createTradingFoxStrategy(session, await request.json()));
  } catch (error) {
    return tradingFoxErrorResponse(error);
  }
}
