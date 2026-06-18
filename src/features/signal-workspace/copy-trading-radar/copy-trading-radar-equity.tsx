import type { EquityEtfSignal } from "@/app/_types/copy-trading";
import {
  formatDisplayTime,
  formatEquityStatus,
  formatSignedPercent,
  getDirectionBadgeClassName,
  getEquityStatusBadgeClassName,
  getStatusBadgeClass,
} from "./copy-trading-radar-utils";

export function EquityEtfSection({ isDarkTheme, signals }: { isDarkTheme: boolean; signals: readonly EquityEtfSignal[] }) {
  return (
    <section className={isDarkTheme ? "rounded-2xl border border-slate-800 bg-slate-950 p-3" : "rounded-2xl border border-slate-200 bg-white p-3"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={isDarkTheme ? "text-xs font-black text-slate-100" : "text-xs font-black text-slate-900"}>美股 / ETF 信号专区</div>
          <p className={isDarkTheme ? "mt-1 text-[11px] leading-4 text-slate-500" : "mt-1 text-[11px] leading-4 text-slate-500"}>QQQ、SPY、NVDA、TSLA、COIN、MSTR、IBIT、ETHA 与加密市场联动。</p>
        </div>
        <span className={getStatusBadgeClass(isDarkTheme, "positive")}>{signals.length} 标的</span>
      </div>
      <div className="mt-3 grid gap-2">
        {signals.map((signal) => <EquityEtfSignalCard key={signal.signal_id} isDarkTheme={isDarkTheme} signal={signal} />)}
      </div>
    </section>
  );
}

export function EquityEtfSignalCard({ isDarkTheme, signal }: { isDarkTheme: boolean; signal: EquityEtfSignal }) {
  const cardClassName = isDarkTheme ? "rounded-2xl border border-slate-800 bg-slate-900 p-3" : "rounded-2xl border border-slate-100 bg-slate-50 p-3";
  const directionClassName = getDirectionBadgeClassName(isDarkTheme, signal.direction);

  return (
    <div className={cardClassName}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className={isDarkTheme ? "text-sm font-black text-slate-50" : "text-sm font-black text-slate-950"}>{signal.symbol}</div>
            <span className={directionClassName}>{signal.direction === "long" ? "多" : "空"}</span>
            <span className={getEquityStatusBadgeClassName(isDarkTheme, signal.status)}>{formatEquityStatus(signal.status)}</span>
          </div>
          <div className={isDarkTheme ? "mt-1 text-[11px] text-slate-500" : "mt-1 text-[11px] text-slate-500"}>{signal.source} · {formatDisplayTime(signal.updated_at)}</div>
        </div>
        <div className={isDarkTheme ? "text-right text-[11px] font-bold text-slate-400" : "text-right text-[11px] font-bold text-slate-500"}>
          <div>BTC {formatSignedPercent(signal.btc_correlation)}</div>
          <div>ETH {formatSignedPercent(signal.eth_correlation)}</div>
        </div>
      </div>
      <p className={isDarkTheme ? "mt-2 text-xs leading-5 text-slate-400" : "mt-2 text-xs leading-5 text-slate-600"}>{signal.crypto_impact}</p>
    </div>
  );
}
