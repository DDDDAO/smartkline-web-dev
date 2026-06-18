import { connection, NextRequest, NextResponse } from "next/server";
import {
  createOAuthState,
  createOAuthStateToken,
  createTelegramAuthorizationUrl,
  isSecureCookieOrigin,
  resolveTelegramAuthConfig,
  TELEGRAM_OAUTH_COOKIE_NAME,
  TELEGRAM_OAUTH_MAX_AGE_SECONDS,
} from "@/lib/auth/telegram-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  await connection();

  const config = resolveTelegramAuthConfig(request);
  const { codeChallenge, oauthState } = createOAuthState(request.nextUrl.searchParams.get("redirect"));
  const authorizationUrl = createTelegramAuthorizationUrl(config, oauthState, codeChallenge);
  const response = NextResponse.redirect(authorizationUrl);

  response.cookies.set({
    httpOnly: true,
    maxAge: TELEGRAM_OAUTH_MAX_AGE_SECONDS,
    name: TELEGRAM_OAUTH_COOKIE_NAME,
    path: "/api/auth/telegram",
    sameSite: "lax",
    secure: isSecureCookieOrigin(config),
    value: await createOAuthStateToken(oauthState),
  });

  return response;
}
