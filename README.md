# smartkline

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDDDDAO%2Fsmartkline&project-name=smartkline&repository-name=smartkline&install-command=pnpm%20install%20--frozen-lockfile&build-command=pnpm%20build)

smartkline 是「K线情报局」的全新前端项目。

当前已完成信号情报库 P1 的前端看盘工作台：左侧 K 线图表、右侧 KOL 信息区、Binance USDT 永续合约行情、KOL 发布时间标记和亮暗主题切换。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- pnpm
- Vercel

## 当前边界

第一阶段以前端为主，数据通过接口接入，优先围绕以下能力讨论和实现：

- 信号情报库主链路
- K 线定位与信号标注
- 强提醒与结构化信号卡
- 原文引用浮窗
- 10000U 轻量模拟观察

## 本地启动

```bash
pnpm install
pnpm dev
```

默认访问：<http://localhost:3000>

## Vercel 一键部署

点击 README 顶部的 **Deploy with Vercel** 按钮即可从 GitHub 一键创建 Vercel 项目。

项目已补充 Vercel 部署所需的默认配置：

- `vercel.json` 指定 Next.js framework、pnpm install 和 build command
- `package.json` 指定 `packageManager: pnpm@10.33.0`
- `package.json` 指定 Node.js 运行版本 `>=20.19.0`

Vercel 导入时保持默认即可：

```text
Framework Preset: Next.js
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm build
Output Directory: .next
```

部署后页面运行时会在浏览器侧请求 Binance Futures REST / WebSocket 行情；构建阶段不会依赖 Binance 网络请求。

## Backend auth proxy

The auth authority lives in `smartkline-backend`. The Next.js routes below are
compatibility routes: they redirect to the backend login flow or proxy the
opaque `sk_session` cookie to the backend. They must not sign final SmartKline
sessions locally.

```text
GET  /api/auth/telegram/start    -> redirects to /auth/telegram/start
GET  /api/auth/telegram/callback -> redirects to /auth/telegram/callback
GET  /api/auth/me                -> proxies /auth/me and maps the legacy UI shape
POST /api/auth/logout            -> proxies /auth/logout and clears local cookies
GET  /api/referral/me            -> proxies /referral/me for invite and summary data
GET  /api/referral/invitees      -> proxies /referral/invitees for the referral tree
GET  /api/referral/commissions   -> proxies /referral/commissions for accrual rows
```

Telegram community verification is retained as the v1 backend capability, but
the default frontend product flow only requires Telegram OIDC login and does not
show a join-group gate.

The workspace also exposes a lightweight “加入 TG 群讨论” CTA. It is only a
public discussion link and does not call the community verification v1 routes.
Configure it with:

```bash
NEXT_PUBLIC_TELEGRAM_GROUP_URL=https://t.me/smartkline
```

```text
POST /api/telegram/community/invite
POST /api/telegram/community/refresh
POST /api/telegram/webhook
```

BotFather must allow this exact redirect URI:

```text
https://api.smartkline.com/auth/telegram/callback
```

Configure this Vercel Environment Variable without the `NEXT_PUBLIC_` prefix:

```bash
SMARTKLINE_BACKEND_API_BASE_URL=https://api.smartkline.com
```

Telegram OIDC client credentials, session hashing, and cookie-domain settings
belong to the backend deployment.

### Telegram community verification v1

Telegram community verification v1 uses bot-generated one-person invite links.
The frontend no longer calls this flow by default. The code keeps the storage boundary behind
`src/lib/auth/telegram-community-store.ts`, with a process-memory adapter
only for wiring the architecture. Before relying on webhooks in production,
replace that adapter with a durable Redis/Postgres/KV implementation because
Telegram webhook requests do not include browser session cookies.

Optional environment variables for re-enabling the v1 flow:

```bash
TELEGRAM_BOT_USERNAME=
TELEGRAM_BOT_TOKEN=
TELEGRAM_COMMUNITY_CHAT_ID=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_COMMUNITY_INVITE_TTL_SECONDS=600
```

Add the verification bot to the target group as an administrator with
invite-link rights, then configure the webhook:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://www.smartkline.com/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
  -d 'allowed_updates=["chat_member"]'
```

The web flow is:

```text
Telegram OIDC login
  -> /api/telegram/community/invite creates a dedicated invite link
  -> user joins the Telegram group
  -> /api/telegram/webhook records chat_member status through the storage adapter
  -> /api/auth/me returns communityBinding=joined
