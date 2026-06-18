import { connection, NextRequest, NextResponse } from "next/server";
import { parseSafeRedirectPath } from "@/lib/auth/telegram-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  await connection();

  const redirectPath = parseSafeRedirectPath(request.nextUrl.searchParams.get("redirect"));
  const loginUrl = new URL("/api/auth/telegram/start", request.nextUrl.origin);
  loginUrl.searchParams.set("redirect", redirectPath);

  return NextResponse.redirect(loginUrl);
}
