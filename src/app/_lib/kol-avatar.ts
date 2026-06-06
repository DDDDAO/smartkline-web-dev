const DEMO_KOL_AVATAR_URLS = [
  "/kol-avatars/a1ac3b70a598173766e29e2617168a2b.jpg",
  "/kol-avatars/a7775ac510096908c3e1229a7e807cdc.jpg",
  "/kol-avatars/a91413d11656033e5bb8e1818644e8ce.jpg",
  "/kol-avatars/d3357a41cef2bae41db9da6ce81389f8.jpg",
  "/kol-avatars/e6dc6e7d79165ca42dcdcc5babf8dfae.jpg",
  "/kol-avatars/v2-6faa5be0e1d6e68024ba7a43e3e15548_b.jpg"
] as const;

const DEMO_KOL_AVATAR_BY_SOURCE_NAME: Readonly<Record<string, string>> = {
  "\u4e09\u9a6c\u54e5\u5408\u7ea6": DEMO_KOL_AVATAR_URLS[0],
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
  if (!url || isGeneratedPlaceholderAvatar(url)) {
    return getDemoKolAvatarUrl(name);
  }

  return url;
}

function isGeneratedPlaceholderAvatar(url: string): boolean {
  return url.startsWith("data:image/svg+xml") || url.includes("ui-avatars.com");
}

function hashString(value: string): number {
  return Array.from(value).reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0);
}
