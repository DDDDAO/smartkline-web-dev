import { connection, NextRequest, NextResponse } from "next/server";
import { createBackendAuthUrl } from "@/lib/auth/backend-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  await connection();

  const callbackUrl = createBackendAuthUrl("/auth/telegram/callback");
  callbackUrl.search = request.nextUrl.search;

  return NextResponse.redirect(callbackUrl);
}
