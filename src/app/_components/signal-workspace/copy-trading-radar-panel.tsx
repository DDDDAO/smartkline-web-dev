import { useMemo, useState } from "react";
import type {
  CopyTradingDirection,
  CopyTradingEvent,
  CopyTradingEventType,
  CopyTradingPosition,
  CopyTradingRadarSnapshot,
  CopyTradingRiskLevel,
  CopyTradingTrader,
  EquityEtfSignal,
  EquityEtfSignalStatus,
} from "@/app/_types/copy-trading";
import { formatCopyTradingEventType, getCopyTradingRequiredEventTypes } from "@/app/_lib/copy-trading-radar-api";
import type { KolSignalSourceStatus } from "./types";
import { SourceAvatar } from "./card-ui";

const ALL_EVENT_FILTER = "全部事件";

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
          <RadarMetric isDarkTheme={isDarkTheme} label="带单员" value={String(snapshot.traders.length)} />
          <RadarMetric isDarkTheme={isDarkTheme} label="当前仓位" value={String(snapshot.positions.length)} />
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

function RadarMetric({ isDarkTheme, label, value }: { isDarkTheme: boolean; label: string; value: string }) {
  return (
    <div className={isDarkTheme ? "rounded-2xl border border-slate-800 bg-slate-950 p-2" : "rounded-2xl border border-slate-200 bg-slate-50 p-2"}>
      <div className={isDarkTheme ? "text-[10px] font-semibold text-slate-500" : "text-[10px] font-semibold text-slate-400"}>{label}</div>
      <div className={isDarkTheme ? "mt-1 text-sm font-black text-slate-100" : "mt-1 text-sm font-black text-slate-950"}>{value}</div>
    </div>
  );
}

function RadarSectionButton({ isActive, isDarkTheme, label, onClick }: { isActive: boolean; isDarkTheme: boolean; label: string; onClick: () => void }) {
  const className = isActive
    ? "rounded-lg bg-cyan-500 px-3 py-2 text-xs font-black text-white shadow-sm"
    : isDarkTheme
      ? "rounded-lg px-3 py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
      : "rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-white hover:text-slate-950";

  return <button className={className} type="button" onClick={onClick}>{label}</button>;
}

function CopyTradingSourceNotice({ isDarkTheme, sourceStatus }: { isDarkTheme: boolean; sourceStatus: KolSignalSourceStatus }) {
  if (sourceStatus.isLoading) {
    return (
      <div className={isDarkTheme ? "rounded-2xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400" : "rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-500"}>
        正在同步 Signal Center 带单员、仓位和交易事件…
      </div>
    );
  }

  if (!sourceStatus.error) {
    return null;
  }

  return (
    <div className={isDarkTheme ? "rounded-2xl border border-amber-800/70 bg-amber-950/30 p-3 text-xs leading-5 text-amber-200" : "rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-700"}>
      Signal Center 暂未返回可展示数据，当前使用带单雷达 Demo 样例。错误：{sourceStatus.error}
    </div>
  );
}

function MonitoredEventTypes({ eventTypes, isDarkTheme }: { eventTypes: readonly CopyTradingEventType[]; isDarkTheme: boolean }) {
  return (
    <section className={isDarkTheme ? "rounded-2xl border border-slate-800 bg-slate-950 p-3" : "rounded-2xl border border-slate-200 bg-white p-3"}>
      <div className="flex items-center justify-between gap-3">
        <div className={isDarkTheme ? "text-xs font-black text-slate-100" : "text-xs font-black text-slate-900"}>监测事件类型</div>
        <div className={isDarkTheme ? "text-[10px] font-bold text-slate-500" : "text-[10px] font-bold text-slate-400"}>{eventTypes.length} 类</div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {eventTypes.map((eventType) => (
          <span key={eventType} className={getEventTypeChipClassName(isDarkTheme, eventType)}>{formatCopyTradingEventType(eventType)}</span>
        ))}
      </div>
    </section>
  );
}

