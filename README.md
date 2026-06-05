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
| BTC short resonance | same-direction multi-KOL avatar stack and resonance pulse |
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
src/app/_lib/signal-ai-summary.ts        # demo AI window summary and key-price ranges
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

- The app opens with a short `K线情报局` intro card, product benefit copy, and a simple signal-to-K-line walkthrough.
- The upper-right floating area contains the `K线情报局` brand, `我的 · TG登录`, and Telegram community entry. Telegram entry opens `NEXT_PUBLIC_TELEGRAM_GROUP_URL` when configured, falling back to a demo `t.me` URL.
- After the demo Telegram login, the `我的` panel shows TG group binding, signal-source binding, and notification-permission status cards.
- The lower-left dock contains the theme and language settings so the chart header stays focused on market controls.
- The KOL panel has three filters at the top: KOL source, long/short direction, and coin.
- KOL cards can flip from the structured signal front side to a Telegram-like source-message back side. In the logged-out state, the latest cards show a frosted login overlay and the browsable cards are labeled as three-day delayed samples.
- The chart replaces the old text signal marker with KOL avatars, shows resonance badges for nearby same-direction sources, draws risk/reward bands, and marks paper-position entry/exit with `B`/`S`.
- The chart area includes an AI window summary for long/short percentages, high-frequency prices, and highlighted key ranges. If Binance candles cannot load, the chart area shows a network-region environment guide.
- The middle collapse arrow hides or restores the right intelligence panel for full-width chart review.
- The notification banner component remains in place for later SSE wiring, but automatic mock pushes are disabled in snapshot mode.

## Monorepo interface protocol

Use `../smartkline` as the source of truth when reconnecting this dev sandbox to the monorepo. The current files that define the production contract are:

```text
../smartkline/apps/web/src/app/_lib/kol-signal-api.ts
../smartkline/apps/web/src/app/_lib/binance-market-data.ts
../smartkline/apps/web/src/app/_types/signal.ts
../smartkline/apps/kol-backend/src/kol-ai-results/kol-ai-results.controller.ts
../smartkline/apps/kol-backend/src/kol-ai-results/kol-ai-results.service.ts
```

This sandbox may mock or freeze parts of the runtime behavior for UI work, but the adapter that is ported back should satisfy the contract below.

### Environment variables and endpoint resolution

Production web supports three public environment variables:

```bash
NEXT_PUBLIC_KOL_SIGNALS_API_BASE_URL=https://api.smartkline.com/kol
NEXT_PUBLIC_KOL_SIGNALS_ENDPOINT=https://api.smartkline.com/kol/kol-message-ai-results?limit=50
NEXT_PUBLIC_KOL_SIGNALS_STREAM_ENDPOINT=https://api.smartkline.com/kol/kol-message-ai-results/signals/stream?limit=20
```

Resolution order for initial KOL signal loading:

1. `NEXT_PUBLIC_KOL_SIGNALS_ENDPOINT` as a full REST URL.
2. `NEXT_PUBLIC_KOL_SIGNALS_API_BASE_URL` + `/kol-message-ai-results?limit=50`.
3. On `localhost` / `127.0.0.1` only: `http://127.0.0.1:3001/kol-message-ai-results?limit=50`, with sample fallback on failure.
4. Default remote: `https://api.smartkline.com/kol/kol-message-ai-results?limit=50`.

Resolution order for SSE:

1. `NEXT_PUBLIC_KOL_SIGNALS_STREAM_ENDPOINT` as a full SSE URL.
2. `NEXT_PUBLIC_KOL_SIGNALS_API_BASE_URL` + `/kol-message-ai-results/signals/stream?limit=20`.
3. On `localhost` / `127.0.0.1` only: `http://127.0.0.1:3001/kol-message-ai-results/signals/stream?limit=20`.
4. Default remote: `https://api.smartkline.com/kol/kol-message-ai-results/signals/stream?limit=20`.

If `NEXT_PUBLIC_KOL_SIGNALS_API_BASE_URL` is set to `https://api.smartkline.com`, the production adapter normalizes it to `https://api.smartkline.com/kol` before appending paths.

### Backend KOL endpoints

The monorepo backend exposes these routes under controller path `kol-message-ai-results`:

