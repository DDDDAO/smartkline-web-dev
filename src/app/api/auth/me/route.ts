import { connection, NextRequest, NextResponse } from "next/server";
import {
  createLoggedInAuthMeResponse,
  createLoggedOutAuthMeResponse,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/app/_lib/auth/telegram-auth";
import { getTelegramCommunityBindingForSession } from "@/app/_lib/auth/telegram-community";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  await connection();

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json(createLoggedOutAuthMeResponse());
  }

  try {
    const session = await verifySessionToken(sessionToken);
    const communityBinding = await getTelegramCommunityBindingForSession(session).catch(() => "unverified" as const);
    return NextResponse.json(createLoggedInAuthMeResponse(session, communityBinding));
  } catch {
    const response = NextResponse.json(createLoggedOutAuthMeResponse());
    response.cookies.delete({ name: SESSION_COOKIE_NAME, path: "/" });
    return response;
  }
}