function PinnedTraderSection({
  activeTraderId,
  isDarkTheme,
  pinnedTraderIds,
  positionsByTrader,
  traders,
  onPinnedToggle,
  onTraderSelect,
}: {
  activeTraderId: string;
  isDarkTheme: boolean;
  pinnedTraderIds: ReadonlySet<string>;
  positionsByTrader: ReadonlyMap<string, CopyTradingPosition[]>;
  traders: readonly CopyTradingTrader[];
  onPinnedToggle: (traderId: string) => void;
  onTraderSelect: (traderId: string) => void;
}) {
  if (traders.length === 0) {
    return (
      <section className={isDarkTheme ? "rounded-2xl border border-slate-800 bg-slate-950 p-3" : "rounded-2xl border border-slate-200 bg-white p-3"}>
        <div className={isDarkTheme ? "text-xs font-black text-slate-100" : "text-xs font-black text-slate-900"}>重点关注</div>
        <p className={isDarkTheme ? "mt-2 text-xs leading-5 text-slate-500" : "mt-2 text-xs leading-5 text-slate-500"}>点击任意带单员的星标后，会固定在右侧面板顶部。</p>
      </section>
    );
  }

  return (
    <TraderStrip
      activeTraderId={activeTraderId}
      isDarkTheme={isDarkTheme}
      pinnedTraderIds={pinnedTraderIds}
      positionsByTrader={positionsByTrader}
      traders={traders}
      title="重点关注"
      onPinnedToggle={onPinnedToggle}
      onTraderSelect={onTraderSelect}
    />
  );
}

function TraderStrip({
  activeTraderId,
  isDarkTheme,
  pinnedTraderIds,
  positionsByTrader,
  title,
  traders,
  onPinnedToggle,
  onTraderSelect,
}: {
  activeTraderId: string;
  isDarkTheme: boolean;
  pinnedTraderIds: ReadonlySet<string>;
  positionsByTrader: ReadonlyMap<string, CopyTradingPosition[]>;
  title: string;
  traders: readonly CopyTradingTrader[];
  onPinnedToggle: (traderId: string) => void;
  onTraderSelect: (traderId: string) => void;
}) {
  return (
    <section className={isDarkTheme ? "rounded-2xl border border-slate-800 bg-slate-950 p-3" : "rounded-2xl border border-slate-200 bg-white p-3"}>
      <div className="flex items-center justify-between gap-3">
        <div className={isDarkTheme ? "text-xs font-black text-slate-100" : "text-xs font-black text-slate-900"}>{title}</div>
        <span className={isDarkTheme ? "text-[10px] font-bold text-slate-500" : "text-[10px] font-bold text-slate-400"}>{traders.length}</span>
      </div>
      <div className="mt-2 grid gap-2">
        {traders.map((trader) => (
          <TraderCard
            key={trader.trader_id}
            isActive={trader.trader_id === activeTraderId}
            isDarkTheme={isDarkTheme}
            isPinned={pinnedTraderIds.has(trader.trader_id)}
            positions={positionsByTrader.get(trader.trader_id) ?? []}
            trader={trader}
            onPinnedToggle={onPinnedToggle}
            onTraderSelect={onTraderSelect}
          />
        ))}
      </div>
    </section>
  );
}

