import { useMemo, useState } from "react";

import { getCopyTradingRequiredEventTypes } from "@/lib/copy-trading-radar-api";
import type {
  CopyTradingEvent,
  CopyTradingRadarSnapshot,
} from "@/types/copy-trading";
import type { KolSignalSourceStatus } from "../types";
import {
  CopyTradingSourceNotice,
  EmptyState,
  RadarMetric,
  RadarSectionButton,
} from "./copy-trading-radar-shell";
import { EquityEtfSection } from "./copy-trading-radar-equity";
import {
  MonitoredEventTypes,
  PinnedTraderSection,
  TraderDetail,
  TraderStrip,
} from "./copy-trading-radar-traders";
import {
  ALL_EVENT_FILTER,
  formatCurrency,
  getStatusBadgeClass,
  groupEventsByTrader,
  groupPositionsByTrader,
} from "./copy-trading-radar-utils";

type CopyTradingRadarPanelProps = {
  activeEventId: string;
  isDarkTheme: boolean;
  snapshot: CopyTradingRadarSnapshot;
  sourceStatus: KolSignalSourceStatus;
  onEventSelect: (event: CopyTradingEvent) => void;
  onSymbolSelect: (symbol: string) => void;
};

type RadarSection = "traders" | "equity-etf";

export function CopyTradingRadarPanel({
  activeEventId,
  isDarkTheme,
  snapshot,
  sourceStatus,
  onEventSelect,
  onSymbolSelect,
}: CopyTradingRadarPanelProps) {
  const defaultPinnedTraderIds = useMemo(() => snapshot.traders.filter((trader) => trader.watch_status === "pinned" || trader.watch_status === "custom").map((trader) => trader.trader_id), [snapshot.traders]);
  const [section, setSection] = useState<RadarSection>("traders");
  const [pinnedTraderIds, setPinnedTraderIds] = useState<ReadonlySet<string>>(() => new Set(defaultPinnedTraderIds));
  const [selectedTraderId, setSelectedTraderId] = useState(snapshot.traders[0]?.trader_id ?? "");
  const [eventFilter, setEventFilter] = useState<string>(ALL_EVENT_FILTER);

  const pinnedTraders = useMemo(() => snapshot.traders.filter((trader) => pinnedTraderIds.has(trader.trader_id)), [pinnedTraderIds, snapshot.traders]);
  const unpinnedTraders = useMemo(() => snapshot.traders.filter((trader) => !pinnedTraderIds.has(trader.trader_id)), [pinnedTraderIds, snapshot.traders]);
  const effectiveSelectedTraderId = snapshot.traders.some((trader) => trader.trader_id === selectedTraderId) ? selectedTraderId : snapshot.traders[0]?.trader_id ?? "";
  const selectedTrader = snapshot.traders.find((trader) => trader.trader_id === effectiveSelectedTraderId) ?? snapshot.traders[0] ?? null;
  const positionsByTrader = useMemo(() => groupPositionsByTrader(snapshot.positions), [snapshot.positions]);
  const eventsByTrader = useMemo(() => groupEventsByTrader(snapshot.events), [snapshot.events]);
  const selectedTraderPositions = selectedTrader ? positionsByTrader.get(selectedTrader.trader_id) ?? [] : [];
  const selectedTraderEvents = selectedTrader ? eventsByTrader.get(selectedTrader.trader_id) ?? [] : [];
  const filteredEvents = selectedTraderEvents.filter((event) => eventFilter === ALL_EVENT_FILTER || event.event_type === eventFilter);
  const monitoredEventTypes = getCopyTradingRequiredEventTypes();
  const activeEvent = snapshot.events.find((event) => event.event_id === activeEventId) ?? null;
  const activeTraderCount = snapshot.traders.filter((trader) => trader.status === "ACTIVE").length;
  const totalMarginBalance = snapshot.traders.reduce((sum, trader) => sum + (trader.margin_balance ?? 0), 0);

  const panelClassName = isDarkTheme
    ? "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm"
    : "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm";
  const headerBorderClassName = isDarkTheme ? "border-b border-slate-800 px-4 py-3" : "border-b border-slate-200 px-4 py-3";
  const mutedClassName = isDarkTheme ? "text-slate-500" : "text-slate-400";
  const bodyClassName = isDarkTheme ? "min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-950/20 p-3" : "min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/65 p-3";

  const togglePinned = (traderId: string) => {
    setPinnedTraderIds((currentPinnedTraderIds) => {
      const nextPinnedTraderIds = new Set(currentPinnedTraderIds);
      if (nextPinnedTraderIds.has(traderId)) {
        nextPinnedTraderIds.delete(traderId);
      } else {
        nextPinnedTraderIds.add(traderId);
      }
      return nextPinnedTraderIds;
    });
  };

  return (
    <aside className={panelClassName}>
      <div className={headerBorderClassName}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={isDarkTheme ? "text-base font-semibold text-slate-50" : "text-base font-semibold text-slate-950"}>带单雷达</h2>
            <p className={`mt-1 text-[11px] leading-4 ${mutedClassName}`}>
              监测 Binance Square 带单员仓位、交易事件和美股 / ETF 联动信号。
            </p>
          </div>
          <span className={sourceStatus.error ? getStatusBadgeClass(isDarkTheme, "warning") : getStatusBadgeClass(isDarkTheme, "positive")}>
            {sourceStatus.error ? "Demo 兜底" : sourceStatus.isLoading ? "同步中" : "Signal Center"}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <RadarMetric isDarkTheme={isDarkTheme} label="带单员" value={`${activeTraderCount}/${snapshot.traders.length}`} />
          <RadarMetric isDarkTheme={isDarkTheme} label="保证金" value={formatCurrency(totalMarginBalance)} />
          <RadarMetric isDarkTheme={isDarkTheme} label="事件" value={String(snapshot.events.length)} />
        </div>
      </div>

      <div className={isDarkTheme ? "border-b border-slate-800 bg-slate-900/95 p-3" : "border-b border-slate-200 bg-white p-3"}>
        <div className={isDarkTheme ? "grid grid-cols-2 gap-1 rounded-xl border border-slate-700 bg-slate-950 p-1" : "grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1"}>
          <RadarSectionButton isActive={section === "traders"} isDarkTheme={isDarkTheme} label="带单员" onClick={() => setSection("traders")} />
          <RadarSectionButton isActive={section === "equity-etf"} isDarkTheme={isDarkTheme} label="美股 / ETF" onClick={() => setSection("equity-etf")} />
        </div>
      </div>

      <div className={bodyClassName}>
        <CopyTradingSourceNotice isDarkTheme={isDarkTheme} sourceStatus={sourceStatus} />
        {section === "traders" ? (
          <>
            <MonitoredEventTypes isDarkTheme={isDarkTheme} eventTypes={monitoredEventTypes} />
            <PinnedTraderSection
              activeTraderId={selectedTrader?.trader_id ?? ""}
              isDarkTheme={isDarkTheme}
              pinnedTraderIds={pinnedTraderIds}
              positionsByTrader={positionsByTrader}
              traders={pinnedTraders}
              onPinnedToggle={togglePinned}
              onTraderSelect={setSelectedTraderId}
            />
            {unpinnedTraders.length > 0 ? (
              <TraderStrip
                activeTraderId={selectedTrader?.trader_id ?? ""}
                isDarkTheme={isDarkTheme}
                pinnedTraderIds={pinnedTraderIds}
                positionsByTrader={positionsByTrader}
                traders={unpinnedTraders}
                title="全部带单员"
                onPinnedToggle={togglePinned}
                onTraderSelect={setSelectedTraderId}
              />
            ) : null}
            {selectedTrader ? (
              <TraderDetail
                activeEvent={activeEvent}
                eventFilter={eventFilter}
                events={filteredEvents}
                isDarkTheme={isDarkTheme}
                positions={selectedTraderPositions}
                selectedTrader={selectedTrader}
                onEventFilterChange={setEventFilter}
                onEventSelect={onEventSelect}
                onSymbolSelect={onSymbolSelect}
              />
            ) : (
              <EmptyState isDarkTheme={isDarkTheme} label="暂无带单员数据。" />
            )}
          </>
        ) : (
          <EquityEtfSection isDarkTheme={isDarkTheme} signals={snapshot.equity_etf_signals} />
        )}
      </div>
    </aside>
  );
}