| Method | Path | Query | SSE event types | Frontend use |
| --- | --- | --- | --- | --- |
| `GET` | `/kol-message-ai-results` | `source_id?`, `limit?` | - | Default REST source for web. Returns AI result messages with `standard_message`. |
| `GET` | `/kol-message-ai-results/signals` | `source_id?`, `limit?` | - | Flattened successful trade signals. Supported by the frontend adapter. |
| `SSE` | `/kol-message-ai-results/stream` | `source_id?`, `limit?`, `after_created_at?`, `after_source_id?`, `after_source_message_id?` | `heartbeat`, `messages` | Result-message stream. Supports `Last-Event-ID` cursor. |
| `SSE` | `/kol-message-ai-results/signals/stream` | `source_id?`, `limit?` | `signals` | Default production realtime signal stream. |

Backend limits from the monorepo source:

- `listResults`: default `50`, max `200`.
- `listSignals`: default `50`, max `200`.
- `listLatestResultMessages`: default `20`, max `100`.
- SSE intervals use `KOL_RESULTS_SSE_INTERVAL_MS` and `KOL_SIGNALS_SSE_INTERVAL_MS`, both defaulting to `10_000` ms.

### REST result-message payload

`GET /kol-message-ai-results` returns an array of result messages. This is the primary production REST shape.

```ts
type KolSignalAiResultResponse = {
  source_id?: string | number | null;
  source_message_id?: string | number | null;
  created_at?: string | null;
  kol_channel_name?: string | null;
  kol_avatar_url?: string | null;
  original_message?: string | null;
  standard_message?: KolSignalApiResponse | null;
};
```

The frontend only adapts `standard_message` values that match a successful trade signal response:

```ts
type KolSignalApiResponse = {
  error?: string | null;
  reason?: string | null;
  status?: "SUCCESS" | "FAILED" | string | null;
  signals?: KolSignalApiItem[] | null;
  message_type?: string | null;
  is_trade_signal?: boolean | null;
  source_id?: string | number | null;
  source_name?: string | null;
  raw_text?: string | null;
  created_at?: string | null;
  message_id?: string | null;
  source_message_id?: string | number | null;
};
```

A response is ignored unless:

```ts
standard_message.status === "SUCCESS" && standard_message.is_trade_signal === true
```

### Flattened signal payload

`GET /kol-message-ai-results/signals`, SSE `signals`, and some legacy payloads provide flattened items. The web adapter accepts this item shape directly:

```ts
type KolSignalApiItem = {
  id?: string | null;
  source_id?: string | number | null;
  source_message_id?: string | number | null;
  source_name?: string | null;
  created_at?: string | null;
  message_type?: string | null;
  raw_text?: string | null;
  source_avatar_url?: string | null;
  standard_message_dedup_key?: string | null;
  entry?: KolSignalApiEntry | null;
  symbol?: string | null;
  direction?: "LONG" | "SHORT" | string | null;
  stop_loss?: { price?: string | number | null } | null;
  take_profits?: Array<{
    label?: string | null;
    price?: string | number | null;
    percentage?: string | number | null;
  }> | null;
};

type KolSignalApiEntry = {
  raw?: string | null;
  type?: "RANGE" | "PRICE" | "MARKET" | "UNKNOWN" | string | null;
  price?: string | number | null;
  range?: string | null;
  max_price?: string | number | null;
  min_price?: string | number | null;
};
```

Numeric fields may be strings or numbers. Empty strings, `null`, and invalid numbers are treated as missing.

### SSE payloads

The production web adapter subscribes with `EventSource` and listens to both `messages` and `signals` event names.

`signals` event payload:

```ts
type KolSignalApiStreamPayload = {
  signals?: KolSignalApiItem[] | null;
  count?: number | null;
  emitted_at?: string | null;
};
```

`messages` event payload:

```ts
type KolSignalApiStreamPayload = {
  messages?: KolSignalAiResultResponse[] | KolSignalApiResponse[] | null;
  count?: number | null;
  emitted_at?: string | null;
};
```

`/kol-message-ai-results/stream` also emits heartbeat events:

```ts
type HeartbeatPayload = {
  cursor: {
    created_at: string;
    source_id: string;
    source_message_id: string;
  } | null;
  emitted_at: string;
};
```

