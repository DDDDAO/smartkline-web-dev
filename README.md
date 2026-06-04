# SmartKLine Web Dev

Frontend-only SmartKLine UI sandbox for fast UI/UX iteration. The goal is to keep the visual behavior aligned with the production SmartKLine frontend while keeping KOL signals local and using the same Binance Futures market data path as the SmartKLine monorepo.

## What this project is

- A standalone Next.js app copied from the SmartKLine web frontend.
- KOL signal loading and realtime KOL pushes are local mocks whose price levels are calibrated from recent Binance USDⓈ-M Futures 1m candles.
- Market discovery and historical candles use Binance USDⓈ-M Futures REST snapshots. WebSocket realtime updates are intentionally disabled in the current UI to keep the chart and KOL ranges stable.
- No backend service, API key, `.env`, or SmartKLine API endpoint is required.
- File/function names intentionally stay close to the production app to make UI changes easy to port back.

## Mock coverage

The KOL mock feed keeps parsed-signal fixtures for position cards and chart overlays. On load, mock entry ranges, stop-loss, and 止盈 1/2/3 prices are rebuilt around recent Binance Futures 1m candles so the overlays stay inside the real K-line price range. Candle-dependent paper-position states still move as market data changes.

| Case | Fixture intent |
| --- | --- |
| Range short | range entry rendering |
| Long range | long position rendering |
| Short range | short position rendering |
| Trigger-price long | trigger entry rendering |
| Market short | market-entry rendering |
| Market long without stop/take-profit | missing risk fields |
| Multiple symbols | symbol switching and chart overlay coverage |
| Duplicate parsed BTC position | frontend dedupe keeps earliest card |

## Key files

```text
src/app/_lib/mock-kol-signal-data.ts      # all KOL mock scenarios
src/app/_lib/kol-signal-api.ts           # mocked KOL load + mocked realtime pushes
src/app/_lib/binance-market-data.ts      # Binance Futures market list and OHLCV snapshot history
src/app/_components/signal-workspace.tsx # production-aligned workspace state flow
```

## Install and run

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm dev
```

The project declares Node `>=20.9.0`, matching the Next.js runtime requirement used here.

## Frontend UI controls

- The KOL panel has three filters at the top: coin, paper-position status, and KOL source.
- The upper-right floating area contains a Telegram-style `社群接入` button.
- The notification banner component remains in place for later SSE wiring, but automatic mock pushes are disabled in snapshot mode.

## Data contracts

These are frontend contracts used by the UI. KOL signals are fulfilled by local mocks, while market data follows the production frontend's Binance Futures contracts.

### KOL initial load

Call site:

```ts
const signals = await fetchKolSignals();
```

Implementation:

```ts
export async function fetchKolSignals(): Promise<StructuredSignal[]>;
```

Mock behavior:

- Resolves after a short artificial delay.
- Returns the full mock KOL signal list after rebasing prices against recent Binance 1m candles when Binance is reachable.
- Uses Chinese take-profit numbering: `止盈 1` / `止盈 2` / `止盈 3`.
- Includes one later duplicate of the BTC short parsed position so the workspace dedupe path is exercised.

Response item shape:

```ts
type StructuredSignal = {
  id: string;
  source_name: string;
  source_avatar_url: string | null;
  source_level: "S" | "A" | "B";
  source_type: string;
  symbol: string;
  direction: "long" | "short";
  entry_type: "range" | "trigger";
  entry_min: number | null;
  entry_max: number | null;
  trigger_price: number | null;
  confirmation: string | null;
  stop_loss: number | null;
  take_profit: number[];
  status: "观察中" | "模拟运行中" | "建议止盈" | "已平仓" | "已失效";
  risk_tags: string[];
  raw_text: string;
  summary: string;
  created_at: string;
  isStrongAlert: boolean;
  isReview: boolean;
  pnl?: number;
};
```

Example:

```json
{
  "id": "mock-btc-short-range-not-entered",
  "source_name": "三马哥合约",
  "source_avatar_url": null,
  "source_level": "S",
  "source_type": "开仓信号",
  "symbol": "BTC/USDT:USDT",
  "direction": "short",
  "entry_type": "range",
  "entry_min": 67000,
  "entry_max": 68588,
  "trigger_price": null,
  "confirmation": "67000附近直接空市价，再挂 68588；价格未回到入场区，展示未入场。",
  "stop_loss": 70000,
  "take_profit": [66188, 65388, 63888],
  "status": "观察中",
  "risk_tags": ["区间入场", "止损完整", "止盈完整"],
  "raw_text": "三马哥合约: BTC/USDT:USDT 空，入场/触发 67,000-68,588，止损 70,000，止盈 66,188 / 65,388 / 63,888。67000附近直接空市价，再挂 68588；价格未回到入场区，展示未入场。",
  "summary": "BTC/USDT:USDT 空 mock signal: entry 67,000-68,588, stop 70,000, take profit 66,188 / 65,388 / 63,888",
  "created_at": "2026-06-03T23:22:00+08:00",
  "isStrongAlert": true,
  "isReview": false
}
```

### KOL realtime stream

Call site:

```ts
const unsubscribe = subscribeToKolSignals({
  onSignals: (signals) => {},
  onError: (error) => {},
});
```

Implementation:

```ts
type KolSignalSubscriptionHandlers = {
  onSignals: (signals: StructuredSignal[]) => void;
  onError?: (error: Error) => void;
};

