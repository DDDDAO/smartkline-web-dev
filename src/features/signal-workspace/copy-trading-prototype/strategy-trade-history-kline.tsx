"use client";

import dynamic from "next/dynamic";
import * as SelectPrimitive from "@radix-ui/react-select";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { getWorkspaceLanguageFromLocale, type WorkspaceCopy } from "@/i18n/workspace";
import { intervals } from "@/lib/demo-data";
import { fetchHistoricalCandles, prependHistoricalCandles } from "@/lib/binance-market-data";
import { toCopyTradingMarketSymbol } from "@/lib/copy-trading-radar-api";
import type { TelegramSessionUser } from "@/lib/auth/telegram-auth";
import type { KlineChartProps } from "@/components/charts/kline-chart";
import type { ChartTimeFocusRequest } from "@/components/charts/kline-chart/types";
import type { CopyTradingTradeMarker } from "@/types/copy-trading";
import type { KlineInterval, MarketCandle, MarketSymbol } from "@/types/market";
import { EMPTY_MARKET_CANDLES, EMPTY_STRUCTURED_SIGNALS, KLINE_INTERVAL_MS_BY_INTERVAL, TRADE_HISTORY_KLINE_CANDLE_LIMIT } from "./constants";
import { formatDetailDate, formatDetailNumber } from "./formatters";
import type { PrototypeStrategy } from "./types";
import type { TradeHistoryRow, TradeHistorySymbolOption } from "./strategy-detail-shared";

const KlineChart = dynamic<KlineChartProps>(() => import("@/components/charts/kline-chart").then((module) => module.KlineChart), { loading: () => null });

