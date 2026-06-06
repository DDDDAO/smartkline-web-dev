const BINANCE_ASSET_ICON_ENDPOINT =
  "https://www.binance.com/bapi/asset/v2/public/asset/asset/get-all-asset";

type BinanceAssetIconResponse = {
  data?: BinanceAssetIconRecord[];
};

type BinanceAssetIconRecord = {
  assetCode?: string;
  fullLogoUrl?: string;
  logoUrl?: string;
};

let binanceAssetIconMapPromise: Promise<Readonly<Record<string, string>>> | null = null;

/**
 * Binance Futures exchangeInfo does not expose asset logos. The Binance web
 * asset endpoint is public and CORS-enabled, so logo loading is isolated here
 * and remains optional: callers should keep their local fallback icons.
 */
export function fetchBinanceAssetIconMap(): Promise<Readonly<Record<string, string>>> {
  binanceAssetIconMapPromise ??= requestBinanceAssetIconMap().catch((error: unknown) => {
    binanceAssetIconMapPromise = null;
    throw error;
  });

  return binanceAssetIconMapPromise;
}

async function requestBinanceAssetIconMap(): Promise<Readonly<Record<string, string>>> {
  const response = await fetch(BINANCE_ASSET_ICON_ENDPOINT);
  if (!response.ok) {
    throw new Error(`Binance asset icon list failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json() as BinanceAssetIconResponse;
  const iconUrlsByAsset: Record<string, string> = {};

  for (const asset of payload.data ?? []) {
    const assetCode = asset.assetCode?.trim().toUpperCase();
    const iconUrl = asset.fullLogoUrl?.trim() || asset.logoUrl?.trim();
    if (!assetCode || !iconUrl) {
      continue;
    }

    iconUrlsByAsset[assetCode] = iconUrl;
  }

  return iconUrlsByAsset;
}
