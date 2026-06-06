const DEMO_KOL_AVATAR_URLS = [
  "/kol-avatars/kol-avatar-1.jpg",
  "/kol-avatars/kol-avatar-2.jpg",
  "/kol-avatars/kol-avatar-3.jpg",
  "/kol-avatars/kol-avatar-4.jpg",
  "/kol-avatars/kol-avatar-5.jpg",
  "/kol-avatars/kol-avatar-6.jpg",
] as const;

const DEMO_KOL_AVATAR_BY_SOURCE_NAME: Readonly<Record<string, string>> = {
  "\u4e09\u9a6c\u54e5\u5408\u7ea6": DEMO_KOL_AVATAR_URLS[0],
  "\u5927\u9556\u5ba2\u5408\u7ea6\u7fa4": DEMO_KOL_AVATAR_URLS[1],
  "btc\u5cf0\u54e5": DEMO_KOL_AVATAR_URLS[2],
  "trader-soul": DEMO_KOL_AVATAR_URLS[3],
  "Alpha Lane": DEMO_KOL_AVATAR_URLS[1],
  "Range Lab": DEMO_KOL_AVATAR_URLS[2],
  "Delta Desk": DEMO_KOL_AVATAR_URLS[3],
  "Momentum KOL": DEMO_KOL_AVATAR_URLS[4],
  "TP Hunter": DEMO_KOL_AVATAR_URLS[5],
  "Scalp Room": DEMO_KOL_AVATAR_URLS[0],
  "Risk Watch": DEMO_KOL_AVATAR_URLS[1],
  "Breakout Bot": DEMO_KOL_AVATAR_URLS[2],
  "Market Flow": DEMO_KOL_AVATAR_URLS[3],
  "Incomplete Feed": DEMO_KOL_AVATAR_URLS[4],
  "Data Gap Feed": DEMO_KOL_AVATAR_URLS[5],
  "Crypto Whale Club": DEMO_KOL_AVATAR_URLS[0],
  "North Star Signals": DEMO_KOL_AVATAR_URLS[1],
};

export function getDemoKolAvatarUrl(name: string): string {
  return DEMO_KOL_AVATAR_BY_SOURCE_NAME[name] ?? DEMO_KOL_AVATAR_URLS[Math.abs(hashString(name)) % DEMO_KOL_AVATAR_URLS.length];
}

export function getResolvedKolAvatarUrl(name: string, url: string | null | undefined): string {
  if (!url || shouldUseLocalKolAvatar(url)) {
    return getDemoKolAvatarUrl(name);
  }

  return url;
}

/**
 * KOL avatars from the live API are currently Discord CDN hotlinks. They work
 * in some regions but are not a dependable product asset, so UI surfaces use
 * bundled avatars unless the caller already provides a same-origin asset.
 */
function shouldUseLocalKolAvatar(url: string): boolean {
  if (isGeneratedPlaceholderAvatar(url)) {
    return true;
  }

  if (url.startsWith("/")) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return true;
  }
}

function isGeneratedPlaceholderAvatar(url: string): boolean {
  return url.startsWith("data:image/svg+xml") || url.includes("ui-avatars.com");
}

function hashString(value: string): number {
  return Array.from(value).reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0);
}
