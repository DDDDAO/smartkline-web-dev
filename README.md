# SmartKLine Web Dev

Frontend-only SmartKLine UI sandbox for fast UI/UX iteration. The goal is to keep the visual behavior aligned with the production SmartKLine frontend while removing every backend dependency so designers and frontend engineers can tune layouts, cards, chart overlays, and paper-position states quickly.

## What this project is

- A standalone Next.js app copied from the SmartKLine web frontend.
- KOL signal loading, realtime KOL pushes, market discovery, historical candles, and realtime candle updates are all local mocks.
- No backend service, API key, `.env`, Binance network request, or SmartKLine API endpoint is required.
- File/function names intentionally stay close to the production app to make UI changes easy to port back.

## Mock coverage

The mock feed is designed to cover the UI states that matter for KOL position cards and chart overlays:

| Case | Expected UI state |
| --- | --- |
| Range short that never reaches entry | `未入场` / not-entered distance display |
| Long entered with floating profit | entered positive PnL |
| Long entered with floating loss | entered negative PnL |
| Short entered with floating profit | entered positive PnL |
| Short entered with floating loss | entered negative PnL |
| Long exited by take profit | exited / take-profit badge |
| Short exited by take profit | exited / take-profit badge |
| Long exited by stop loss | exited / stop-loss badge |
| Short exited by stop loss | exited / stop-loss badge |
| Trigger-price long | trigger entry rendering |
| Market short | market-entry rendering |
| Market long without stop/take-profit | missing risk fields |
| Missing 1m coverage | invalid paper-position state |
| Duplicate parsed BTC position | frontend dedupe keeps earliest card |

## Key files

```text
src/app/_lib/mock-kol-signal-data.ts      # all KOL mock scenarios
src/app/_lib/kol-signal-api.ts           # mocked KOL load + mocked realtime pushes
src/app/_lib/binance-market-data.ts      # mocked market list, OHLCV history, realtime candles
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

## Data contracts

These are frontend contracts used by the UI. In this dev project they are fulfilled by local mocks, but the shapes mirror the production frontend's expectations.

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
- Returns the full mock KOL signal list.
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

- Emits the full mock list once shortly after subscription.
- Emits a repeated BTC parsed-position event every 12 seconds.
- Returns an unsubscribe function that clears timers.
- Does not open `EventSource` or any network connection.

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

Mock behavior:

- Returns one market symbol for each KOL mock scenario.
- Does not request Binance exchange info.

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
  limit: 360,
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

Mock behavior:

- Generates deterministic candles per mock scenario.
- Forces highs/lows where needed to trigger take-profit or stop-loss states.
- Supports `limit` and `untilMs` so chart pagination still exercises the production code path.
- The `invalid-missing-coverage` case intentionally starts candles after the signal time.

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

Mock behavior:

- Calls `onOpen` asynchronously.
- Emits one deterministic candle every 3 seconds.
- Returns an unsubscribe function that clears the timer.
- Keeps the production function name for portability, but no WebSocket is opened.

## Porting changes back

UI work should usually port cleanly from this project back to the monorepo frontend because the component layout and type contracts remain aligned. Treat these files as mock-only and do not copy them back blindly:

```text
src/app/_lib/mock-kol-signal-data.ts
src/app/_lib/kol-signal-api.ts
src/app/_lib/binance-market-data.ts
```

Copy component-level UI changes first, then reconcile any data contract differences in the production app.
