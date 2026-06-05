import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, TELEGRAM_OAUTH_COOKIE_NAME } from "@/app/_lib/auth/telegram-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete({ name: SESSION_COOKIE_NAME, path: "/" });
  response.cookies.delete({ name: TELEGRAM_OAUTH_COOKIE_NAME, path: "/api/auth/telegram" });
  return response;
}
