import { NextRequest, NextResponse } from "next/server";
import { appendBackendSetCookieHeaders, fetchBackendLogout } from "@/lib/auth/backend-auth";
import { SESSION_COOKIE_NAME, TELEGRAM_OAUTH_COOKIE_NAME } from "@/lib/auth/telegram-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const backendResponse = await fetchBackendLogout(request).catch(() => null);
  const response = NextResponse.json(
    { ok: backendResponse?.ok ?? true },
    { status: backendResponse && !backendResponse.ok ? backendResponse.status : 200 },
  );

  if (backendResponse) {
    appendBackendSetCookieHeaders(backendResponse, response.headers);
  }

  response.cookies.delete({ name: SESSION_COOKIE_NAME, path: "/" });
  response.cookies.delete({ name: TELEGRAM_OAUTH_COOKIE_NAME, path: "/api/auth/telegram" });
  return response;
}
