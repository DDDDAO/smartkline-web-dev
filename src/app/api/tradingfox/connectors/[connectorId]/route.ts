import { connection, NextRequest, NextResponse } from "next/server";
import { deleteTradingFoxConnector } from "@/app/_lib/tradingfox-control-plane";
import { requireTradingFoxSession, tradingFoxErrorResponse } from "../../_session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ connectorId: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  await connection();

  try {
    const session = await requireTradingFoxSession(request);
    const { connectorId } = await context.params;
    return NextResponse.json(await deleteTradingFoxConnector(session, connectorId));
  } catch (error) {
    return tradingFoxErrorResponse(error);
  }
}
