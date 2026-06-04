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

export function SignalWorkspace() {
  const [symbol, setSymbol] = useState<MarketSymbol>("BTC/USDT:USDT");
  const [interval, setInterval] = useState<KlineInterval>("15m");
  const [activeSignalId, setActiveSignalId] = useState("");
  const [theme, setTheme] = useState<ChartTheme>("light");
  const [marketOptions, setMarketOptions] = useState<MarketSymbol[]>(markets);
  const [signals, setSignals] = useState<StructuredSignal[]>([]);
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

    const applyIncomingSignals = (incomingSignals: StructuredSignal[]) => {
      if (!isActive || incomingSignals.length === 0) {
        return;
      }

      setSignals((currentSignals) => mergeIncomingSignals(incomingSignals, currentSignals));
      setKolSignalSourceStatus({ error: null, isLoading: false });
      setActiveSignalId((currentActiveSignalId) => currentActiveSignalId || incomingSignals[0]?.id || "");
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

    const unsubscribe = subscribeToKolSignals({
      onSignals: applyIncomingSignals,
      onError: (error) => {
        if (isActive) {
          setKolSignalSourceStatus({ error: formatKolSignalSourceError(error), isLoading: false });
        }
      },
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  return (
    <main className={pageClassName}>
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


function mergeIncomingSignals(
  incomingSignals: readonly StructuredSignal[],
  currentSignals: readonly StructuredSignal[],
): StructuredSignal[] {
  return dedupeStructuredSignalsByPosition([...currentSignals, ...incomingSignals]);
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