function TraderCard({
  isActive,
  isDarkTheme,
  isPinned,
  positions,
  trader,
  onPinnedToggle,
  onTraderSelect,
}: {
  isActive: boolean;
  isDarkTheme: boolean;
  isPinned: boolean;
  positions: readonly CopyTradingPosition[];
  trader: CopyTradingTrader;
  onPinnedToggle: (traderId: string) => void;
  onTraderSelect: (traderId: string) => void;
}) {
  const cardClassName = getTraderCardClassName(isDarkTheme, isActive, trader.risk_level);
  const pnl = positions.reduce((sum, position) => sum + position.unrealized_pnl * position.position_size_ratio, 0);

  return (
    <div
      className={cardClassName}
      role="button"
      tabIndex={0}
      onClick={() => onTraderSelect(trader.trader_id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onTraderSelect(trader.trader_id);
        }
      }}
    >
      <div className="flex min-w-0 items-start gap-3 text-left">
        <SourceAvatar isDarkTheme={isDarkTheme} name={trader.name} url={trader.avatar || null} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className={isDarkTheme ? "truncate text-sm font-black text-slate-50" : "truncate text-sm font-black text-slate-950"}>{trader.name}</div>
            <span className={getRiskBadgeClassName(isDarkTheme, trader.risk_level)}>{formatRiskLevel(trader.risk_level)}</span>
          </div>
          <div className={isDarkTheme ? "mt-1 truncate text-[11px] text-slate-500" : "mt-1 truncate text-[11px] text-slate-500"}>{trader.platform} · {trader.followers.toLocaleString("en-US")} followers</div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <MiniMetric isDarkTheme={isDarkTheme} label="月收益" value={formatSignedPercent(trader.monthly_return)} />
            <MiniMetric isDarkTheme={isDarkTheme} label="胜率" value={formatPercent(trader.win_rate)} />
            <MiniMetric isDarkTheme={isDarkTheme} label="仓位" value={String(positions.length)} />
          </div>
          <div className={isDarkTheme ? "mt-2 text-[11px] font-bold text-slate-400" : "mt-2 text-[11px] font-bold text-slate-600"}>当前组合浮盈亏 {formatSignedPercent(pnl)}</div>
        </div>
        <button
          className={isPinned ? getPinnedButtonClassName(isDarkTheme, true) : getPinnedButtonClassName(isDarkTheme, false)}
          type="button"
          aria-label={isPinned ? `取消重点关注 ${trader.name}` : `重点关注 ${trader.name}`}
          onClick={(event) => {
            event.stopPropagation();
            onPinnedToggle(trader.trader_id);
          }}
        >
          {isPinned ? "★" : "☆"}
        </button>
      </div>
    </div>
  );
}

function MiniMetric({ isDarkTheme, label, value }: { isDarkTheme: boolean; label: string; value: string }) {
  return (
    <div className={isDarkTheme ? "rounded-xl bg-slate-900 px-2 py-1.5" : "rounded-xl bg-slate-50 px-2 py-1.5"}>
      <div className={isDarkTheme ? "text-[9px] font-semibold text-slate-500" : "text-[9px] font-semibold text-slate-400"}>{label}</div>
      <div className={isDarkTheme ? "mt-0.5 truncate text-[11px] font-black text-slate-100" : "mt-0.5 truncate text-[11px] font-black text-slate-900"}>{value}</div>
    </div>
  );
}

function TraderDetail({
  activeEvent,
  eventFilter,
  events,
  isDarkTheme,
  positions,
  selectedTrader,
  onEventFilterChange,
  onEventSelect,
  onSymbolSelect,
}: {
  activeEvent: CopyTradingEvent | null;
  eventFilter: string;
  events: readonly CopyTradingEvent[];
  isDarkTheme: boolean;
  positions: readonly CopyTradingPosition[];
  selectedTrader: CopyTradingTrader;
  onEventFilterChange: (eventType: string) => void;
  onEventSelect: (event: CopyTradingEvent) => void;
  onSymbolSelect: (symbol: string) => void;
}) {
  const sectionClassName = isDarkTheme ? "rounded-2xl border border-slate-800 bg-slate-950 p-3" : "rounded-2xl border border-slate-200 bg-white p-3";

  return (
    <section className={sectionClassName}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={isDarkTheme ? "text-xs font-black text-slate-100" : "text-xs font-black text-slate-900"}>{selectedTrader.name} 当前在做什么</div>
          <p className={isDarkTheme ? "mt-1 text-[11px] leading-4 text-slate-500" : "mt-1 text-[11px] leading-4 text-slate-500"}>点击事件会切换图表币种，并定位到对应时间点。</p>
        </div>
        <select
          className={isDarkTheme ? "h-8 rounded-xl border border-slate-700 bg-slate-900 px-2 text-[11px] font-bold text-slate-200 outline-none" : "h-8 rounded-xl border border-slate-200 bg-slate-50 px-2 text-[11px] font-bold text-slate-700 outline-none"}
          value={eventFilter}
          onChange={(event) => onEventFilterChange(event.target.value)}
        >
          <option value={ALL_EVENT_FILTER}>{ALL_EVENT_FILTER}</option>
          {getCopyTradingRequiredEventTypes().map((eventType) => (
            <option key={eventType} value={eventType}>{formatCopyTradingEventType(eventType)}</option>
          ))}
        </select>
      </div>

      <div className="mt-3 grid gap-2">
        {positions.length > 0 ? positions.map((position) => (
          <PositionRow key={position.position_id} isDarkTheme={isDarkTheme} position={position} onSymbolSelect={onSymbolSelect} />
        )) : <EmptyState isDarkTheme={isDarkTheme} label={`${selectedTrader.name} 当前没有持仓。`} />}
      </div>

      <div className="mt-4 grid gap-2">
        {events.length > 0 ? events.map((event) => (
          <EventRow
            key={event.event_id}
            event={event}
            isActive={event.event_id === activeEvent?.event_id}
            isDarkTheme={isDarkTheme}
            onEventSelect={onEventSelect}
          />
        )) : <EmptyState isDarkTheme={isDarkTheme} label="当前筛选条件下没有事件。" />}
      </div>
    </section>
  );
}

