import type { WorkspaceCopy } from "@/app/_lib/i18n";

const TRADINGFOX_FALLBACK_ERROR_MESSAGE = "TradingFox request failed.";

export function getTradingFoxErrorMessage(error: unknown, copy: WorkspaceCopy): string {
  const rawMessage = normalizeTradingFoxErrorMessage(error);

  if (isBinancePositionModeMismatchError(rawMessage)) {
    return copy.workspace.accountCenter.errors.binancePositionModeMismatch(rawMessage);
  }

  if (isBinanceDemoCredentialError(rawMessage)) {
    return copy.workspace.accountCenter.errors.binanceDemoCredentials(rawMessage);
  }

  return rawMessage;
}

function normalizeTradingFoxErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return normalizeErrorText(error.message);
  }

  if (typeof error === "string") {
    return normalizeErrorText(error);
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return normalizeErrorText(error.message);
  }

  return TRADINGFOX_FALLBACK_ERROR_MESSAGE;
}

function normalizeErrorText(message: string): string {
  const trimmedMessage = message.trim();
  return trimmedMessage || TRADINGFOX_FALLBACK_ERROR_MESSAGE;
}

function isBinancePositionModeMismatchError(message: string): boolean {
  const normalizedMessage = message.toLowerCase();

  return [
    "-4061",
    "position side",
    "positionside",
    "dual side position",
    "dualsideposition",
    "position mode",
    "hedge mode",
    "one-way mode",
    "one way mode",
    "双向持仓",
    "单向持仓",
    "持仓模式",
    "持仓方向",
  ].some((pattern) => normalizedMessage.includes(pattern));
}

function isBinanceDemoCredentialError(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  const hasBinanceCredentialCode = ["-1022", "-2014", "-2015"].some((pattern) =>
    normalizedMessage.includes(pattern),
  );

  if (hasBinanceCredentialCode) {
    return true;
  }

  const hasSignatureProblem =
    normalizedMessage.includes("signature") &&
    (normalizedMessage.includes("invalid") || normalizedMessage.includes("not valid"));

  if (hasSignatureProblem) {
    return true;
  }

  const hasCredentialProblem = [
    "api key",
    "api-key",
    "apikey",
    "api_key",
    "credential",
    "signature",
    "secret",
    "permission",
    "unauthorized",
    "authorised",
    "authorized",
    "forbidden",
  ].some((pattern) => normalizedMessage.includes(pattern));

  if (!hasCredentialProblem) {
    return false;
  }

  return [
    "binance",
    "demo",
    "fapi",
    "futures",
    "exchange account",
    "exchange connector",
    "api",
  ].some((pattern) => normalizedMessage.includes(pattern));
}
