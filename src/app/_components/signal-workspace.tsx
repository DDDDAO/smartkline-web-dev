"use client";

import { useEffect, useMemo, useState } from "react";
import { markets } from "@/app/_lib/demo-data";
import { fetchUsdtPerpetualMarkets } from "@/app/_lib/binance-market-data";
import { createStructuredSignalPositionKey, fetchKolSignals, subscribeToKolSignals } from "@/app/_lib/kol-signal-api";
import { computePaperPositionRecord, type PaperPositionRecord } from "@/app/_lib/paper-position";
import { KolPanel } from "./signal-workspace/kol-panel";
import { RealtimeKlinePanel } from "./signal-workspace/realtime-kline-panel";
import { formatKolSignalSourceError, type KolSignalSourceStatus } from "./signal-workspace/types";
import { usePaperPositionCandles } from "./signal-workspace/use-paper-position-candles";
import type { ChartTheme } from "@/app/_components/kline-chart";
import type { KlineInterval, MarketSymbol } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";

const MAX_VISIBLE_KOL_SIGNALS = 50;
const MOCK_NOTIFICATION_DISMISS_MS = 6_500;

type MockSignalNotification = {
  id: string;
  message: string;
  meta: string;
  title: string;
};

export function SignalWorkspace() {
  const [symbol, setSymbol] = useState<MarketSymbol>("BTC/USDT:USDT");
  const [interval, setInterval] = useState<KlineInterval>("15m");
  const [activeSignalId, setActiveSignalId] = useState("");
  const [theme, setTheme] = useState<ChartTheme>("light");
  const [marketOptions, setMarketOptions] = useState<MarketSymbol[]>(markets);
  const [signals, setSignals] = useState<StructuredSignal[]>([]);
  const [mockSignalNotification, setMockSignalNotification] = useState<MockSignalNotification | null>(null);
  const [kolSignalSourceStatus, setKolSignalSourceStatus] = useState<KolSignalSourceStatus>({
    error: null,
    isLoading: true,
  });

  const activeSignal = signals.find((signal) => signal.id === activeSignalId) ?? signals[0] ?? null;
  const kolSignals = useMemo(() => sortSignalsForKolPanel(signals), [signals]);
  const {
    candlesBySymbol: paperPositionCandlesBySymbol,
    errorsBySymbol: paperPositionErrorsBySymbol,
  } = usePaperPositionCandles(signals);
  const paperPositionsBySignalId = useMemo(() => {
    const recordsBySignalId: Record<string, PaperPositionRecord> = {};

    for (const signal of signals) {
      const candles = paperPositionCandlesBySymbol[signal.symbol];
      if (candles && candles.length > 0) {
        recordsBySignalId[signal.id] = computePaperPositionRecord(signal, candles);
      }
    }

    return recordsBySignalId;
  }, [paperPositionCandlesBySymbol, signals]);
  const isDarkTheme = theme === "dark";
  const pageClassName = isDarkTheme ? "h-screen w-screen overflow-hidden bg-slate-950 text-slate-100" : "h-screen w-screen overflow-hidden bg-[#f5f7fb] text-slate-900";

  useEffect(() => {
    if (!mockSignalNotification) {
      return;
    }

    const timeout = window.setTimeout(() => setMockSignalNotification(null), MOCK_NOTIFICATION_DISMISS_MS);
    return () => window.clearTimeout(timeout);
  }, [mockSignalNotification]);

  useEffect(() => {
    let isActive = true;

    fetchUsdtPerpetualMarkets()
      .then((loadedMarkets) => {
        if (!isActive) {
          return;
        }

        setMarketOptions(loadedMarkets);
        setSymbol((currentSymbol) => loadedMarkets.includes(currentSymbol) ? currentSymbol : loadedMarkets[0]);
      })
      .catch(() => {
        if (isActive) {
          setMarketOptions(markets);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const applyInitialSignals = (loadedSignals: StructuredSignal[]) => {
      if (!isActive) {
        return;
      }

      const sortedSignals = dedupeStructuredSignalsByPosition(loadedSignals);
      setSignals(sortedSignals);
      setKolSignalSourceStatus({ error: null, isLoading: false });
      setActiveSignalId((currentActiveSignalId) => (
        sortedSignals.some((signal) => signal.id === currentActiveSignalId) ? currentActiveSignalId : sortedSignals[0]?.id ?? ""
      ));
    };



    fetchKolSignals()
      .then(applyInitialSignals)
      .catch((error: unknown) => {
        if (isActive) {
          setSignals([]);
          setActiveSignalId("");
          setKolSignalSourceStatus({ error: formatKolSignalSourceError(error), isLoading: false });
        }
      });

    const unsubscribe = subscribeToKolSignals();

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  return (
    <main className={pageClassName}>
      <WorkspaceFloatingActions
        isDarkTheme={isDarkTheme}
        notification={mockSignalNotification}
        onNotificationDismiss={() => setMockSignalNotification(null)}
      />
      <section className="grid h-full min-h-0 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
        <RealtimeKlinePanel
          key={`${symbol}-${interval}`}
          activePaperPosition={activeSignal ? paperPositionsBySignalId[activeSignal.id] ?? null : null}
          activeSignal={activeSignal}
          interval={interval}
          marketOptions={marketOptions}
          symbol={symbol}
          signals={signals}
          theme={theme}
          onIntervalChange={setInterval}
          onSymbolChange={(nextSymbol) => {
            const nextSignal = signals.find((signal) => signal.symbol === nextSymbol);
            setSymbol(nextSymbol);
            setActiveSignalId(nextSignal?.id ?? "");
          }}
          onSignalSelect={(signal) => {
            setActiveSignalId(signal.id);
            setSymbol(signal.symbol);
          }}
          onThemeToggle={() => setTheme((currentTheme) => currentTheme === "light" ? "dark" : "light")}
        />

        <KolPanel
          activeSignal={activeSignal}
          isDarkTheme={isDarkTheme}
          paperPositionErrorsBySymbol={paperPositionErrorsBySymbol}
          paperPositionsBySignalId={paperPositionsBySignalId}
          sourceStatus={kolSignalSourceStatus}
          signals={kolSignals}
          onSignalSelect={(signal) => {
            setActiveSignalId(signal.id);
            setSymbol(signal.symbol);
          }}
        />
      </section>
    </main>
  );
}


function WorkspaceFloatingActions({
  isDarkTheme,
  notification,
  onNotificationDismiss,
}: {
  isDarkTheme: boolean;
  notification: MockSignalNotification | null;
  onNotificationDismiss: () => void;
}) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col items-end gap-3">
      <TelegramCommunityButton isDarkTheme={isDarkTheme} />
      {notification ? (
        <MockSignalNotificationBanner
          isDarkTheme={isDarkTheme}
          notification={notification}
          onDismiss={onNotificationDismiss}
        />
      ) : null}
    </div>
  );
}

function TelegramCommunityButton({ isDarkTheme }: { isDarkTheme: boolean }) {
  const className = isDarkTheme
    ? "pointer-events-auto inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-sky-950/30 transition hover:bg-sky-400"
    : "pointer-events-auto inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-sky-200/70 transition hover:bg-sky-600";

  return (
    <button className={className} type="button">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20" aria-hidden="true">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.7 3.4 18.3 20c-.2 1-1.1 1.3-1.9.8l-5.2-3.9-2.5 2.4c-.3.3-.5.5-1 .5l.4-5.4 9.8-8.9c.4-.4-.1-.6-.7-.2L5.1 13 0 11.4c-1.1-.3-1.1-1.1.2-1.6L20.3 2c.9-.3 1.7.2 1.4 1.4Z" />
        </svg>
      </span>
      社群接入
    </button>
  );
}

function MockSignalNotificationBanner({
  isDarkTheme,
  notification,
  onDismiss,
}: {
  isDarkTheme: boolean;
  notification: MockSignalNotification;
  onDismiss: () => void;
}) {
  const className = isDarkTheme
    ? "pointer-events-auto w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/96 shadow-2xl shadow-black/30 backdrop-blur"
    : "pointer-events-auto w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/96 shadow-2xl shadow-slate-300/50 backdrop-blur";

  return (
    <div className={className} role="status">
      <div className={isDarkTheme ? "border-b border-slate-800 bg-slate-900/80 px-4 py-2" : "border-b border-slate-100 bg-slate-50/90 px-4 py-2"}>
        <div className="flex items-center justify-between gap-3">
          <span className={isDarkTheme ? "text-[11px] font-bold text-cyan-300" : "text-[11px] font-bold text-cyan-700"}>浏览器通知 Mock</span>
          <button
            className={isDarkTheme ? "rounded-full px-2 py-0.5 text-xs text-slate-500 transition hover:bg-slate-800 hover:text-slate-200" : "rounded-full px-2 py-0.5 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"}
            type="button"
            onClick={onDismiss}
          >
            关闭
          </button>
        </div>
      </div>
      <div className="flex gap-3 px-4 py-3">
        <div className={isDarkTheme ? "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cyan-500/15 text-cyan-300" : "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-600"}>
          <span aria-hidden="true">🔔</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className={isDarkTheme ? "truncate text-sm font-bold text-slate-50" : "truncate text-sm font-bold text-slate-950"}>{notification.title}</div>
          <div className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-300" : "mt-1 text-xs leading-5 text-slate-600"}>{notification.message}</div>
          <div className={isDarkTheme ? "mt-2 text-[11px] text-slate-500" : "mt-2 text-[11px] text-slate-400"}>{notification.meta}</div>
        </div>
      </div>
    </div>
  );
}

function dedupeStructuredSignalsByPosition(signals: readonly StructuredSignal[]): StructuredSignal[] {
  const signalsByPositionKey = new Map<string, StructuredSignal>();

  for (const signal of signals) {
    const positionKey = createStructuredSignalPositionKey(signal);
    const currentSignal = signalsByPositionKey.get(positionKey);
    if (!currentSignal || compareStructuredSignalCreatedAt(signal, currentSignal) < 0) {
      signalsByPositionKey.set(positionKey, signal);
    }
  }

  return sortSignalsForKolPanel(Array.from(signalsByPositionKey.values())).slice(0, MAX_VISIBLE_KOL_SIGNALS);
}

function compareStructuredSignalCreatedAt(left: StructuredSignal, right: StructuredSignal): number {
  return getStructuredSignalCreatedAtTimestamp(left) - getStructuredSignalCreatedAtTimestamp(right);
}

function getStructuredSignalCreatedAtTimestamp(signal: StructuredSignal): number {
  const timestamp = Date.parse(signal.created_at);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function sortSignalsForKolPanel(signals: readonly StructuredSignal[]): StructuredSignal[] {
  return signals.slice().sort((left, right) => {
    const strongAlertSort = Number(right.isStrongAlert) - Number(left.isStrongAlert);
    if (strongAlertSort !== 0) {
      return strongAlertSort;
    }

    const createdAtSort = Date.parse(right.created_at) - Date.parse(left.created_at);
    if (Number.isFinite(createdAtSort) && createdAtSort !== 0) {
      return createdAtSort;
    }

    return right.id.localeCompare(left.id);
  });
}
