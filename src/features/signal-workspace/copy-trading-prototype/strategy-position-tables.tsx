"use client";

import type { WorkspaceCopy } from "@/i18n/workspace";
import type { TradingFoxPosition, TradingFoxStrategyDetail } from "@/lib/tradingfox-control-plane";
import { formatDetailCurrency, formatDetailNumber, formatLeverage, formatPositionSide, formatSignedDetailCurrency, getPnlClassName, getSideClassName, numberOrZero } from "./formatters";
import { getSignalSourcePositionMarkPrice, getSignalSourcePositionPnl } from "./strategy-position-summary";
import type { CopyPositionMarkPricesBySymbol } from "./strategy-detail-shared";

export function CopyPositionTable({
  isDarkTheme,
  positions,
  strategyCopy,
}: {
  isDarkTheme: boolean;
  positions: readonly TradingFoxPosition[];
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
}) {
  return (
    <div className="kol-scroll-area mt-3 overflow-x-auto">
      <table className="min-w-[860px] w-full border-collapse text-left text-sm">
        <thead>
          <tr className={isDarkTheme ? "border-b border-white/[0.075] text-xs font-black text-slate-500" : "border-b border-[#E8E8EC] text-xs font-black text-slate-500"}>
            <th className="px-3 py-3">Symbol</th>
            <th className="px-3 py-3">{strategyCopy.positionSide}</th>
            <th className="px-3 py-3">{strategyCopy.notional}</th>
            <th className="px-3 py-3">{strategyCopy.contracts}</th>
            <th className="px-3 py-3">{strategyCopy.leverage}</th>
            <th className="px-3 py-3">{strategyCopy.entryPrice}</th>
            <th className="px-3 py-3">{strategyCopy.markPrice}</th>
            <th className="px-3 py-3">PNL</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position, index) => {
            const pnl = numberOrZero(position.unrealizedPnl);
            return (
              <tr key={`${position.symbol}-${position.side}-${index}`} className={isDarkTheme ? "border-b border-white/[0.06] last:border-0" : "border-b border-[#E8E8EC] last:border-0"}>
                <td className="px-3 py-4 font-black underline underline-offset-2">{position.symbol}</td>
                <td className={`px-3 py-4 font-black ${getSideClassName(isDarkTheme, position.side)}`}>{formatPositionSide(position.side)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailCurrency(position.notional)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(position.contracts)}</td>
                <td className="px-3 py-4 font-semibold">{formatLeverage(position.leverage)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(position.entryPrice)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(position.markPrice)}</td>
                <td className={`px-3 py-4 font-black ${getPnlClassName(isDarkTheme, pnl)}`}>{formatSignedDetailCurrency(pnl)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function SignalSourcePositionTable({
  copyPositionMarkPricesBySymbol,
  isDarkTheme,
  positions,
  strategyCopy,
}: {
  copyPositionMarkPricesBySymbol: CopyPositionMarkPricesBySymbol;
  isDarkTheme: boolean;
  positions: readonly TradingFoxStrategyDetail["signalSources"][number]["positions"][number][];
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
}) {
  return (
    <div className="kol-scroll-area mt-3 overflow-x-auto">
      <table className="min-w-[760px] w-full border-collapse text-left text-sm">
        <thead>
          <tr className={isDarkTheme ? "border-b border-white/[0.075] text-xs font-black text-slate-500" : "border-b border-[#E8E8EC] text-xs font-black text-slate-500"}>
            <th className="px-3 py-3">Symbol</th>
            <th className="px-3 py-3">{strategyCopy.positionSide}</th>
            <th className="px-3 py-3">{strategyCopy.positionSize}</th>
            <th className="px-3 py-3">{strategyCopy.leverage}</th>
            <th className="px-3 py-3">{strategyCopy.entryPrice}</th>
            <th className="px-3 py-3">{strategyCopy.markPrice}</th>
            <th className="px-3 py-3">PNL</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position, index) => {
            const markPrice = getSignalSourcePositionMarkPrice(position, copyPositionMarkPricesBySymbol);
            const pnl = getSignalSourcePositionPnl(position, copyPositionMarkPricesBySymbol);
            return (
              <tr key={`${position.symbol}-${position.positionSide}-${index}`} className={isDarkTheme ? "border-b border-white/[0.06] last:border-0" : "border-b border-[#E8E8EC] last:border-0"}>
                <td className="px-3 py-4 font-black underline underline-offset-2">{position.symbol}</td>
                <td className={`px-3 py-4 font-black ${getSideClassName(isDarkTheme, position.positionSide)}`}>{formatPositionSide(position.positionSide)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(position.positionSize)}</td>
                <td className="px-3 py-4 font-semibold">{formatLeverage(position.leverage)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(position.entryPrice)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(markPrice)}</td>
                <td className={`px-3 py-4 font-black ${getPnlClassName(isDarkTheme, pnl ?? 0)}`}>{formatSignedDetailCurrency(pnl)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
