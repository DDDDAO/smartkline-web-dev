import { connection, NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/app/_lib/auth/telegram-auth";
import { createTelegramCommunityInvite, TelegramCommunityConfigError } from "@/app/_lib/auth/telegram-community";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  await connection();

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const session = await verifySessionToken(sessionToken);
    return NextResponse.json(await createTelegramCommunityInvite(session));
  } catch (error) {
    if (error instanceof TelegramCommunityConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json({ error: "Unable to create Telegram invite link." }, { status: 502 });
  }
}