The cursor event id is encoded as:

```text
<created_at_iso>|<source_id>|<encodeURIComponent(source_message_id)>
```

### Accepted frontend payload variants

`adaptKolSignalPayload` in the monorepo web app accepts all of these top-level payload shapes:

```ts
type KolSignalApiPayload =
  | KolSignalApiItem[]
  | KolSignalApiResponse
  | KolSignalApiResponse[]
  | KolSignalAiResultResponse
  | KolSignalAiResultResponse[]
  | KolSignalApiStreamPayload
  | { items?: KolSignalApiItem[] | KolSignalApiResponse[] | KolSignalAiResultResponse[] | null };
```

This means web-dev can mock whichever form is easiest, but the safest monorepo-compatible fixture is a `KolSignalAiResultResponse[]` from `/kol-message-ai-results` because that is the default production REST route.

### Adapter normalization rules

The monorepo adapter maps API data into the UI `StructuredSignal` contract:

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

Important normalization details from `../smartkline/apps/web/src/app/_lib/kol-signal-api.ts`:

- `symbol` falls back to `BTC/USDT:USDT` if missing.
- `direction === "LONG"` becomes `long`; every other value becomes `short`.
- `entry.type === "RANGE"` or both `entry.min_price` and `entry.max_price` present becomes `entry_type: "range"`.
- Otherwise `entry_type` is `trigger`; if `entry.price` is missing, downstream paper-position logic treats it like a market entry.
- `entry.range` can be parsed with separators `-`, `~`, `—`, `–`, `到`, or `至`.
- `message_type === "OPEN_POSITION"` displays as `开仓信号`.
- Known source ids map to display names: `34 -> 大镖客合约群`, `49 -> 三马哥合约`; otherwise `KOL 信源 #<source_id>`.
- `source_avatar_url` must be `http` or `https`; invalid URLs become `null`.
- `created_at` is normalized to a UTC+8 ISO string like `2026-06-03T19:16:04+08:00`.
- `confirmation` is `entry.raw`.
- `take_profit` keeps only valid numeric `take_profits[].price` values.

### Deduplication contract

The monorepo has two dedupe layers.

API item dedupe before adaptation uses:

```ts
{
  direction,
  entry: { max, min, price, type },
  message_type,
  stop_loss,
  symbol,
  take_profits,
}
```

Workspace dedupe after adaptation uses:

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

Both layers keep the earliest `created_at` when duplicate parsed positions appear.

### Binance market-data protocol

The monorepo web app uses Binance USDⓈ-M Futures directly from the browser.

Market list:

```text
GET https://fapi.binance.com/fapi/v1/exchangeInfo
```

The adapter keeps only symbols where:

```ts
contractType === "PERPETUAL" && quoteAsset === "USDT" && status === "TRADING"
```

It exposes symbols as `BASE/USDT:USDT`.

Historical candles:

```text
GET https://fapi.binance.com/fapi/v1/klines?symbol=<BASEUSDT>&interval=<interval>&limit=<limit>&endTime=<untilMs-1>
```

`endTime` is sent only for older-page loading. It is `untilMs - 1` because Binance treats `endTime` as inclusive.

Binance kline rows are normalized into:

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

Realtime Binance stream in the monorepo:

```text
wss://fstream.binance.com/market/ws/<lowercase-baseusdt>@kline_<interval>
```

The kline message fields consumed by web are:

```ts
type BinanceKlinePayload = {
  k?: {
    t: number;
    o: string;
    h: string;
    l: string;
    c: string;
    v: string;
  };
};
```

This web-dev branch intentionally consumes only REST snapshots for now, but the port-back target should preserve the monorepo REST + WebSocket contract above.

## Porting changes back

UI work should usually port cleanly from this project back to the monorepo frontend because the component layout and type contracts remain aligned. Treat these files as dev-local or environment-specific and do not copy them back blindly:

```text
src/app/_lib/mock-kol-signal-data.ts
src/app/_lib/kol-signal-api.ts
```

`src/app/_lib/binance-market-data.ts` keeps the Binance Futures contracts, while the current UI intentionally consumes only REST snapshots for stability.

Copy component-level UI changes first, then reconcile any data contract differences in the production app.
