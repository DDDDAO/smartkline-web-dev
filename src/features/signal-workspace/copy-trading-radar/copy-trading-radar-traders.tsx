import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  formatCopyTradingEventType,
  getCopyTradingRequiredEventTypes,
} from "@/lib/copy-trading-radar-api";
import type {
  CopyTradingEvent,
  CopyTradingEventType,
  CopyTradingPosition,
  CopyTradingTrader,
} from "@/types/copy-trading";
import { SourceAvatar } from "../card-ui";
import { EmptyState } from "./copy-trading-radar-shell";
import {
  ALL_EVENT_FILTER,
  formatCurrency,
  formatDisplayTime,
  formatPercent,
  formatPrice,
  formatQuantity,
  formatSignedPercent,
  formatSourceStatus,
  getEventRowClassName,
  getEventTypeChipClassName,
  getPinnedButtonClassName,
  getPnlTextClassName,
  getRiskBadgeClassName,
  getTraderCardClassName,
  formatRiskLevel,
} from "./copy-trading-radar-utils";

export function MonitoredEventTypes({ eventTypes, isDarkTheme }: { eventTypes: readonly CopyTradingEventType[]; isDarkTheme: boolean }) {
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

export function PinnedTraderSection({
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

export function TraderStrip({
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

export function TraderCard({
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
  const cardClassName = `${getTraderCardClassName(isDarkTheme, isActive, trader.risk_level)} cursor-default`;
  const selectButtonClassName = "h-auto min-w-0 flex-1 items-start justify-start whitespace-normal bg-transparent p-0 text-left hover:bg-transparent";
  const pnl = positions.reduce((sum, position) => sum + position.unrealized_pnl * position.position_size_ratio, 0);

  return (
    <div className={cardClassName}>
      <div className="flex min-w-0 items-start gap-3">
        <Button
          className={selectButtonClassName}
          type="button"
          variant="ghost"
          onClick={() => onTraderSelect(trader.trader_id)}
        >
          <div className="flex min-w-0 flex-1 items-start gap-3 text-left">
            <SourceAvatar isDarkTheme={isDarkTheme} name={trader.name} url={trader.avatar || null} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div className={isDarkTheme ? "truncate text-sm font-black text-slate-50" : "truncate text-sm font-black text-slate-950"}>{trader.name}</div>
                <span className={getRiskBadgeClassName(isDarkTheme, trader.risk_level)}>{formatRiskLevel(trader.risk_level)}</span>
              </div>
              <div className={isDarkTheme ? "mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500" : "mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500"}>
                <span>{trader.platform}</span>
                <span>·</span>
                <span>{formatSourceStatus(trader.status)}</span>
                <span>·</span>
                <span>保证金 {formatCurrency(trader.margin_balance)}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <MiniMetric isDarkTheme={isDarkTheme} label="浮盈亏率" value={formatSignedPercent(trader.monthly_return)} />
                <MiniMetric isDarkTheme={isDarkTheme} label="胜率" value={formatPercent(trader.win_rate)} />
                <MiniMetric isDarkTheme={isDarkTheme} label="仓位" value={String(positions.length)} />
              </div>
              <div className={isDarkTheme ? "mt-2 text-[11px] font-bold text-slate-400" : "mt-2 text-[11px] font-bold text-slate-600"}>
                当前组合浮盈亏 {formatSignedPercent(pnl)}
                {trader.positions_synced_at ? ` · 同步 ${formatDisplayTime(trader.positions_synced_at)}` : ""}
              </div>
            </div>
          </div>
        </Button>
        <Button
          className={isPinned ? getPinnedButtonClassName(isDarkTheme, true) : getPinnedButtonClassName(isDarkTheme, false)}
          size="sm"
          type="button"
          variant="ghost"
          aria-label={isPinned ? `取消重点关注 ${trader.name}` : `重点关注 ${trader.name}`}
          onClick={() => onPinnedToggle(trader.trader_id)}
        >
          {isPinned ? "★" : "☆"}
        </Button>
      </div>
    </div>
  );
}

export function MiniMetric({ isDarkTheme, label, value }: { isDarkTheme: boolean; label: string; value: string }) {
  return (
    <div className={isDarkTheme ? "rounded-xl bg-slate-900 px-2 py-1.5" : "rounded-xl bg-slate-50 px-2 py-1.5"}>
      <div className={isDarkTheme ? "text-[9px] font-semibold text-slate-500" : "text-[9px] font-semibold text-slate-400"}>{label}</div>
      <div className={isDarkTheme ? "mt-0.5 truncate text-[11px] font-black text-slate-100" : "mt-0.5 truncate text-[11px] font-black text-slate-900"}>{value}</div>
    </div>
  );
}

export function TraderDetail({
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
  const selectTriggerClassName = isDarkTheme
    ? "h-8 w-[132px] rounded-xl border-slate-700 bg-slate-900 px-2 text-[11px] font-bold text-slate-200 focus:ring-cyan-400/10"
    : "h-8 w-[132px] rounded-xl border-slate-200 bg-slate-50 px-2 text-[11px] font-bold text-slate-700 focus:ring-cyan-400/10";
  const selectContentClassName = isDarkTheme
    ? "z-[130] rounded-xl border border-slate-700 bg-slate-900 p-1 text-slate-200"
    : "z-[130] rounded-xl border border-slate-200 bg-white p-1 text-slate-700";

  return (
    <section className={sectionClassName}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={isDarkTheme ? "text-xs font-black text-slate-100" : "text-xs font-black text-slate-900"}>{selectedTrader.name} 当前在做什么</div>
          <p className={isDarkTheme ? "mt-1 text-[11px] leading-4 text-slate-500" : "mt-1 text-[11px] leading-4 text-slate-500"}>点击事件会切换图表币种，并定位到对应时间点。</p>
        </div>
        <Select
          value={eventFilter}
          onValueChange={onEventFilterChange}
        >
          <SelectTrigger className={selectTriggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={selectContentClassName} position="popper" sideOffset={8}>
            <SelectItem className="rounded-lg text-[11px] font-bold" value={ALL_EVENT_FILTER}>{ALL_EVENT_FILTER}</SelectItem>
            {getCopyTradingRequiredEventTypes().map((eventType) => (
              <SelectItem key={eventType} className="rounded-lg text-[11px] font-bold" value={eventType}>{formatCopyTradingEventType(eventType)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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

export function PositionRow({ isDarkTheme, position, onSymbolSelect }: { isDarkTheme: boolean; position: CopyTradingPosition; onSymbolSelect: (symbol: string) => void }) {
  const rowClassName = isDarkTheme ? "h-auto w-full flex-col items-stretch justify-start gap-0 whitespace-normal rounded-2xl border border-slate-800 bg-slate-900 p-3" : "h-auto w-full flex-col items-stretch justify-start gap-0 whitespace-normal rounded-2xl border border-slate-100 bg-slate-50 p-3";
  const directionClassName = position.direction === "long"
    ? isDarkTheme ? "rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-300" : "rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700"
    : isDarkTheme ? "rounded-full bg-rose-500/15 px-2 py-1 text-[10px] font-black text-rose-300" : "rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700";

  return (
    <Button className={rowClassName} type="button" variant="ghost" onClick={() => onSymbolSelect(position.symbol)}>
      <div className="flex items-center justify-between gap-3 text-left">
        <div>
          <div className={isDarkTheme ? "text-sm font-black text-slate-50" : "text-sm font-black text-slate-950"}>{position.symbol}</div>
          <div className={isDarkTheme ? "mt-1 text-[11px] text-slate-500" : "mt-1 text-[11px] text-slate-500"}>入场 {formatPrice(position.entry_price)} · 当前 {formatPrice(position.current_price)}</div>
          <div className={isDarkTheme ? "mt-1 text-[10px] font-bold text-slate-500" : "mt-1 text-[10px] font-bold text-slate-400"}>
            数量 {formatQuantity(position.quantity)} · 名义 {formatCurrency(position.notional_value)}
          </div>
        </div>
        <div className="text-right">
          <span className={directionClassName}>{position.direction === "long" ? "多" : "空"} {position.leverage}x</span>
          <div className={getPnlTextClassName(isDarkTheme, position.unrealized_pnl)}>{formatSignedPercent(position.unrealized_pnl)}</div>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/70">
        <div className={position.position_size_ratio >= 0.35 ? "h-full rounded-full bg-rose-500" : "h-full rounded-full bg-cyan-500"} style={{ width: `${Math.max(4, Math.min(100, position.position_size_ratio * 100))}%` }} />
      </div>
      <div className={isDarkTheme ? "mt-1 text-[10px] text-slate-500" : "mt-1 text-[10px] text-slate-400"}>
        仓位占比 {formatPercent(position.position_size_ratio)}
        {position.margin_snapshot ? ` · 保证金 ${formatCurrency(position.margin_snapshot)}` : ""}
        {" · "}
        {formatDisplayTime(position.open_time)}
      </div>
    </Button>
  );
}

export function EventRow({ event, isActive, isDarkTheme, onEventSelect }: { event: CopyTradingEvent; isActive: boolean; isDarkTheme: boolean; onEventSelect: (event: CopyTradingEvent) => void }) {
  const rowClassName = `${getEventRowClassName(isDarkTheme, isActive, event.severity)} h-auto flex-col items-stretch justify-start gap-0 whitespace-normal`;
  return (
    <Button className={rowClassName} type="button" variant="ghost" onClick={() => onEventSelect(event)}>
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
    </Button>
  );
}
