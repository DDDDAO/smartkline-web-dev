import { createRemoteJWKSet, jwtVerify, SignJWT, type JWTPayload } from "jose";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "sk_session";
export const TELEGRAM_OAUTH_COOKIE_NAME = "sk_tg_oauth";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const TELEGRAM_OAUTH_MAX_AGE_SECONDS = 60 * 10;

const TELEGRAM_ISSUER = "https://oauth.telegram.org";
const TELEGRAM_AUTHORIZATION_ENDPOINT = `${TELEGRAM_ISSUER}/auth`;
const TELEGRAM_TOKEN_ENDPOINT = `${TELEGRAM_ISSUER}/token`;
const TELEGRAM_JWKS = createRemoteJWKSet(new URL(`${TELEGRAM_ISSUER}/.well-known/jwks.json`));
const DEFAULT_TELEGRAM_SCOPES = "openid profile telegram:bot_access";
const SESSION_SECRET_MIN_LENGTH = 32;

export type TelegramAuthConfig = {
  appOrigin: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
};

export type TelegramOAuthState = {
  codeVerifier: string;
  nonce: string;
  redirectPath: string;
  state: string;
};

export type TelegramSessionUser = {
  avatarUrl?: string;
  id: string;
  name?: string;
  telegramId?: string;
  username?: string;
};

export type TelegramAuthSession = {
  provider: "telegram";
  user: TelegramSessionUser;
};

export type TelegramAuthMeResponse = {
  botBinding: "unbound" | "bound";
  communityBinding: "unverified" | "joined" | "left";
  isLoggedIn: boolean;
  notificationPermission: "none" | "granted";
  sourceBindingCount: number;
  telegramUser: TelegramSessionUser | null;
};

export class TelegramAuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramAuthConfigError";
  }
}

export class TelegramAuthFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramAuthFlowError";
  }
}

export function resolveTelegramAuthConfig(request: NextRequest): TelegramAuthConfig {
  const clientId = readRequiredEnv("TELEGRAM_CLIENT_ID");
  const clientSecret = readRequiredEnv("TELEGRAM_CLIENT_SECRET");
  const appOrigin = normalizeOrigin(process.env.APP_ORIGIN || request.nextUrl.origin);
  const redirectUri = `${appOrigin}/api/auth/telegram/callback`;
  const scopes = process.env.TELEGRAM_OIDC_SCOPES?.trim() || DEFAULT_TELEGRAM_SCOPES;

  return {
    appOrigin,
    clientId,
    clientSecret,
    redirectUri,
    scopes,
  };
}

export function isSecureCookieOrigin(config: Pick<TelegramAuthConfig, "appOrigin">): boolean {
  return config.appOrigin.startsWith("https://");
}

