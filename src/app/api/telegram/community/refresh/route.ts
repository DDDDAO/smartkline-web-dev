import { connection, NextRequest, NextResponse } from "next/server";
import { BackendAuthProxyError, requireBackendAuthSession } from "@/lib/auth/backend-auth";
import { refreshTelegramCommunityMembership, TelegramCommunityConfigError } from "@/lib/auth/telegram-community";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  await connection();

  try {
    const session = await requireBackendAuthSession(request);
    return NextResponse.json(await refreshTelegramCommunityMembership(session));
  } catch (error) {
    if (error instanceof BackendAuthProxyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof TelegramCommunityConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json({ error: "Unable to refresh Telegram membership." }, { status: 502 });
  }
}
