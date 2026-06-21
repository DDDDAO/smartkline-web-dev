import { connection, NextRequest, NextResponse } from "next/server";
import { parseSafeRedirectPath } from "@/lib/auth/telegram-auth";
import { createTelegramBotStartUrl, createTelegramStartPayload, normalizeReferralCode } from "@/lib/referral-invite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  await connection();

  const referralCode = normalizeReferralCode(
    request.nextUrl.searchParams.get("ref") ?? request.nextUrl.searchParams.get("code"),
  );
  const redirectPath = parseSafeRedirectPath(request.nextUrl.searchParams.get("redirect"));

  if (!referralCode) {
    return NextResponse.redirect(new URL(redirectPath, request.nextUrl.origin));
  }

  const startPayload = createTelegramStartPayload(referralCode);
  const telegramBotStartUrl = startPayload ? createTelegramBotStartUrl(startPayload) : null;

  if (telegramBotStartUrl) {
    return NextResponse.redirect(telegramBotStartUrl);
  }

  const fallbackLoginUrl = new URL("/api/auth/telegram/start", request.nextUrl.origin);
  fallbackLoginUrl.searchParams.set("ref", referralCode);
  fallbackLoginUrl.searchParams.set("redirect", redirectPath);

  return NextResponse.redirect(fallbackLoginUrl);
}