function PositionRow({ isDarkTheme, position, onSymbolSelect }: { isDarkTheme: boolean; position: CopyTradingPosition; onSymbolSelect: (symbol: string) => void }) {
  const rowClassName = isDarkTheme ? "rounded-2xl border border-slate-800 bg-slate-900 p-3" : "rounded-2xl border border-slate-100 bg-slate-50 p-3";
  const directionClassName = position.direction === "long"
    ? isDarkTheme ? "rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-300" : "rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700"
    : isDarkTheme ? "rounded-full bg-rose-500/15 px-2 py-1 text-[10px] font-black text-rose-300" : "rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700";

  return (
    <button className={rowClassName} type="button" onClick={() => onSymbolSelect(position.symbol)}>
      <div className="flex items-center justify-between gap-3 text-left">
        <div>
          <div className={isDarkTheme ? "text-sm font-black text-slate-50" : "text-sm font-black text-slate-950"}>{position.symbol}</div>
          <div className={isDarkTheme ? "mt-1 text-[11px] text-slate-500" : "mt-1 text-[11px] text-slate-500"}>入场 {formatPrice(position.entry_price)} · 当前 {formatPrice(position.current_price)}</div>
        </div>
        <div className="text-right">
          <span className={directionClassName}>{position.direction === "long" ? "多" : "空"} {position.leverage}x</span>
          <div className={getPnlTextClassName(isDarkTheme, position.unrealized_pnl)}>{formatSignedPercent(position.unrealized_pnl)}</div>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/70">
        <div className={position.position_size_ratio >= 0.35 ? "h-full rounded-full bg-rose-500" : "h-full rounded-full bg-cyan-500"} style={{ width: `${Math.max(4, Math.min(100, position.position_size_ratio * 100))}%` }} />
      </div>
      <div className={isDarkTheme ? "mt-1 text-[10px] text-slate-500" : "mt-1 text-[10px] text-slate-400"}>仓位占比 {formatPercent(position.position_size_ratio)} · {formatDisplayTime(position.open_time)}</div>
    </button>
  );
}

