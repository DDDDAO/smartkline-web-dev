const BINANCE_ASSET_LIST_URL = "https://www.binance.com/bapi/asset/v2/public/asset/asset/get-all-asset";
const BINANCE_WEB_BASE_URL = "https://www.binance.com";
const ASSET_METADATA_TTL_MS = 60 * 60 * 1_000;
const ICON_RESPONSE_CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";
const FALLBACK_RESPONSE_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600";
const ASSET_CODE_PATTERN = /^[A-Z0-9]{1,30}$/u;
const ICON_HOST_ALLOWLIST = new Set([
  "bin.bnbstatic.com",
  "public.bnbstatic.com",
  "static.binance.com",
  "www.binance.com",
]);

type BinanceAssetListResponse = {
  data?: BinanceAssetMetadata[];
  success?: boolean;
};

type BinanceAssetMetadata = {
  assetCode?: unknown;
  fullLogoUrl?: unknown;
  logoUrl?: unknown;
};

type AssetLogoCache = {
  expiresAtMs: number;
  logosByAssetCode: Map<string, string>;
};

let assetLogoCache: AssetLogoCache | null = null;
let assetLogoRequest: Promise<Map<string, string>> | null = null;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ asset: string }> },
): Promise<Response> {
  const { asset } = await params;
  const assetCode = normalizeAssetCode(asset);

  if (!assetCode) {
    return createFallbackIconResponse("?");
  }

  try {
    const logoUrl = await resolveAssetLogoUrl(assetCode);
    if (!logoUrl) {
      return createFallbackIconResponse(assetCode);
    }

    const iconResponse = await fetch(logoUrl, {
      cache: "force-cache",
      headers: {
        accept: "image/avif,image/webp,image/png,image/svg+xml,image/*,*/*;q=0.8",
        "user-agent": "SmartKline asset icon proxy",
      },
    });
    const contentType = iconResponse.headers.get("content-type") ?? "";

    if (!iconResponse.ok || !contentType.toLowerCase().startsWith("image/")) {
      return createFallbackIconResponse(assetCode);
    }

    const imageBody = await iconResponse.arrayBuffer();

    return new Response(imageBody, {
      headers: {
        "cache-control": ICON_RESPONSE_CACHE_CONTROL,
        "content-type": contentType,
      },
    });
  } catch {
    return createFallbackIconResponse(assetCode);
  }
}

async function resolveAssetLogoUrl(assetCode: string): Promise<string | null> {
  const logosByAssetCode = await getAssetLogoMap();

  for (const candidate of createAssetCodeCandidates(assetCode)) {
    const logoUrl = logosByAssetCode.get(candidate);
    if (logoUrl) {
      return logoUrl;
    }
  }

  return null;
}

async function getAssetLogoMap(): Promise<Map<string, string>> {
  const now = Date.now();
  if (assetLogoCache && assetLogoCache.expiresAtMs > now) {
    return assetLogoCache.logosByAssetCode;
  }

  if (!assetLogoRequest) {
    assetLogoRequest = fetchAssetLogoMap();
  }

  try {
    const logosByAssetCode = await assetLogoRequest;
    assetLogoCache = {
      expiresAtMs: Date.now() + ASSET_METADATA_TTL_MS,
      logosByAssetCode,
    };
    return logosByAssetCode;
  } finally {
    assetLogoRequest = null;
  }
}

async function fetchAssetLogoMap(): Promise<Map<string, string>> {
  const response = await fetch(BINANCE_ASSET_LIST_URL, {
    cache: "force-cache",
    headers: {
      accept: "application/json",
      "user-agent": "SmartKline asset icon metadata proxy",
    },
  });

  if (!response.ok) {
    throw new Error(`Binance asset metadata failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json() as BinanceAssetListResponse;
  const logosByAssetCode = new Map<string, string>();

  for (const asset of payload.data ?? []) {
    const assetCode = typeof asset.assetCode === "string" ? normalizeAssetCode(asset.assetCode) : "";
    const logoUrl = normalizeLogoUrl(asset.fullLogoUrl) ?? normalizeLogoUrl(asset.logoUrl);

    if (assetCode && logoUrl) {
      logosByAssetCode.set(assetCode, logoUrl);
    }
  }

  return logosByAssetCode;
}

function normalizeAssetCode(asset: string): string {
  const normalizedAsset = asset.trim().toUpperCase();

  return ASSET_CODE_PATTERN.test(normalizedAsset) ? normalizedAsset : "";
}

function normalizeLogoUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const rawUrl = value.trim().startsWith("//") ? `https:${value.trim()}` : value.trim();

  try {
    const logoUrl = new URL(rawUrl, BINANCE_WEB_BASE_URL);
    if (logoUrl.protocol !== "https:" || !ICON_HOST_ALLOWLIST.has(logoUrl.hostname)) {
      return null;
    }

    return logoUrl.toString();
  } catch {
    return null;
  }
}

function createAssetCodeCandidates(assetCode: string): string[] {
  const candidates = [assetCode];
  const prefixedAssetPatterns = [/^1000000(?=[A-Z])/u, /^1000(?=[A-Z])/u, /^1M(?=[A-Z])/u];

  for (const pattern of prefixedAssetPatterns) {
    const strippedAssetCode = assetCode.replace(pattern, "");
    if (strippedAssetCode !== assetCode && normalizeAssetCode(strippedAssetCode)) {
      candidates.push(strippedAssetCode);
    }
  }

  return Array.from(new Set(candidates));
}

function createFallbackIconResponse(assetCode: string): Response {
  const glyph = escapeSvgText((assetCode.slice(0, 3) || "?").toUpperCase());
  const palette = createFallbackPalette(assetCode);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="${glyph}"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${palette[0]}"/><stop offset="1" stop-color="${palette[1]}"/></linearGradient></defs><circle cx="32" cy="32" r="32" fill="url(#g)"/><text x="32" y="36" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-family="Inter,Arial,sans-serif" font-size="20" font-weight="800">${glyph}</text></svg>`;

  return new Response(svg, {
    headers: {
      "cache-control": FALLBACK_RESPONSE_CACHE_CONTROL,
      "content-type": "image/svg+xml; charset=utf-8",
    },
  });
}

function createFallbackPalette(assetCode: string): readonly [string, string] {
  const palettes: readonly (readonly [string, string])[] = [
    ["#38bdf8", "#818cf8"],
    ["#60a5fa", "#22d3ee"],
    ["#93c5fd", "#a78bfa"],
    ["#67e8f9", "#0ea5e9"],
    ["#7dd3fc", "#c4b5fd"],
    ["#5eead4", "#38bdf8"],
  ];

  return palettes[Math.abs(hashString(assetCode)) % palettes.length];
}

function hashString(value: string): number {
  return Array.from(value).reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0);
}

function escapeSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
