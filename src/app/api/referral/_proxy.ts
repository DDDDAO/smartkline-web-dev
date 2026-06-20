import { NextRequest, NextResponse } from "next/server";
import {
  createBackendAuthUrl,
  createBackendRequestHeaders,
} from "@/lib/auth/backend-auth";
import type { ReferralDashboardResponse } from "@/lib/referral";

export async function proxyBackendReferralGet(
  request: NextRequest,
  backendPath: string,
  options: { enrichDashboard?: boolean } = {},
): Promise<NextResponse> {
  const backendUrl = createBackendAuthUrl(backendPath);
  backendUrl.search = request.nextUrl.search;

  const backendResponse = await fetch(backendUrl, {
    cache: "no-store",
    headers: createBackendRequestHeaders(request),
  });
  const payload = await readJsonPayload(backendResponse);

  if (!backendResponse.ok) {
    return NextResponse.json(payload, { status: backendResponse.status });
  }

  return NextResponse.json(
    options.enrichDashboard
      ? enrichReferralDashboardPayload(payload as ReferralDashboardResponse)
      : payload,
  );
}

function enrichReferralDashboardPayload(
  payload: ReferralDashboardResponse,
): ReferralDashboardResponse {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/u, "");

  return {
    ...payload,
    invite: {
      ...payload.invite,
      telegramBotStartUrl: botUsername
        ? `https://t.me/${botUsername}?start=${encodeURIComponent(payload.invite.telegramStartPayload)}`
        : null,
    },
  };
}

async function readJsonPayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return { error: "Backend referral request failed." };
  }
}
