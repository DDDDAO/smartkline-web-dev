import { connection, NextRequest, NextResponse } from "next/server";
import { validateTradingFoxStrategyConfig } from "@/lib/tradingfox-control-plane";
import { requireTradingFoxSession, tradingFoxErrorResponse } from "../../../_session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ definitionId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  await connection();

  try {
    await requireTradingFoxSession(request);
    const { definitionId } = await context.params;
    const payload = await request.json() as { config?: unknown; configSchemaVersion?: number };
    if (!payload.config || typeof payload.config !== "object" || Array.isArray(payload.config)) {
      return NextResponse.json({ error: "config is required." }, { status: 400 });
    }
    return NextResponse.json(await validateTradingFoxStrategyConfig({
      config: payload.config as Record<string, unknown>,
      configSchemaVersion: payload.configSchemaVersion,
      strategyDefinitionId: definitionId,
    }));
  } catch (error) {
    return tradingFoxErrorResponse(error);
  }
}
