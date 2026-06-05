import { connection, NextRequest, NextResponse } from "next/server";
import {
  appendAuthResultToRedirectPath,
  createSessionToken,
  exchangeTelegramCodeForToken,
  isSecureCookieOrigin,
  resolveTelegramAuthConfig,
  safeEqual,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  TELEGRAM_OAUTH_COOKIE_NAME,
  verifyOAuthStateToken,
  verifyTelegramIdToken,
} from "@/app/_lib/auth/telegram-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  await connection();

  const config = resolveTelegramAuthConfig(request);
  const code = request.nextUrl.searchParams.get("code");
  const callbackState = request.nextUrl.searchParams.get("state");
  const oauthStateCookie = request.cookies.get(TELEGRAM_OAUTH_COOKIE_NAME)?.value;

  try {
    if (request.nextUrl.searchParams.has("error")) {
      throw new Error("Telegram returned an authorization error.");
    }

    if (!code || !callbackState || !oauthStateCookie) {
      throw new Error("Telegram authorization callback is missing required state.");
    }

    const oauthState = await verifyOAuthStateToken(oauthStateCookie);

    if (!safeEqual(callbackState, oauthState.state)) {
      throw new Error("Telegram authorization state mismatch.");
    }

    const idToken = await exchangeTelegramCodeForToken(code, config, oauthState.codeVerifier);
    const user = await verifyTelegramIdToken(idToken, config, oauthState.nonce);
    const redirectPath = appendAuthResultToRedirectPath(oauthState.redirectPath, "success");
    const response = NextResponse.redirect(new URL(redirectPath, config.appOrigin));

    response.cookies.set({
      httpOnly: true,
      maxAge: SESSION_MAX_AGE_SECONDS,
      name: SESSION_COOKIE_NAME,
      path: "/",
      sameSite: "lax",
      secure: isSecureCookieOrigin(config),
      value: await createSessionToken({ provider: "telegram", user }),
    });
    response.cookies.delete({ name: TELEGRAM_OAUTH_COOKIE_NAME, path: "/api/auth/telegram" });

    return response;
  } catch {
    const response = NextResponse.redirect(new URL(appendAuthResultToRedirectPath("/", "error"), config.appOrigin));
    response.cookies.delete({ name: TELEGRAM_OAUTH_COOKIE_NAME, path: "/api/auth/telegram" });
    response.cookies.delete({ name: SESSION_COOKIE_NAME, path: "/" });
    return response;
  }
}
