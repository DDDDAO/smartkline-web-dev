import { connection, NextRequest, NextResponse } from "next/server";
import { getTradingFoxConnectorWhitelistIP } from "@/app/_lib/tradingfox-control-plane";
import { requireTradingFoxSession, tradingFoxErrorResponse } from "../../_session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  await connection();

  try {
    const session = await requireTradingFoxSession(request);
    return NextResponse.json(await getTradingFoxConnectorWhitelistIP(session, {
      exchangePlatform: request.nextUrl.searchParams.get("exchangePlatform"),
    }));
  } catch (error) {
    return tradingFoxErrorResponse(error);
  }
}
