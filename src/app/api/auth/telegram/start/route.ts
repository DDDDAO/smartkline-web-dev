import { connection, NextRequest, NextResponse } from "next/server";
import { createBackendAuthUrl } from "@/lib/auth/backend-auth";
import { parseSafeRedirectPath } from "@/lib/auth/telegram-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  await connection();

  const authorizationUrl = createBackendAuthUrl("/auth/telegram/start");
  const referralCode = request.nextUrl.searchParams.get("ref");

  authorizationUrl.searchParams.set("redirect", parseSafeRedirectPath(request.nextUrl.searchParams.get("redirect")));
  if (referralCode) {
    authorizationUrl.searchParams.set("ref", referralCode);
  }

  return NextResponse.redirect(authorizationUrl);
}