export function createTelegramAuthorizationUrl(config: TelegramAuthConfig, oauthState: TelegramOAuthState, codeChallenge: string): URL {
  const authorizationUrl = new URL(TELEGRAM_AUTHORIZATION_ENDPOINT);

  authorizationUrl.searchParams.set("client_id", config.clientId);
  authorizationUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", config.scopes);
  authorizationUrl.searchParams.set("state", oauthState.state);
  authorizationUrl.searchParams.set("nonce", oauthState.nonce);
  authorizationUrl.searchParams.set("code_challenge", codeChallenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");

  return authorizationUrl;
}

export function createOAuthState(redirectPath: string | null | undefined): { codeChallenge: string; oauthState: TelegramOAuthState } {
  const codeVerifier = createRandomBase64UrlToken(32);
  const codeChallenge = createPkceChallenge(codeVerifier);

  return {
    codeChallenge,
    oauthState: {
      codeVerifier,
      nonce: createRandomBase64UrlToken(24),
      redirectPath: parseSafeRedirectPath(redirectPath),
      state: createRandomBase64UrlToken(24),
    },
  };
}

export async function createOAuthStateToken(oauthState: TelegramOAuthState): Promise<string> {
  return new SignJWT({
    codeVerifier: oauthState.codeVerifier,
    kind: "telegram-oauth-state",
    nonce: oauthState.nonce,
    redirectPath: oauthState.redirectPath,
    state: oauthState.state,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TELEGRAM_OAUTH_MAX_AGE_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function verifyOAuthStateToken(token: string): Promise<TelegramOAuthState> {
  const { payload } = await jwtVerify(token, getSessionSecret(), {
    algorithms: ["HS256"],
  });

  if (payload.kind !== "telegram-oauth-state") {
    throw new TelegramAuthFlowError("Invalid Telegram OAuth state cookie.");
  }

  return parseOAuthStatePayload(payload);
}

export async function exchangeTelegramCodeForToken(code: string, config: TelegramAuthConfig, codeVerifier: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
  });
  const authorization = Buffer.from(`${config.clientId}:${config.clientSecret}`, "utf8").toString("base64");

  const response = await fetch(TELEGRAM_TOKEN_ENDPOINT, {
    body,
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new TelegramAuthFlowError(`Telegram token exchange failed with status ${response.status}.`);
  }

  const tokenPayload = await response.json() as unknown;

  if (!isRecord(tokenPayload) || typeof tokenPayload.id_token !== "string") {
    throw new TelegramAuthFlowError("Telegram token response did not include an ID token.");
  }

  return tokenPayload.id_token;
}

export async function verifyTelegramIdToken(idToken: string, config: TelegramAuthConfig, expectedNonce: string): Promise<TelegramSessionUser> {
  const { payload } = await jwtVerify(idToken, TELEGRAM_JWKS, {
    audience: config.clientId,
    issuer: TELEGRAM_ISSUER,
  });

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new TelegramAuthFlowError("Telegram ID token did not include a subject.");
  }

  // Telegram's OIDC docs advertise nonce support, but the discovery document does not list nonce as a guaranteed claim.
  // State + PKCE are the hard replay/CSRF boundary for this server-side code flow; verify nonce when Telegram returns it.
  if (typeof payload.nonce === "string" && !safeEqual(payload.nonce, expectedNonce)) {
    throw new TelegramAuthFlowError("Telegram ID token nonce mismatch.");
  }

  return {
    avatarUrl: readOptionalStringClaim(payload.picture),
    id: `telegram:${payload.sub}`,
    name: readOptionalStringClaim(payload.name),
    telegramId: readOptionalTelegramId(payload),
    username: readOptionalStringClaim(payload.preferred_username),
  };
}

export async function createSessionToken(session: TelegramAuthSession): Promise<string> {
  return new SignJWT({
    provider: session.provider,
    user: session.user,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string): Promise<TelegramAuthSession> {
  const { payload } = await jwtVerify(token, getSessionSecret(), {
    algorithms: ["HS256"],
  });

  return parseSessionPayload(payload);
}

export function createLoggedOutAuthMeResponse(): TelegramAuthMeResponse {
  return {
    botBinding: "unbound",
    communityBinding: "unverified",
    isLoggedIn: false,
    notificationPermission: "none",
    sourceBindingCount: 0,
    telegramUser: null,
  };
}

export function createLoggedInAuthMeResponse(session: TelegramAuthSession): TelegramAuthMeResponse {
  return {
    botBinding: "unbound",
    communityBinding: "unverified",
    isLoggedIn: true,
    notificationPermission: "none",
    sourceBindingCount: 0,
    telegramUser: session.user,
  };
}

export function parseSafeRedirectPath(rawRedirectPath: string | null | undefined): string {
  if (!rawRedirectPath || !rawRedirectPath.startsWith("/") || rawRedirectPath.startsWith("//")) {
    return "/";
  }

  try {
    const redirectUrl = new URL(rawRedirectPath, "https://smartkline.local");
    return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
  } catch {
    return "/";
  }
}

export function appendAuthResultToRedirectPath(redirectPath: string, authResult: "success" | "error"): string {
  const redirectUrl = new URL(parseSafeRedirectPath(redirectPath), "https://smartkline.local");
  redirectUrl.searchParams.set("telegram_auth", authResult);
  return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
}

export function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new TelegramAuthConfigError(`${name} is required for Telegram authentication.`);
  }

  return value;
}

function getSessionSecret(): Uint8Array {
  const secret = readRequiredEnv("SESSION_SECRET");

  if (secret.length < SESSION_SECRET_MIN_LENGTH) {
    throw new TelegramAuthConfigError(`SESSION_SECRET must be at least ${SESSION_SECRET_MIN_LENGTH} characters.`);
  }

  return new TextEncoder().encode(secret);
}

function normalizeOrigin(origin: string): string {
  const parsedOrigin = new URL(origin);
  return parsedOrigin.origin;
}

function createRandomBase64UrlToken(byteLength: number): string {
  return randomBytes(byteLength).toString("base64url");
}

function createPkceChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

function parseOAuthStatePayload(payload: JWTPayload): TelegramOAuthState {
  if (
    typeof payload.codeVerifier !== "string"
    || typeof payload.nonce !== "string"
    || typeof payload.redirectPath !== "string"
    || typeof payload.state !== "string"
  ) {
    throw new TelegramAuthFlowError("Invalid Telegram OAuth state payload.");
  }

  return {
    codeVerifier: payload.codeVerifier,
    nonce: payload.nonce,
    redirectPath: parseSafeRedirectPath(payload.redirectPath),
    state: payload.state,
  };
}

function parseSessionPayload(payload: JWTPayload): TelegramAuthSession {
  if (payload.provider !== "telegram" || !isRecord(payload.user)) {
    throw new TelegramAuthFlowError("Invalid SmartKLine session payload.");
  }

  const user = payload.user;

  if (typeof user.id !== "string" || user.id.length === 0) {
    throw new TelegramAuthFlowError("Invalid SmartKLine session user.");
  }

  return {
    provider: "telegram",
    user: {
      avatarUrl: readOptionalStringClaim(user.avatarUrl),
      id: user.id,
      name: readOptionalStringClaim(user.name),
      telegramId: readOptionalStringClaim(user.telegramId),
      username: readOptionalStringClaim(user.username),
    },
  };
}

function readOptionalStringClaim(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readOptionalTelegramId(payload: JWTPayload): string | undefined {
  if (typeof payload.id === "number") {
    return String(payload.id);
  }

  if (typeof payload.id === "string" && payload.id.length > 0) {
    return payload.id;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
