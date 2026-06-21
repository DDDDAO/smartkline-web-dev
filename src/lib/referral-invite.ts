const TELEGRAM_START_REF_PREFIX = "ref_";

export function createTelegramStartPayload(referralCode: string): string | null {
  const normalizedCode = normalizeReferralCode(referralCode);
  return normalizedCode ? `${TELEGRAM_START_REF_PREFIX}${normalizedCode}` : null;
}

export function createTelegramBotStartUrl(startPayload: string): string | null {
  const botUsername = resolveTelegramBotUsername();

  if (!botUsername) {
    return null;
  }

  return `https://t.me/${botUsername}?start=${encodeURIComponent(startPayload)}`;
}

export function normalizeReferralCode(rawCode: string | null | undefined): string | null {
  const normalizedCode = rawCode?.trim();

  if (!normalizedCode) {
    return null;
  }

  const normalizedPrefix = TELEGRAM_START_REF_PREFIX.toUpperCase();
  const code = normalizedCode.toUpperCase().startsWith(normalizedPrefix)
    ? normalizedCode.slice(TELEGRAM_START_REF_PREFIX.length)
    : normalizedCode;

  return code.trim().toUpperCase() || null;
}

function resolveTelegramBotUsername(): string | null {
  return process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/u, "") || null;
}
