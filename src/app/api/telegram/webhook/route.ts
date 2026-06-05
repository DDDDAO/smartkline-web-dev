import { connection, NextRequest, NextResponse } from "next/server";
import {
  handleTelegramCommunityWebhook,
  TelegramCommunityConfigError,
  verifyTelegramWebhookSecret,
} from "@/app/_lib/auth/telegram-community";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  await connection();

  if (!verifyTelegramWebhookSecret(request.headers.get("X-Telegram-Bot-Api-Secret-Token"))) {
    return NextResponse.json({ error: "Invalid Telegram webhook secret." }, { status: 401 });
  }

  try {
    await handleTelegramCommunityWebhook(await request.json());
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TelegramCommunityConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json({ error: "Unable to process Telegram webhook." }, { status: 502 });
  }
}
