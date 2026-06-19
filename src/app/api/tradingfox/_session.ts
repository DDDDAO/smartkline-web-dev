import { NextRequest, NextResponse } from "next/server";
import { BackendAuthProxyError, requireBackendAuthSession } from "@/lib/auth/backend-auth";
import type { TelegramAuthSession } from "@/lib/auth/telegram-auth";
import { TradingFoxApiError, TradingFoxConfigError } from "@/lib/tradingfox-control-plane";

export async function requireTradingFoxSession(request: NextRequest): Promise<TelegramAuthSession> {
  try {
    return await requireBackendAuthSession(request);
  } catch (error) {
    if (error instanceof BackendAuthProxyError && error.status === 401) {
      throw new TradingFoxApiError("Authentication required.", 401);
    }

    throw new TradingFoxApiError("Authentication service unavailable.", 502);
  }
}

export function tradingFoxErrorResponse(error: unknown) {
  if (error instanceof TradingFoxConfigError) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (error instanceof TradingFoxApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "TradingFox request failed." }, { status: 502 });
}
