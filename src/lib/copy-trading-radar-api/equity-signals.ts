import type { CopyTradingDirection, EquityEtfSignal } from "@/types/copy-trading";
import { formatDateTimeWithUtc8Offset } from "./parsers";

export function createMockEquityEtfSignals(now: Date): EquityEtfSignal[] {
  const rows: Array<[EquityEtfSignal["symbol"], CopyTradingDirection, EquityEtfSignal["status"], number, number, string, string]> = [
    ["QQQ", "long", "active", 0.68, 0.54, "纳指风险偏好回升，利好高 beta 加密资产。", "Macro Tape"],
    ["SPY", "long", "watching", 0.51, 0.43, "大盘企稳但量能一般，对 BTC 方向影响中性偏多。", "US Index Desk"],
    ["NVDA", "long", "active", 0.47, 0.39, "AI 龙头继续走强，提升链上 AI 叙事风险偏好。", "AI Equity Flow"],
    ["TSLA", "short", "cooldown", 0.35, 0.31, "高波动成长股降温，短线压制 meme 与山寨情绪。", "Momentum Radar"],
    ["COIN", "long", "active", 0.74, 0.62, "交易所股走强通常领先加密成交活跃度。", "Crypto Equity Desk"],
    ["MSTR", "long", "watching", 0.81, 0.58, "BTC 代理资产维持强势，增强 BTC 上行弹性。", "BTC Proxy Watch"],
    ["IBIT", "long", "active", 0.88, 0.49, "现货 ETF 资金面偏强，支撑 BTC 现货买盘。", "ETF Flow"],
    ["ETHA", "long", "watching", 0.42, 0.86, "ETH ETF 流入改善，利好 ETH/BTC 修复。", "ETF Flow"],
  ];

  return rows.map(([symbol, direction, status, btcCorrelation, ethCorrelation, cryptoImpact, source], index) => ({
    signal_id: `equity-etf-${symbol.toLowerCase()}`,
    source,
    symbol,
    direction,
    status,
    btc_correlation: btcCorrelation,
    eth_correlation: ethCorrelation,
    crypto_impact: cryptoImpact,
    updated_at: formatDateTimeWithUtc8Offset(new Date(now.getTime() - (index * 7 + 3) * 60_000)),
  }));
}