export function subscribeToKolSignals(handlers: KolSignalSubscriptionHandlers): () => void;
```

Mock behavior:

- Realtime mock pushes are disabled in this snapshot mode, so the KOL list does not re-sort or refresh after the initial load.
- Returns a stable unsubscribe function for API compatibility.
- Does not open `EventSource` or any SmartKLine API network connection.

### KOL dedupe key

The workspace dedupes by parsed position, not by message ID:

```ts
export function createStructuredSignalPositionKey(signal: StructuredSignal): string;
```

Included fields:

```ts
{
  direction: signal.direction,
  entry: {
    max: signal.entry_type === "range" ? signal.entry_max : null,
    min: signal.entry_type === "range" ? signal.entry_min : null,
    price: signal.entry_type === "trigger" ? signal.trigger_price : null,
    type: signal.entry_type,
  },
  source_type: signal.source_type,
  stop_loss: signal.stop_loss,
  symbol: signal.symbol,
  take_profits: signal.take_profit,
}
```

When two messages parse to the same key, the UI keeps the earliest `created_at` item.

### Market list

Call site:

```ts
const symbols = await fetchUsdtPerpetualMarkets();
```

Implementation:

```ts
export async function fetchUsdtPerpetualMarkets(): Promise<MarketSymbol[]>;
```

Runtime behavior:

- Requests Binance USDⓈ-M Futures `exchangeInfo`.
- Keeps perpetual USDT contracts whose status is `TRADING`.
- Returns symbols in `BASE/USDT:USDT` format.

Example response:

```json
[
  "BTC/USDT:USDT",
  "ETH/USDT:USDT",
  "SOL/USDT:USDT",
  "BNB/USDT:USDT"
]
```

### Historical candles

Call site:

```ts
const candles = await fetchHistoricalCandles("BTC/USDT:USDT", "1m", {
  limit: 1500,
});
```

Implementation:

```ts
type HistoricalCandleFetchOptions = {
  limit?: number;
  untilMs?: number;
};

export async function fetchHistoricalCandles(
  symbol: MarketSymbol,
  interval: KlineInterval,
  options?: HistoricalCandleFetchOptions,
): Promise<MarketCandle[]>;
```

Response item shape:

```ts
type MarketCandle = {
  time: UTCTimestamp;
  sourceTimeMs: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
```

Runtime behavior:

- Requests Binance USDⓈ-M Futures `/fapi/v1/klines`.
- Supports `limit` and `untilMs` so chart pagination can request older pages.
- Subtracts 1 ms from `untilMs` before sending Binance `endTime` because Binance treats `endTime` as inclusive.

Example response item:

```json
{
  "time": 1780498800,
  "sourceTimeMs": 1780498800000,
  "open": 66324.6,
  "high": 66384.1,
  "low": 66265.1,
  "close": 66310.4,
  "volume": 1423
}
```

### Realtime candles

Call site:

```ts
const unsubscribe = subscribeToBinanceKlines("BTC/USDT:USDT", "1m", {
  onOpen: () => {},
  onError: (error) => {},
  onCandle: (candle) => {},
});
```

Implementation:

```ts
type RealtimeHandlers = {
  onOpen: () => void;
  onError: (error: Error) => void;
  onCandle: (candle: MarketCandle) => void;
};

export function subscribeToBinanceKlines(
  symbol: MarketSymbol,
  interval: KlineInterval,
  handlers: RealtimeHandlers,
): () => void;
```

Runtime behavior:

- The UI currently does not call this subscription path.
- K-line panels and paper-position calculations use the initial Binance REST snapshot only.
- This keeps the selected range and KOL status stable while frontend UI work continues.

## Porting changes back

UI work should usually port cleanly from this project back to the monorepo frontend because the component layout and type contracts remain aligned. Treat these files as dev-local or environment-specific and do not copy them back blindly:

```text
src/app/_lib/mock-kol-signal-data.ts
src/app/_lib/kol-signal-api.ts
```

`src/app/_lib/binance-market-data.ts` keeps the Binance Futures contracts, while the current UI intentionally consumes only REST snapshots for stability.

Copy component-level UI changes first, then reconcile any data contract differences in the production app.