function EventRow({ event, isActive, isDarkTheme, onEventSelect }: { event: CopyTradingEvent; isActive: boolean; isDarkTheme: boolean; onEventSelect: (event: CopyTradingEvent) => void }) {
  const rowClassName = getEventRowClassName(isDarkTheme, isActive, event.severity);
  return (
    <button className={rowClassName} type="button" onClick={() => onEventSelect(event)}>
      <div className="flex items-start justify-between gap-3 text-left">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={getEventTypeChipClassName(isDarkTheme, event.event_type)}>{formatCopyTradingEventType(event.event_type)}</span>
            <span className={isDarkTheme ? "text-[11px] font-bold text-slate-500" : "text-[11px] font-bold text-slate-400"}>{formatDisplayTime(event.occurred_at)}</span>
          </div>
          <div className={isDarkTheme ? "mt-2 text-sm font-black text-slate-50" : "mt-2 text-sm font-black text-slate-950"}>{event.title}</div>
          <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-600"}>{event.summary}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className={isDarkTheme ? "text-xs font-black text-slate-100" : "text-xs font-black text-slate-900"}>{event.symbol}</div>
          <div className={getPnlTextClassName(isDarkTheme, event.pnl_after ?? 0)}>{event.pnl_after === null ? "--" : formatSignedPercent(event.pnl_after)}</div>
        </div>
      </div>
    </button>
  );
}