```

## Copy-trading radar / Signal Center BFF

The main workspace currently shows the KOL signal panel only. The copy-trading
radar UI is hidden from the main branch while it is being finished in the
`feature/copy-trading-radar` worktree.

The copy-trading radar reads Signal Center through a server-side BFF route so the
`x-token` credential is never exposed to browser JavaScript:

```text
GET /api/signal-center/v1/signal-sources
GET /api/signal-center/v1/signal-sources/{id}/positions
GET /api/signal-center/v1/signal-sources/{id}/trades?limit=100
GET /api/signal-center/v1/list-signals-sources?pageSize=200&tradeLimit=200&window=30d&sortBy=pnl
GET /api/signal-center/v1/copy-trading-radar?sourceLimit=50&tradeLimit=100
```

Configure these Vercel Environment Variables without the `NEXT_PUBLIC_` prefix:

```bash
SIGNAL_CENTER_API_BASE_URL=https://api.smartkline.com/signal-center
SIGNAL_CENTER_API_TOKEN=
```

If Signal Center is unavailable or the token is not configured, the radar keeps
the UI usable with built-in demo data for 星辰, 勇行, user watchlist targets, all
ten monitored event types, and the QQQ / SPY / NVDA / TSLA / COIN / MSTR / IBIT
/ ETHA equity-ETF section.

## KOL 信源接口

前端已适配后端 KOL 成功交易信号列表接口和增量 REST 接口。真实接口模式下，如果页面运行在 `localhost` / `127.0.0.1`，会默认请求：

```text
Initial:     http://127.0.0.1:3001/kol-message-ai-results?since={seven_days_ago}&limit=1000
Incremental: http://127.0.0.1:3001/kol-message-ai-results/success-after?since={latest_created_at}&limit=100
```

## Development mock data

This standalone web-dev project keeps `src/app/_lib/mock-kol-signal-data.ts` for local UI work. In `next dev`, when neither `NEXT_PUBLIC_KOL_SIGNALS_ENDPOINT` nor `NEXT_PUBLIC_KOL_SIGNALS_API_BASE_URL` is configured, KOL signals use the Binance-aligned mock scenarios and incremental polling is disabled.

Use `NEXT_PUBLIC_KOL_SIGNALS_USE_MOCK=true` to force mock KOL signals, or `NEXT_PUBLIC_KOL_SIGNALS_USE_MOCK=false` plus an endpoint/base URL to exercise the real monorepo API contract.

生产和预览部署需要配置公开环境变量，仓库里的 `.env.example` 已给出默认值：

```bash
NEXT_PUBLIC_KOL_SIGNALS_API_BASE_URL=https://api.smartkline.com/kol
```

前端会基于该 base URL 请求：

```text
Initial:     https://api.smartkline.com/kol/kol-message-ai-results?since={seven_days_ago}&limit=1000
Incremental: https://api.smartkline.com/kol/kol-message-ai-results/success-after?since={latest_created_at}&limit=100
```

The page loads the last 7 days of successful KOL result messages once on first
render, then polls the incremental REST endpoint every 30 seconds with the
latest loaded message time:

```text
GET /kol-message-ai-results/success-after?since={latest_created_at}&limit=100
```

The incremental endpoint returns only successful messages after `since`, so the
frontend can append new cards without reopening an SSE connection.

KOL signals are publicly visible in real time by default. Telegram login is
kept as an optional personalization entry point, not as a gate for reading the
live signal feed.

Paper-position cards load historical 1m candle coverage with REST only when the
visible signal set changes. They do not create per-symbol Binance WebSockets;
live price comes from the active chart WebSocket.

在 Vercel 上请在 Project Settings 的 Environment Variables 中设置：

```bash
NEXT_PUBLIC_KOL_SIGNALS_API_BASE_URL=https://api.smartkline.com/kol
NEXT_PUBLIC_TELEGRAM_GROUP_URL=https://t.me/smartkline
```

`NEXT_PUBLIC_` 变量会在 Next.js 构建时写入浏览器 bundle；修改后需要重新部署才会对前端生效。

当前线上 API base URL 为：

```text
https://api.smartkline.com/kol
```

如果后端路径不是默认路径，也可以继续通过完整 endpoint 覆盖：

```bash
NEXT_PUBLIC_KOL_SIGNALS_ENDPOINT=https://api.smartkline.com/kol/kol-message-ai-results
```

本地可复制示例环境变量文件后按需调整：

```bash
cp .env.example .env.local
```

REST 返回数组即可。前端会读取 `standard_message`，只展示 `status=SUCCESS` 且 `is_trade_signal=true` 的交易信号，并按解析后的仓位字段做稳定去重；同一个仓位重复出现时只保留最早一次消息。

```json
[
  {
    "kol_channel_name": "大镖客合约群",
    "kol_avatar_url": "https://cdn.example.com/kol-avatar.png",
    "original_message": "BTC 67400-68600 short, SL 69200, TP 66500/65800/65100",
    "standard_message": {
      "error": null,
      "reason": null,
      "status": "SUCCESS",
      "signals": [
        {
          "entry": {
            "raw": "67400-68600",
            "type": "RANGE",
            "price": null,
            "range": "67400-68600",
            "max_price": "68600",
            "min_price": "67400"
          },
          "symbol": "BTC/USDT:USDT",
          "direction": "SHORT",
          "stop_loss": { "price": "69200" },
          "take_profits": [
            { "label": "TP_SHORT_1", "price": "66500", "percentage": null },
            { "label": "TP_SHORT_2", "price": "65800", "percentage": null },
            { "label": "TP_SHORT_3", "price": "65100", "percentage": null }
          ]
        }
      ],
      "message_type": "OPEN_POSITION",
      "is_trade_signal": true
    }
  }
]
```


`kol_avatar_url` 可以为 `null`。有头像时右侧 KOL 卡片展示圆形头像；没有头像时展示频道名称首字作为占位。

如果标准信号里带 `created_at`，前端会统一转换成 UTC+8 的 ISO 字符串，例如 `2026-05-31T11:16:04.780Z` 会显示为 `2026-05-31 19:16`，同时 K 线事件标记仍按同一个绝对时间定位。
如果本地接口不可用且未配置 endpoint，页面会使用内置的两条 KOL 信源样例作为 fallback。
