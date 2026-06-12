import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken, type TelegramAuthSession } from "@/app/_lib/auth/telegram-auth";
import { TradingFoxApiError, TradingFoxConfigError } from "@/app/_lib/tradingfox-control-plane";

export async function requireTradingFoxSession(request: NextRequest): Promise<TelegramAuthSession> {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    throw new TradingFoxApiError("Authentication required.", 401);
  }

  try {
    return await verifySessionToken(sessionToken);
  } catch {
    throw new TradingFoxApiError("Authentication required.", 401);
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