function EquityEtfSection({ isDarkTheme, signals }: { isDarkTheme: boolean; signals: readonly EquityEtfSignal[] }) {
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

function EquityEtfSignalCard({ isDarkTheme, signal }: { isDarkTheme: boolean; signal: EquityEtfSignal }) {
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

function EmptyState({ isDarkTheme, label }: { isDarkTheme: boolean; label: string }) {
  return (
    <div className={isDarkTheme ? "rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-4 text-xs leading-5 text-slate-500" : "rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500"}>
      {label}
    </div>
  );
}

function groupPositionsByTrader(positions: readonly CopyTradingPosition[]): Map<string, CopyTradingPosition[]> {
  const map = new Map<string, CopyTradingPosition[]>();
  for (const position of positions) {
    const traderPositions = map.get(position.trader_id) ?? [];
    traderPositions.push(position);
    map.set(position.trader_id, traderPositions);
  }
  return map;
}

function groupEventsByTrader(events: readonly CopyTradingEvent[]): Map<string, CopyTradingEvent[]> {
  const map = new Map<string, CopyTradingEvent[]>();
  for (const event of events) {
    const traderEvents = map.get(event.trader_id) ?? [];
    traderEvents.push(event);
    map.set(event.trader_id, traderEvents);
  }
  for (const traderEvents of map.values()) {
    traderEvents.sort((left, right) => Date.parse(right.occurred_at) - Date.parse(left.occurred_at));
  }
  return map;
}

function getTraderCardClassName(isDarkTheme: boolean, isActive: boolean, riskLevel: CopyTradingRiskLevel): string {
  const baseClassName = "w-full cursor-pointer rounded-2xl border p-3 text-left shadow-sm transition";
  const activeClassName = isActive ? " ring-2 ring-cyan-400/65" : "";
  if (riskLevel === "high") {
    return isDarkTheme
      ? `${baseClassName} border-rose-900/70 bg-rose-950/24 hover:border-rose-700${activeClassName}`
      : `${baseClassName} border-rose-200 bg-rose-50/70 hover:border-rose-300${activeClassName}`;
  }

  return isDarkTheme
    ? `${baseClassName} border-slate-800 bg-slate-900 hover:border-slate-700${activeClassName}`
    : `${baseClassName} border-slate-100 bg-slate-50 hover:border-slate-200${activeClassName}`;
}

function getPinnedButtonClassName(isDarkTheme: boolean, isPinned: boolean): string {
  if (isPinned) {
    return isDarkTheme ? "shrink-0 rounded-full bg-amber-500/15 px-2 py-1 text-sm font-black text-amber-300" : "shrink-0 rounded-full bg-amber-50 px-2 py-1 text-sm font-black text-amber-700";
  }

  return isDarkTheme ? "shrink-0 rounded-full bg-slate-800 px-2 py-1 text-sm font-black text-slate-500" : "shrink-0 rounded-full bg-white px-2 py-1 text-sm font-black text-slate-400";
}

function getRiskBadgeClassName(isDarkTheme: boolean, riskLevel: CopyTradingRiskLevel): string {
  if (riskLevel === "high") {
    return isDarkTheme ? "rounded-full bg-rose-500/15 px-2 py-1 text-[10px] font-black text-rose-300" : "rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700";
  }

  if (riskLevel === "medium") {
    return isDarkTheme ? "rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-black text-amber-300" : "rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700";
  }

  return isDarkTheme ? "rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-300" : "rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700";
}

function getStatusBadgeClass(isDarkTheme: boolean, tone: "positive" | "warning"): string {
  if (tone === "positive") {
    return isDarkTheme ? "shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-300" : "shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700";
  }

  return isDarkTheme ? "shrink-0 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-black text-amber-300" : "shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700";
}

function getDirectionBadgeClassName(isDarkTheme: boolean, direction: CopyTradingDirection): string {
  if (direction === "long") {
    return isDarkTheme ? "rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-300" : "rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700";
  }

  return isDarkTheme ? "rounded-full bg-rose-500/15 px-2 py-1 text-[10px] font-black text-rose-300" : "rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700";
}

function getEventTypeChipClassName(isDarkTheme: boolean, eventType: CopyTradingEventType): string {
  if (["stop_loss", "oversized_position", "losing_streak", "reverse"].includes(eventType)) {
    return isDarkTheme ? "rounded-full bg-rose-500/15 px-2 py-1 text-[10px] font-black text-rose-300" : "rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700";
  }

  if (["open", "add", "take_profit"].includes(eventType)) {
    return isDarkTheme ? "rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-300" : "rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700";
  }

  return isDarkTheme ? "rounded-full bg-cyan-500/15 px-2 py-1 text-[10px] font-black text-cyan-300" : "rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-black text-cyan-700";
}

function getEventRowClassName(isDarkTheme: boolean, isActive: boolean, riskLevel: CopyTradingRiskLevel): string {
  const baseClassName = "w-full rounded-2xl border p-3 text-left shadow-sm transition";
  const activeClassName = isActive ? " ring-2 ring-cyan-400/65" : "";
  if (riskLevel === "high") {
    return isDarkTheme
      ? `${baseClassName} border-rose-900/70 bg-rose-950/24 hover:border-rose-700${activeClassName}`
      : `${baseClassName} border-rose-200 bg-rose-50/70 hover:border-rose-300${activeClassName}`;
  }

  return isDarkTheme
    ? `${baseClassName} border-slate-800 bg-slate-900 hover:border-slate-700${activeClassName}`
    : `${baseClassName} border-slate-100 bg-slate-50 hover:border-slate-200${activeClassName}`;
}

function getPnlTextClassName(isDarkTheme: boolean, pnl: number): string {
  if (pnl >= 0) {
    return isDarkTheme ? "mt-1 text-xs font-black text-emerald-300" : "mt-1 text-xs font-black text-emerald-700";
  }

  return isDarkTheme ? "mt-1 text-xs font-black text-rose-300" : "mt-1 text-xs font-black text-rose-700";
}

function getEquityStatusBadgeClassName(isDarkTheme: boolean, status: EquityEtfSignalStatus): string {
  if (status === "active") {
    return isDarkTheme ? "rounded-full bg-cyan-500/15 px-2 py-1 text-[10px] font-black text-cyan-300" : "rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-black text-cyan-700";
  }

  if (status === "cooldown" || status === "invalidated") {
    return isDarkTheme ? "rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-black text-amber-300" : "rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700";
  }

  return isDarkTheme ? "rounded-full bg-slate-800 px-2 py-1 text-[10px] font-black text-slate-400" : "rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500";
}

function formatRiskLevel(riskLevel: CopyTradingRiskLevel): string {
  if (riskLevel === "high") return "高风险";
  if (riskLevel === "medium") return "中风险";
  return "低风险";
}

function formatEquityStatus(status: EquityEtfSignalStatus): string {
  if (status === "active") return "生效中";
  if (status === "cooldown") return "冷却";
  if (status === "invalidated") return "失效";
  return "观察中";
}

function formatPrice(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: Math.abs(value) >= 1000 ? 1 : 4 });
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPercent(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatPercent(Math.abs(value))}`;
}

function formatDisplayTime(value: string): string {
  return value.replace("T", " ").slice(0, 16);
}