export function TradeHistoryKlinePanel({
  copy,
  interval,
  isDarkTheme,
  row,
  rows,
  strategy,
  telegramUser,
  onIntervalChange,
}: {
  copy: WorkspaceCopy;
  interval: KlineInterval;
  isDarkTheme: boolean;
  row: TradeHistoryRow;
  rows: readonly TradeHistoryRow[];
  strategy: PrototypeStrategy;
  telegramUser: TelegramSessionUser | null;
  onIntervalChange: (interval: KlineInterval) => void;
}) {
  const [candleState, setCandleState] = useState<{
    canLoadOlderHistory: boolean;
    candles: readonly MarketCandle[];
    error: string;
    key: string;
  }>({
    canLoadOlderHistory: false,
    candles: EMPTY_MARKET_CANDLES,
    error: "",
    key: "",
  });
  const [isLoadingOlderHistory, setIsLoadingOlderHistory] = useState(false);
  const rowSymbol = toCopyTradingMarketSymbol(row.symbol);
  const [selectedSymbol, setSelectedSymbol] = useState<MarketSymbol>(rowSymbol);
  const symbolOptions = useMemo(() => createTradeHistorySymbolOptions(rows), [rows]);
  const selectedSymbolOption = symbolOptions.find((option) => option.symbol === selectedSymbol) ?? null;
  const symbol = selectedSymbolOption?.symbol ?? symbolOptions[0]?.symbol ?? rowSymbol;
  const anchorRow = rowSymbol === symbol ? row : findTradeHistoryRowForSymbol(rows, symbol) ?? row;
  const chartKey = `${anchorRow.id}:${symbol}:${interval}`;
  const candles = candleState.key === chartKey ? candleState.candles : EMPTY_MARKET_CANDLES;
  const canLoadOlderHistory = candleState.key === chartKey ? candleState.canLoadOlderHistory : false;
  const loadError = candleState.key === chartKey ? candleState.error : "";
  const language = getWorkspaceLanguageFromLocale(useLocale());

  useEffect(() => {
    setSelectedSymbol(rowSymbol);
  }, [rowSymbol]);

  const tradeMarkers = useMemo(
    () => createTradeHistoryTradeMarkers({
      rows,
      selectedSymbol: symbol,
      strategy,
      strategyCopy: copy.workspace.accountCenter.strategy,
      telegramUser,
    }),
    [copy.workspace.accountCenter.strategy, rows, strategy, symbol, telegramUser],
  );
  const focusTimeRequest = useMemo<ChartTimeFocusRequest | null>(() => {
    const sourceTimeMs = Date.parse(anchorRow.timestamp);
    if (!Number.isFinite(sourceTimeMs)) {
      return null;
    }

    return {
      key: `copy-strategy-row:${anchorRow.id}:${symbol}:${interval}:${sourceTimeMs}`,
      sourceTimeMs,
    };
  }, [anchorRow.id, anchorRow.timestamp, interval, symbol]);

  useEffect(() => {
    let isActive = true;
    const abortController = new AbortController();
    const sourceTimeMs = Date.parse(anchorRow.timestamp);
    const requestKey = chartKey;

    fetchHistoricalCandles(symbol, interval, {
      limit: TRADE_HISTORY_KLINE_CANDLE_LIMIT,
      signal: abortController.signal,
      untilMs: resolveInitialTradeHistoryKlineUntilMs(sourceTimeMs, interval),
    })
      .then((historicalCandles) => {
        if (!isActive) {
          return;
        }

        setCandleState({
          canLoadOlderHistory: historicalCandles.length >= TRADE_HISTORY_KLINE_CANDLE_LIMIT,
          candles: historicalCandles,
          error: "",
          key: requestKey,
        });
      })
      .catch((error: unknown) => {
        if (isActive && !isAbortError(error)) {
          setCandleState({
            canLoadOlderHistory: false,
            candles: EMPTY_MARKET_CANDLES,
            error: error instanceof Error ? error.message : String(error),
            key: requestKey,
          });
        }
      });

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [anchorRow.timestamp, chartKey, interval, symbol]);

  const loadOlderHistory = useCallback(async () => {
    if (isLoadingOlderHistory || !canLoadOlderHistory) {
      return;
    }

    const oldestCandle = candles.at(0);
    if (!oldestCandle) {
      return;
    }

    setIsLoadingOlderHistory(true);
    try {
      const olderCandles = await fetchHistoricalCandles(symbol, interval, {
        limit: TRADE_HISTORY_KLINE_CANDLE_LIMIT,
        untilMs: oldestCandle.sourceTimeMs,
      });
      setCandleState((currentState) => {
        if (currentState.key !== chartKey) {
          return currentState;
        }

        return {
          canLoadOlderHistory: olderCandles.length >= TRADE_HISTORY_KLINE_CANDLE_LIMIT,
          candles: prependHistoricalCandles(currentState.candles, olderCandles),
          error: "",
          key: chartKey,
        };
      });
    } catch (error: unknown) {
      setCandleState((currentState) => currentState.key === chartKey
        ? {
          ...currentState,
          error: error instanceof Error ? error.message : String(error),
        }
        : currentState);
    } finally {
      setIsLoadingOlderHistory(false);
    }
  }, [canLoadOlderHistory, candles, chartKey, interval, isLoadingOlderHistory, symbol]);

  return (
    <div className={isDarkTheme ? "mt-3 overflow-hidden rounded-3xl border border-white/[0.075] bg-[#181A20]" : "mt-3 overflow-hidden rounded-3xl border border-[#DDE8F0] bg-white"}>
      <div className={isDarkTheme ? "flex flex-col gap-3 border-b border-white/[0.075] bg-white/[0.035] px-4 py-3 sm:flex-row sm:items-center sm:justify-between" : "flex flex-col gap-3 border-b border-[#E5EAF0] bg-[#F8FAFC] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TradeHistoryKlineSymbolSelect
              isDarkTheme={isDarkTheme}
              options={symbolOptions}
              value={symbol}
              onChange={setSelectedSymbol}
            />
            <div className="text-sm font-black">{copy.workspace.accountCenter.strategy.tradeHistoryKlineTitle}</div>
          </div>
          <div className={isDarkTheme ? "mt-1 text-xs font-bold text-slate-500" : "mt-1 text-xs font-bold text-slate-500"}>
            {symbol} · {formatDetailDate(anchorRow.timestamp)}
          </div>
        </div>
        <div className={isDarkTheme ? "inline-flex w-max items-center gap-1 rounded-full border border-white/[0.075] bg-white/[0.035] p-0.5" : "inline-flex w-max items-center gap-1 rounded-full border border-[#E5EAF0] bg-white p-0.5"}>
          {intervals.map((item) => (
            <button
              key={item}
              className={item === interval ? "h-8 rounded-full bg-[#00A6F4] px-3 text-xs font-bold text-white" : isDarkTheme ? "h-8 rounded-full px-3 text-xs font-bold text-slate-400 transition hover:bg-white/[0.08] hover:text-slate-100" : "h-8 rounded-full px-3 text-xs font-bold text-slate-500 transition hover:bg-[#F1F7FB] hover:text-slate-950"}
              type="button"
              onClick={() => onIntervalChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="relative h-[420px] min-h-[320px]">
        <KlineChart
          activePaperPosition={null}
          activeSignal={null}
          activeSignalDrawingReady={false}
          aiSummary={null}
          candles={candles}
          canLoadOlderHistory={canLoadOlderHistory}
          eventSignals={EMPTY_STRUCTURED_SIGNALS}
          focusSignalRequestKey={null}
          focusTimeRequest={focusTimeRequest}
          interval={interval}
          isLoadingOlderHistory={isLoadingOlderHistory}
          language={language}
          priceColorMode="positiveGreen"
          signalBiasSummary={null}
          theme={isDarkTheme ? "dark" : "light"}
          tradeMarkers={tradeMarkers}
          onEventSignalSelect={() => undefined}
          onFocusSignalRequestHandled={() => undefined}
          onFocusTimeRequestHandled={() => undefined}
          onLoadOlderHistory={loadOlderHistory}
        />
        {candles.length === 0 && !loadError ? (
          <div className={isDarkTheme ? "pointer-events-none absolute inset-0 grid place-items-center bg-[#181A20]/78 text-xs font-bold text-slate-500" : "pointer-events-none absolute inset-0 grid place-items-center bg-white/78 text-xs font-bold text-slate-500"}>
            {copy.paper.loading}
          </div>
        ) : null}
        {loadError ? (
          <div className={isDarkTheme ? "absolute right-4 top-4 z-30 max-w-md rounded-2xl border border-amber-500/20 bg-[#181A20]/94 px-3 py-2 text-xs text-amber-100 shadow-[0_12px_32px_rgba(0,0,0,0.22)] backdrop-blur-xl" : "absolute right-4 top-4 z-30 max-w-md rounded-2xl border border-amber-200 bg-amber-50/95 px-3 py-2 text-xs text-amber-800 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl"}>
            {copy.realtime.errorInline(loadError)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TradeHistoryKlineSymbolSelect({
  isDarkTheme,
  options,
  value,
  onChange,
}: {
  isDarkTheme: boolean;
  options: readonly TradeHistorySymbolOption[];
  value: MarketSymbol;
  onChange: (value: MarketSymbol) => void;
}) {
  const selectedOption = options.find((option) => option.symbol === value) ?? options[0] ?? {
    count: 0,
    label: value,
    symbol: value,
  };
  const triggerClassName = isDarkTheme
    ? "inline-flex h-8 min-w-28 items-center justify-between gap-2 rounded-full border border-white/[0.075] bg-white/[0.055] px-3 text-xs font-black text-slate-100 outline-none transition hover:bg-white/[0.08] focus:border-sky-400/45 focus:ring-2 focus:ring-sky-400/10"
    : "inline-flex h-8 min-w-28 items-center justify-between gap-2 rounded-full border border-[#D5E4EF] bg-white px-3 text-xs font-black text-slate-950 shadow-sm outline-none transition hover:bg-[#F8FAFC] focus:border-[#7DBEFF] focus:ring-2 focus:ring-[#16AFF5]/10";
  const pillClassName = isDarkTheme
    ? "inline-flex h-8 min-w-28 items-center rounded-full border border-white/[0.075] bg-white/[0.055] px-3 text-xs font-black text-slate-100"
    : "inline-flex h-8 min-w-28 items-center rounded-full border border-[#D5E4EF] bg-white px-3 text-xs font-black text-slate-950 shadow-sm";

  if (options.length <= 1) {
    return <span className={pillClassName}>{selectedOption.label}</span>;
  }

  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange}>
      <SelectPrimitive.Trigger aria-label="Trade history symbol" className={triggerClassName}>
        <SelectPrimitive.Value>{selectedOption.label}</SelectPrimitive.Value>
        <SelectPrimitive.Icon asChild>
          <span aria-hidden="true" className={isDarkTheme ? "text-[10px] text-slate-500" : "text-[10px] text-slate-400"}>⌄</span>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={isDarkTheme
            ? "z-[140] max-h-[260px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-white/[0.075] bg-[#111820] p-1 text-slate-100 shadow-[0_18px_44px_rgba(0,0,0,0.38)]"
            : "z-[140] max-h-[260px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-[#D5E4EF] bg-white p-1 text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.14)]"}
          position="popper"
          sideOffset={8}
        >
          <SelectPrimitive.Viewport className="grid gap-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.symbol}
                className={isDarkTheme
                  ? "flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs font-bold outline-none transition data-[highlighted]:bg-white/[0.055] data-[state=checked]:bg-sky-400/10 data-[state=checked]:text-sky-100"
                  : "flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs font-bold outline-none transition data-[highlighted]:bg-[#F8FAFC] data-[state=checked]:bg-[#EAF8FE] data-[state=checked]:text-[#007DB8]"}
                value={option.symbol}
              >
                <SelectPrimitive.ItemText asChild>
                  <span>{option.label}</span>
                </SelectPrimitive.ItemText>
                <span className={isDarkTheme ? "text-[10px] text-slate-500" : "text-[10px] text-slate-400"}>
                  {option.count}
                </span>
                <SelectPrimitive.ItemIndicator className="text-xs font-black">✓</SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

function createTradeHistorySymbolOptions(rows: readonly TradeHistoryRow[]): TradeHistorySymbolOption[] {
  const options = new Map<MarketSymbol, TradeHistorySymbolOption>();
  for (const row of rows) {
    const rawSymbol = row.symbol.trim();
    if (!rawSymbol || rawSymbol === "--") {
      continue;
    }

    const symbol = toCopyTradingMarketSymbol(rawSymbol);
    const existingOption = options.get(symbol);
    if (existingOption) {
      existingOption.count += 1;
      continue;
    }

    options.set(symbol, {
      count: 1,
      label: rawSymbol,
      symbol,
    });
  }
  return Array.from(options.values());
}

function findTradeHistoryRowForSymbol(rows: readonly TradeHistoryRow[], symbol: MarketSymbol): TradeHistoryRow | null {
  return rows.find((row) => toCopyTradingMarketSymbol(row.symbol) === symbol) ?? null;
}

function createTradeHistoryTradeMarkers({
  rows,
  selectedSymbol,
  strategy,
  strategyCopy,
  telegramUser,
}: {
  rows: readonly TradeHistoryRow[];
  selectedSymbol: MarketSymbol;
  strategy: PrototypeStrategy;
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
  telegramUser: TelegramSessionUser | null;
}): CopyTradingTradeMarker[] {
  return rows
    .filter((row) => row.kind === "me" && toCopyTradingMarketSymbol(row.symbol) === selectedSymbol)
    .map((row) => createTradeHistoryTradeMarker(row, strategy, strategyCopy, telegramUser))
    .filter((marker): marker is CopyTradingTradeMarker => marker !== null)
    .sort((left, right) => left.sourceTimeMs - right.sourceTimeMs);
}

function createTradeHistoryTradeMarker(
  row: TradeHistoryRow,
  strategy: PrototypeStrategy,
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"],
  telegramUser: TelegramSessionUser | null,
): CopyTradingTradeMarker | null {
  const sourceTimeMs = Date.parse(row.timestamp);
  if (!Number.isFinite(sourceTimeMs)) {
    return null;
  }

  const price = row.price;
  const side = getTradeHistoryMarkerSide(row);
  const traderName = getTradeHistoryUserMarkerName(telegramUser, strategyCopy.orderSourceMe);
  const actionLabel = strategyCopy.orderSourceMe;
  const priceText = price === null ? null : formatDetailNumber(price);
  const priceSuffix = priceText ? ` @ ${priceText}` : "";

  return {
    actionLabel,
    avatarUrl: telegramUser?.avatarUrl ?? null,
    detail: `${formatDetailDate(row.timestamp)} · ${formatOrderStatus(row.status, strategyCopy)}`,
    direction: side === "buy" ? "long" : "short",
    eventId: row.id,
    eventType: "open",
    id: `copy-strategy-row:${row.id}`,
    occurredAtText: formatDetailDate(row.timestamp),
    price,
    priceText,
    side,
    signalId: `copy-strategy-row:${row.id}`,
    sourceTimeMs,
    symbol: toCopyTradingMarketSymbol(row.symbol),
    title: `${traderName} ${row.symbol}${priceSuffix}`,
    traderId: strategy.traderId,
    traderName,
  };
}

function getTradeHistoryUserMarkerName(user: TelegramSessionUser | null, fallback: string): string {
  const name = user?.name?.trim();
  if (name) {
    return name;
  }

  const username = user?.username?.trim();
  if (username) {
    return username.startsWith("@") ? username : `@${username}`;
  }

  return fallback;
}

function normalizeOrderTradeMarkerSide(value: string | undefined): "buy" | "sell" {
  const normalizedValue = (value ?? "").trim().toUpperCase();
  return normalizedValue.includes("SELL") || normalizedValue.includes("SHORT") ? "sell" : "buy";
}

function getTradeHistoryMarkerSide(row: TradeHistoryRow): "buy" | "sell" {
  if (row.kind === "signalSource") {
    return normalizeOrderTradeMarkerSide(row.signalSourceOrder?.side || row.action);
  }
  return normalizeOrderTradeMarkerSide(row.action);
}

function resolveInitialTradeHistoryKlineUntilMs(sourceTimeMs: number, interval: KlineInterval): number | undefined {
  if (!Number.isFinite(sourceTimeMs)) {
    return undefined;
  }

  return sourceTimeMs + KLINE_INTERVAL_MS_BY_INTERVAL[interval] * 120;
}

export function createOpenEndedPageRangeLabel(pageOffset: number, visibleCount: number): string {
  if (visibleCount <= 0) {
    return "0 / 0";
  }

  return `${pageOffset + 1}-${pageOffset + visibleCount}`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}


function formatOrderStatus(value: string | undefined, strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"]): string {
  const normalizedValue = (value ?? "").toLowerCase();
  if (normalizedValue === "closed" || normalizedValue === "filled") {
    return strategyCopy.orderStatusCompleted;
  }
  return value || "--";
}
