"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { markets } from "@/app/_lib/demo-data";
import { fetchUsdtPerpetualMarkets } from "@/app/_lib/binance-market-data";
import {
  createCopyTradingChartSignals,
  createMarketAlignedMockCopyTradingRadarSnapshot,
  createCopyTradingTradeMarkers,
  createMockCopyTradingRadarSnapshot,
  fetchCopyTradingRadarSnapshot,
  getCopyTradingEventChartSignalId,
  toCopyTradingMarketSymbol,
} from "@/app/_lib/copy-trading-radar-api";
import { createStructuredSignalPositionKey, fetchKolSignals, subscribeToKolSignals } from "@/app/_lib/kol-signal-api";
import { computePaperPositionRecord, type PaperPositionRecord } from "@/app/_lib/paper-position";
import { CopyTradingRadarPanel } from "./signal-workspace/copy-trading-radar-panel";
import { KolPanel } from "./signal-workspace/kol-panel";
import { RealtimeKlinePanel } from "./signal-workspace/realtime-kline-panel";
import { formatKolSignalSourceError, type KolSignalSourceStatus } from "./signal-workspace/types";
import { type PaperPositionMarketCandleUpdate, usePaperPositionCandles } from "./signal-workspace/use-paper-position-candles";
import { createSignalFocusRequestKey, type ChartTheme } from "@/app/_components/kline-chart";
import type { KlineInterval, MarketSymbol } from "@/app/_types/market";
import type { CopyTradingEvent, CopyTradingRadarSnapshot, CopyTradingTradeMarker } from "@/app/_types/copy-trading";
import type { StructuredSignal } from "@/app/_types/signal";

const MAX_VISIBLE_KOL_SIGNALS = 50;
const NOTIFICATION_DISMISS_MS = 6_500;
const INTRO_AUTO_DISMISS_MS = 5_800;
const TELEGRAM_COMMUNITY_URL = process.env.NEXT_PUBLIC_TELEGRAM_GROUP_URL ?? "https://t.me/smartkline";
const EMPTY_COPY_TRADING_TRADE_MARKERS: readonly CopyTradingTradeMarker[] = [];

type WorkspaceLanguage = "zh-CN" | "en-US";
type WorkspaceModule = "kol-signals" | "copy-trading-radar";

type WorkspaceNotification = {
  id: string;
  message: string;
  meta: string;
  title: string;
};

type TelegramAuthUser = {
  avatarUrl?: string;
  id: string;
  name?: string;
  telegramId?: string;
  username?: string;
};

type TelegramAuthStatus = {
  botBinding: "unbound" | "bound";
  communityBinding: "unverified" | "pending" | "joined" | "left" | "kicked";
  isLoggedIn: boolean;
  notificationPermission: "none" | "granted";
  sourceBindingCount: number;
  telegramUser: TelegramAuthUser | null;
};

type TelegramCommunityInviteResponse = {
  communityBinding: TelegramAuthStatus["communityBinding"];
  expiresAt: string | null;
  inviteLink: string | null;
};

const DEFAULT_TELEGRAM_AUTH_STATUS: TelegramAuthStatus = {
  botBinding: "unbound",
  communityBinding: "unverified",
  isLoggedIn: false,
  notificationPermission: "none",
  sourceBindingCount: 0,
  telegramUser: null,
};

export function SignalWorkspace() {
  const [symbol, setSymbol] = useState<MarketSymbol>("BTC/USDT:USDT");
  const [interval, setInterval] = useState<KlineInterval>("15m");
  const [activeWorkspaceModule, setActiveWorkspaceModule] = useState<WorkspaceModule>("kol-signals");
  const [activeSignalId, setActiveSignalId] = useState("");
  const [activeCopyTradingEventId, setActiveCopyTradingEventId] = useState("");
  const [chartFocusSignalRequestKey, setChartFocusSignalRequestKey] = useState<string | null>(null);
  const [theme, setTheme] = useState<ChartTheme>("light");
  const [language, setLanguage] = useState<WorkspaceLanguage>("zh-CN");
  const [authStatus, setAuthStatus] = useState<TelegramAuthStatus>(DEFAULT_TELEGRAM_AUTH_STATUS);
  const [isMyPanelOpen, setIsMyPanelOpen] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [marketOptions, setMarketOptions] = useState<MarketSymbol[]>(markets);
  const [signals, setSignals] = useState<StructuredSignal[]>([]);
  const [copyTradingSnapshot, setCopyTradingSnapshot] = useState<CopyTradingRadarSnapshot>(() => createMockCopyTradingRadarSnapshot());
  const [latestMarketCandleUpdate, setLatestMarketCandleUpdate] = useState<PaperPositionMarketCandleUpdate | null>(null);
  const [workspaceNotification, setWorkspaceNotification] = useState<WorkspaceNotification | null>(null);
  const [kolSignalSourceStatus, setKolSignalSourceStatus] = useState<KolSignalSourceStatus>({
    error: null,
    isLoading: true,
  });
  const [copyTradingSourceStatus, setCopyTradingSourceStatus] = useState<KolSignalSourceStatus>({
    error: null,
    isLoading: true,
  });
  const notifiedCopyTradingEventIdsRef = useRef(new Set<string>());

  const activeKolSignal = signals.find((signal) => signal.id === activeSignalId) ?? signals[0] ?? null;
  const kolSignals = useMemo(() => sortSignalsForKolPanel(signals), [signals]);
  const copyTradingChartSignals = useMemo(() => createCopyTradingChartSignals(copyTradingSnapshot), [copyTradingSnapshot]);
  const copyTradingTradeMarkers = useMemo(() => createCopyTradingTradeMarkers(copyTradingSnapshot), [copyTradingSnapshot]);
  const activeCopyTradingChartSignal = copyTradingChartSignals.find((signal) => signal.id === getCopyTradingEventChartSignalId(activeCopyTradingEventId)) ?? copyTradingChartSignals[0] ?? null;
  const activeCopyTradingEvent = copyTradingSnapshot.events.find((event) => event.event_id === activeCopyTradingEventId) ?? copyTradingSnapshot.events[0] ?? null;
  const isCopyTradingModuleActive = activeWorkspaceModule === "copy-trading-radar";
  const chartSignals = isCopyTradingModuleActive ? copyTradingChartSignals : signals;
  const chartTradeMarkers = isCopyTradingModuleActive ? copyTradingTradeMarkers : EMPTY_COPY_TRADING_TRADE_MARKERS;
  const activeChartSignal = isCopyTradingModuleActive ? activeCopyTradingChartSignal : activeKolSignal;
  const {
    candlesBySymbol: paperPositionCandlesBySymbol,
    errorsBySymbol: paperPositionErrorsBySymbol,
    latestPricesBySymbol: paperPositionLatestPricesBySymbol,
  } = usePaperPositionCandles(signals, latestMarketCandleUpdate);
  const paperPositionsBySignalId = useMemo(() => {
    const recordsBySignalId: Record<string, PaperPositionRecord> = {};

    for (const signal of signals) {
      const candles = paperPositionCandlesBySymbol[signal.symbol];
      if (candles && candles.length > 0) {
        recordsBySignalId[signal.id] = computePaperPositionRecord(signal, candles, {
          currentPriceOverride: paperPositionLatestPricesBySymbol[signal.symbol] ?? null,
        });
      }
    }

    return recordsBySignalId;
  }, [paperPositionCandlesBySymbol, paperPositionLatestPricesBySymbol, signals]);
  const activeChartPaperPosition = !isCopyTradingModuleActive && activeKolSignal ? paperPositionsBySignalId[activeKolSignal.id] ?? null : null;
  const isDarkTheme = theme === "dark";
  const isLoggedIn = authStatus.isLoggedIn;
  const pageClassName = isDarkTheme ? "h-screen w-screen overflow-hidden bg-slate-950 text-slate-100" : "h-screen w-screen overflow-hidden bg-[#f5f7fb] text-slate-900";
  const workspaceGridClassName = isRightPanelCollapsed
    ? "relative grid h-full min-h-0 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)]"
    : "relative grid h-full min-h-0 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]";

  const loadTelegramAuthStatus = useCallback(async (): Promise<TelegramAuthStatus> => {
    const normalizedAuthStatus = await fetchTelegramAuthStatus();
    setAuthStatus(normalizedAuthStatus);
    return normalizedAuthStatus;
  }, []);

  const refreshTelegramCommunityMembership = useCallback(async (): Promise<TelegramAuthStatus> => {
    await fetch("/api/telegram/community/refresh", {
      credentials: "same-origin",
      method: "POST",
    }).catch(() => null);

    return loadTelegramAuthStatus();
  }, [loadTelegramAuthStatus]);

  const handleTelegramLogin = () => {
    if (typeof window === "undefined") {
      return;
    }

    if (authStatus.communityBinding === "joined") {
      openTelegramCommunityLink();
      return;
    }

    if (isLoggedIn) {
      void openPersonalTelegramCommunityInvite(refreshTelegramCommunityMembership, setWorkspaceNotification);
      return;
    }

    const redirectPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const redirectUrl = new URL(redirectPath, window.location.origin);
    redirectUrl.searchParams.set("join_community", "1");
    window.location.assign(`/api/auth/telegram/start?redirect=${encodeURIComponent(`${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`)}`);
  };

  const handleMyPanelToggle = () => {
    if (isLoggedIn) {
      setIsMyPanelOpen((currentValue) => !currentValue);
      return;
    }

    handleTelegramLogin();
  };

  const toggleTheme = () => setTheme((currentTheme) => currentTheme === "light" ? "dark" : "light");

  useEffect(() => {
    let isActive = true;
    const authResult = readTelegramAuthResultFromUrl();
    const shouldJoinCommunity = readShouldJoinCommunityFromUrl();

    fetchTelegramAuthStatus()
      .then((normalizedAuthStatus) => {
        if (!isActive) {
          return;
        }

        setAuthStatus(normalizedAuthStatus);

        if (authResult === "success" && normalizedAuthStatus.isLoggedIn) {
          setIsMyPanelOpen(true);
          setWorkspaceNotification({
            id: "telegram-login",
            title: "Telegram 已验证",
            message: `${formatTelegramDisplayName(normalizedAuthStatus.telegramUser)} 已完成登录验证，可继续绑定社群和 bot。`,
            meta: "K线情报局 · Telegram OIDC",
          });
        } else if (authResult === "error") {
          setWorkspaceNotification({
            id: "telegram-login-error",
            title: "Telegram 登录失败",
            message: "授权回调未通过验证，请重新发起 Telegram 登录。",
            meta: "K线情报局 · Telegram OIDC",
          });
        }

        clearTelegramAuthQueryFromUrl();

        if (
          shouldJoinCommunity
          && normalizedAuthStatus.isLoggedIn
          && normalizedAuthStatus.communityBinding !== "joined"
        ) {
          void openPersonalTelegramCommunityInvite(refreshTelegramCommunityMembership, setWorkspaceNotification);
        }
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setAuthStatus(DEFAULT_TELEGRAM_AUTH_STATUS);
        if (authResult === "error") {
          clearTelegramAuthQueryFromUrl();
        }
      });

    return () => {
      isActive = false;
    };
  }, [refreshTelegramCommunityMembership]);

  useEffect(() => {
    if (!isLoggedIn || authStatus.communityBinding === "joined") {
      return;
    }

    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") {
        void refreshTelegramCommunityMembership();
      }
    };

    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);

    return () => {
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [authStatus.communityBinding, isLoggedIn, refreshTelegramCommunityMembership]);

  useEffect(() => {
    if (!workspaceNotification) {
      return;
    }

    const timeout = window.setTimeout(() => setWorkspaceNotification(null), NOTIFICATION_DISMISS_MS);
    return () => window.clearTimeout(timeout);
  }, [workspaceNotification]);

  useEffect(() => {
    if (!showIntro) {
      return;
    }

    const timeout = window.setTimeout(() => setShowIntro(false), INTRO_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timeout);
  }, [showIntro]);

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

  useEffect(() => {
    let isActive = true;

    fetchCopyTradingRadarSnapshot()
      .then((snapshot) => {
        if (!isActive) {
          return;
        }

        setCopyTradingSnapshot(snapshot);
        setCopyTradingSourceStatus({ error: null, isLoading: false });
        setActiveCopyTradingEventId((currentEventId) => (
          snapshot.events.some((event) => event.event_id === currentEventId) ? currentEventId : snapshot.events[0]?.event_id ?? ""
        ));
      })
      .catch(async (error: unknown) => {
        const fallbackSnapshot = await createMarketAlignedMockCopyTradingRadarSnapshot();
        if (!isActive) {
          return;
        }

        setCopyTradingSnapshot(fallbackSnapshot);
        setCopyTradingSourceStatus({ error: formatKolSignalSourceError(error), isLoading: false });
        setActiveCopyTradingEventId((currentEventId) => (
          fallbackSnapshot.events.some((event) => event.event_id === currentEventId) ? currentEventId : fallbackSnapshot.events[0]?.event_id ?? ""
        ));
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (copyTradingSourceStatus.isLoading) {
      return;
    }

    const latestImportantEvent = copyTradingSnapshot.events.find((event) => event.event_type === "open" || event.event_type === "close" || event.event_type === "reverse");
    if (!latestImportantEvent || notifiedCopyTradingEventIdsRef.current.has(latestImportantEvent.event_id)) {
      return;
    }

    notifiedCopyTradingEventIdsRef.current.add(latestImportantEvent.event_id);
    setWorkspaceNotification({
      id: `copy-radar-${latestImportantEvent.event_id}`,
      title: "带单雷达事件提醒",
      message: latestImportantEvent.title,
      meta: `${latestImportantEvent.symbol} · ${latestImportantEvent.occurred_at.replace("T", " ").slice(0, 16)}`,
    });
  }, [copyTradingSnapshot.events, copyTradingSourceStatus.isLoading]);

  const handleCopyTradingEventSelect = (event: CopyTradingEvent) => {
    const nextSymbol = toCopyTradingMarketSymbol(event.symbol);
    const nextSignal = copyTradingChartSignals.find((signal) => signal.id === getCopyTradingEventChartSignalId(event.event_id)) ?? null;
    if (nextSignal && nextSymbol !== symbol) {
      setChartFocusSignalRequestKey(createSignalFocusRequestKey(nextSignal));
    }

    setActiveCopyTradingEventId(event.event_id);
    setSymbol(nextSymbol);
    setWorkspaceNotification({
      id: `copy-radar-focus-${event.event_id}`,
      title: "图表已定位带单事件",
      message: event.title,
      meta: `${event.symbol} · ${event.occurred_at.replace("T", " ").slice(0, 16)}`,
    });
  };

  const handleWorkspaceModuleChange = (nextModule: WorkspaceModule) => {
    setActiveWorkspaceModule(nextModule);
    if (nextModule === "copy-trading-radar" && activeCopyTradingEvent) {
      setSymbol(toCopyTradingMarketSymbol(activeCopyTradingEvent.symbol));
      return;
    }

    if (nextModule === "kol-signals" && activeKolSignal) {
      setSymbol(activeKolSignal.symbol);
    }
  };

  return (
    <main className={pageClassName}>
      {showIntro ? (
        <ProductIntroScreen
          isDarkTheme={isDarkTheme}
          onEnter={() => setShowIntro(false)}
          onTelegramLogin={() => {
            handleTelegramLogin();
            setShowIntro(false);
          }}
        />
      ) : null}
      {isRightPanelCollapsed ? (
        <WorkspaceAccountActions
          authStatus={authStatus}
          isMyPanelOpen={isMyPanelOpen}
          isLoggedIn={isLoggedIn}
          isDarkTheme={isDarkTheme}
          layout="floating"
          notification={workspaceNotification}
          onTelegramLogin={handleTelegramLogin}
          onMyPanelClose={() => setIsMyPanelOpen(false)}
          onMyPanelToggle={handleMyPanelToggle}
          onNotificationDismiss={() => setWorkspaceNotification(null)}
        />
      ) : null}
      <WorkspaceSettingsDock
        isDarkTheme={isDarkTheme}
        language={language}
        onLanguageChange={setLanguage}
        onThemeToggle={toggleTheme}
      />
      <section className={workspaceGridClassName}>
        <RealtimeKlinePanel
          key={`${symbol}-${interval}`}
          activePaperPosition={activeChartPaperPosition}
          activeSignal={activeChartSignal}
          focusSignalRequestKey={chartFocusSignalRequestKey}
          interval={interval}
          marketOptions={marketOptions}
          symbol={symbol}
          signals={chartSignals}
          theme={theme}
          tradeMarkers={chartTradeMarkers}
          onIntervalChange={setInterval}
          onSymbolChange={(nextSymbol) => {
            const nextSignal = chartSignals.find((signal) => signal.symbol === nextSymbol);
            setChartFocusSignalRequestKey(null);
            setSymbol(nextSymbol);
            if (isCopyTradingModuleActive) {
              const nextEvent = copyTradingSnapshot.events.find((event) => getCopyTradingEventChartSignalId(event.event_id) === nextSignal?.id);
              setActiveCopyTradingEventId(nextEvent?.event_id ?? "");
            } else {
              setActiveSignalId(nextSignal?.id ?? "");
            }
          }}
          onSignalSelect={(signal) => {
            if (signal.symbol !== symbol) {
              setChartFocusSignalRequestKey(createSignalFocusRequestKey(signal));
            }
            if (isCopyTradingModuleActive) {
              const event = copyTradingSnapshot.events.find((item) => getCopyTradingEventChartSignalId(item.event_id) === signal.id);
              if (event) {
                setActiveCopyTradingEventId(event.event_id);
              }
            } else {
              setActiveSignalId(signal.id);
            }
            setSymbol(signal.symbol);
          }}
          onMarketCandleUpdate={setLatestMarketCandleUpdate}
        />

        <SidebarCollapseButton
          isCollapsed={isRightPanelCollapsed}
          isDarkTheme={isDarkTheme}
          onToggle={() => setIsRightPanelCollapsed((currentValue) => !currentValue)}
        />
        {!isRightPanelCollapsed ? (
          <div className="flex min-h-0 flex-col gap-3">
            <WorkspaceAccountActions
              authStatus={authStatus}
              isMyPanelOpen={isMyPanelOpen}
              isLoggedIn={isLoggedIn}
              isDarkTheme={isDarkTheme}
              layout="rail"
              notification={workspaceNotification}
              onTelegramLogin={handleTelegramLogin}
              onMyPanelClose={() => setIsMyPanelOpen(false)}
              onMyPanelToggle={handleMyPanelToggle}
              onNotificationDismiss={() => setWorkspaceNotification(null)}
            />
            <WorkspaceModuleTabs
              activeModule={activeWorkspaceModule}
              isDarkTheme={isDarkTheme}
              onModuleChange={handleWorkspaceModuleChange}
            />
            {activeWorkspaceModule === "kol-signals" ? (
              <KolPanel
                activeSignal={activeKolSignal}
                isDarkTheme={isDarkTheme}
                isLoggedIn={isLoggedIn}
                onTelegramLogin={handleTelegramLogin}
                paperPositionErrorsBySymbol={paperPositionErrorsBySymbol}
                paperPositionsBySignalId={paperPositionsBySignalId}
                sourceStatus={kolSignalSourceStatus}
                signals={kolSignals}
                onSignalSelect={(signal) => {
                  if (signal.symbol !== symbol) {
                    setChartFocusSignalRequestKey(createSignalFocusRequestKey(signal));
                  }
                  setActiveSignalId(signal.id);
                  setSymbol(signal.symbol);
                }}
              />
            ) : (
              <CopyTradingRadarPanel
                activeEventId={activeCopyTradingEvent?.event_id ?? ""}
                isDarkTheme={isDarkTheme}
                snapshot={copyTradingSnapshot}
                sourceStatus={copyTradingSourceStatus}
                onEventSelect={handleCopyTradingEventSelect}
                onSymbolSelect={(nextSymbol) => {
                  setChartFocusSignalRequestKey(null);
                  setSymbol(toCopyTradingMarketSymbol(nextSymbol));
                }}
              />
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function ProductIntroScreen({
  isDarkTheme,
  onEnter,
  onTelegramLogin,
}: {
  isDarkTheme: boolean;
  onEnter: () => void;
  onTelegramLogin: () => void;
}) {
  const containerClassName = isDarkTheme
    ? "fixed inset-0 z-[80] flex items-center justify-center bg-slate-950 px-4 text-slate-100"
    : "fixed inset-0 z-[80] flex items-center justify-center bg-[#f5f7fb] px-4 text-slate-950";
  const cardClassName = isDarkTheme
    ? "intro-card-rise w-[min(980px,100%)] overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 shadow-2xl"
    : "intro-card-rise w-[min(980px,100%)] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl";
  const mutedClassName = isDarkTheme ? "text-slate-400" : "text-slate-500";
  const stepClassName = isDarkTheme
    ? "rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
    : "rounded-2xl border border-slate-200 bg-slate-50 p-4";

  return (
    <div className={containerClassName}>
      <div className={cardClassName}>
        <div className="h-1 bg-slate-200">
          <div className="intro-step-progress h-full bg-cyan-500" />
        </div>
        <div className="grid gap-8 p-6 md:grid-cols-[1.05fr_0.95fr] md:p-8">
          <div className="flex min-h-[420px] flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/12 px-3 py-1 text-xs font-black text-cyan-500">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-cyan-500 text-white">K</span>
                K线情报局
              </div>
              <h1 className="mt-5 max-w-xl text-4xl font-black tracking-tight md:text-6xl">
                100+ 顶尖交易员陪你盯盘
              </h1>
              <p className={`mt-5 max-w-xl text-base leading-7 md:text-lg ${mutedClassName}`}>
                把 Telegram 群消息变成可验证的交易信号，不错过关键点位、止盈止损和多源共振。
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-400"
                type="button"
                onClick={onEnter}
              >
                进入工作台
              </button>
              <button
                className={isDarkTheme ? "rounded-full border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-black text-slate-100 transition hover:border-cyan-500 hover:text-cyan-300" : "rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"}
                type="button"
                onClick={onTelegramLogin}
              >
                Telegram 入群登录
              </button>
            </div>
          </div>
          <div className={isDarkTheme ? "rounded-[1.5rem] bg-slate-950 p-4" : "rounded-[1.5rem] bg-slate-100 p-4"}>
            <div className="grid gap-3">
              {[
                ["1", "接入交易员信号", "从 Telegram 群和 KOL 信源抓取原始消息。"],
                ["2", "AI 结构化成交易计划", "自动识别币种、多空、入场、止损、止盈。"],
                ["3", "在 K线上验证", "标记 B/S 点位、风险收益区和多源共振。"],
                ["4", "状态变化提醒你", "入场、止盈、止损和失效状态统一追踪。"],
              ].map(([index, title, description]) => (
                <div key={index} className={stepClassName}>
                  <div className="flex items-start gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cyan-500 text-sm font-black text-white">{index}</span>
                    <div>
                      <div className="text-sm font-black">{title}</div>
                      <div className={`mt-1 text-xs leading-5 ${mutedClassName}`}>{description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className={isDarkTheme ? "mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4" : "mt-4 rounded-2xl border border-slate-200 bg-white p-4"}>
              <div className="text-sm font-black">Demo 重点</div>
              <div className={`mt-2 text-xs leading-5 ${mutedClassName}`}>
                信号源可信感 → 结构化信号卡 → K线风险收益可视化 → 原始社群消息可追溯 → Telegram/登录转化
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkspaceModuleTabs({
  activeModule,
  isDarkTheme,
  onModuleChange,
}: {
  activeModule: WorkspaceModule;
  isDarkTheme: boolean;
  onModuleChange: (module: WorkspaceModule) => void;
}) {
  const containerClassName = isDarkTheme
    ? "grid grid-cols-2 gap-1 rounded-2xl border border-slate-800 bg-slate-900/88 p-1 shadow-sm"
    : "grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm";

  return (
    <div className={containerClassName}>
      <WorkspaceModuleTabButton
        isActive={activeModule === "kol-signals"}
        isDarkTheme={isDarkTheme}
        label="KOL 信源"
        onClick={() => onModuleChange("kol-signals")}
      />
      <WorkspaceModuleTabButton
        isActive={activeModule === "copy-trading-radar"}
        isDarkTheme={isDarkTheme}
        label="带单雷达"
        onClick={() => onModuleChange("copy-trading-radar")}
      />
    </div>
  );
}

function WorkspaceModuleTabButton({
  isActive,
  isDarkTheme,
  label,
  onClick,
}: {
  isActive: boolean;
  isDarkTheme: boolean;
  label: string;
  onClick: () => void;
}) {
  const className = isActive
    ? "rounded-xl bg-cyan-500 px-3 py-2.5 text-xs font-black text-white shadow-sm"
    : isDarkTheme
      ? "rounded-xl px-3 py-2.5 text-xs font-bold text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
      : "rounded-xl px-3 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-950";

  return (
    <button className={className} type="button" onClick={onClick}>
      {label}
    </button>
  );
}


function WorkspaceAccountActions({
  authStatus,
  isMyPanelOpen,
  isLoggedIn,
  isDarkTheme,
  layout,
  notification,
  onMyPanelClose,
  onMyPanelToggle,
  onTelegramLogin,
  onNotificationDismiss,
}: {
  authStatus: TelegramAuthStatus;
  isMyPanelOpen: boolean;
  isLoggedIn: boolean;
  isDarkTheme: boolean;
  layout: "floating" | "rail";
  notification: WorkspaceNotification | null;
  onMyPanelClose: () => void;
  onMyPanelToggle: () => void;
  onTelegramLogin: () => void;
  onNotificationDismiss: () => void;
}) {
  const containerClassName = layout === "floating"
    ? "pointer-events-none fixed right-4 top-4 z-50 flex w-[min(430px,calc(100vw-2rem))] flex-col items-end gap-3"
    : "flex w-full shrink-0 flex-col gap-3";
  const actionRowClassName = layout === "floating"
    ? "pointer-events-auto flex flex-wrap items-center justify-end gap-2"
    : isDarkTheme
      ? "flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/88 p-3 shadow-sm"
      : "flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm";

  return (
    <div className={containerClassName}>
      <div className={actionRowClassName}>
        <BrandLogo isDarkTheme={isDarkTheme} />
        <MyLoginButton isDarkTheme={isDarkTheme} isLoggedIn={isLoggedIn} onClick={onMyPanelToggle} />
        <TelegramCommunityButton isDarkTheme={isDarkTheme} onTelegramLogin={onTelegramLogin} />
      </div>
      {isMyPanelOpen ? (
        <MyStatusPanel
          authStatus={authStatus}
          isDarkTheme={isDarkTheme}
          isLoggedIn={isLoggedIn}
          onClose={onMyPanelClose}
          onTelegramLogin={onTelegramLogin}
        />
      ) : null}
      {notification ? (
        <WorkspaceNotificationBanner
          isDarkTheme={isDarkTheme}
          notification={notification}
          onDismiss={onNotificationDismiss}
        />
      ) : null}
    </div>
  );
}

function BrandLogo({ isDarkTheme }: { isDarkTheme: boolean }) {
  return (
    <div className={isDarkTheme ? "inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/92 px-4 py-2 text-sm font-black text-slate-50 shadow-lg shadow-black/20 backdrop-blur" : "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/92 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-slate-200/70 backdrop-blur"}>
      <span className="grid h-6 w-6 place-items-center rounded-full bg-cyan-500 text-xs font-black text-white">K</span>
      K线情报局
    </div>
  );
}

function MyLoginButton({
  isDarkTheme,
  isLoggedIn,
  onClick,
}: {
  isDarkTheme: boolean;
  isLoggedIn: boolean;
  onClick: () => void;
}) {
  const className = isLoggedIn
    ? isDarkTheme
      ? "inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-950/75 px-4 py-2 text-xs font-bold text-emerald-300 shadow-lg shadow-black/20 backdrop-blur"
      : "inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 shadow-lg shadow-emerald-100"
    : isDarkTheme
      ? "inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/92 px-4 py-2 text-xs font-bold text-slate-200 shadow-lg shadow-black/20 transition hover:border-cyan-500 hover:text-cyan-300 backdrop-blur"
      : "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/92 px-4 py-2 text-xs font-bold text-slate-700 shadow-lg shadow-slate-200/70 transition hover:border-cyan-300 hover:text-cyan-700 backdrop-blur";

  return (
    <button className={className} type="button" onClick={onClick}>
      <span aria-hidden="true">{isLoggedIn ? "✓" : "👤"}</span>
      {isLoggedIn ? "我的 · 已接入" : "我的 · TG登录"}
    </button>
  );
}

function MyStatusPanel({
  authStatus,
  isDarkTheme,
  isLoggedIn,
  onClose,
  onTelegramLogin,
}: {
  authStatus: TelegramAuthStatus;
  isDarkTheme: boolean;
  isLoggedIn: boolean;
  onClose: () => void;
  onTelegramLogin: () => void;
}) {
  const panelClassName = isDarkTheme
    ? "pointer-events-auto w-full rounded-3xl border border-slate-700 bg-slate-950/96 p-4 text-slate-100 shadow-2xl shadow-black/30 backdrop-blur"
    : "pointer-events-auto w-full rounded-3xl border border-slate-200 bg-white/96 p-4 text-slate-950 shadow-2xl shadow-slate-300/50 backdrop-blur";
  const mutedClassName = isDarkTheme ? "text-slate-400" : "text-slate-500";
  const telegramDisplayName = formatTelegramDisplayName(authStatus.telegramUser);
  const communityStatus = formatTelegramCommunityStatus(authStatus.communityBinding, isLoggedIn);
  const communityActionLabel = authStatus.communityBinding === "joined" ? "打开 Telegram" : "加入 TG 群";
  const sourceBindingStatus = authStatus.sourceBindingCount > 0 ? `${authStatus.sourceBindingCount} 个信源` : isLoggedIn ? "公共信源" : "登录后可用";
  const notificationStatus = authStatus.notificationPermission === "granted" ? "已授权" : isLoggedIn ? "待 bot 绑定" : "待授权";

  return (
    <div className={panelClassName}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={isDarkTheme ? "text-sm font-black text-slate-50" : "text-sm font-black text-slate-950"}>我的情报工作台</div>
          <p className={`mt-1 text-xs leading-5 ${mutedClassName}`}>
            {isLoggedIn ? `${telegramDisplayName} 已通过 Telegram 登录验证。` : "使用 Telegram 登录后解锁最新情报。"}
          </p>
        </div>
        <button
          className={isDarkTheme ? "rounded-full px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-800 hover:text-slate-200" : "rounded-full px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"}
          type="button"
          onClick={onClose}
        >
          关闭
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        <MyBindingRow
          actionLabel={communityActionLabel}
          description="网页登录后生成专属入群链接；入群状态由 bot webhook 和 getChatMember 校验。"
          isDarkTheme={isDarkTheme}
          status={communityStatus}
          title="TG 群验证"
          tone={authStatus.communityBinding === "joined" ? "positive" : isLoggedIn ? "pending" : "pending"}
          onAction={onTelegramLogin}
        />
        <MyBindingRow
          actionLabel="管理"
          description="当前已接入 KOL 信号源，后续可在这里绑定自有群。"
          isDarkTheme={isDarkTheme}
          status={sourceBindingStatus}
          title="信号源"
          tone={isLoggedIn ? "positive" : "pending"}
          onAction={onTelegramLogin}
        />
        <MyBindingRow
          actionLabel="授权通知"
          description="命中入场、止盈、止损和多源共振时推送提醒。"
          isDarkTheme={isDarkTheme}
          status={notificationStatus}
          title="通知权限"
          tone={authStatus.notificationPermission === "granted" ? "positive" : "pending"}
          onAction={onTelegramLogin}
        />
      </div>

      <div className={isDarkTheme ? "mt-4 rounded-2xl bg-slate-900 p-3 text-[11px] leading-5 text-slate-400" : "mt-4 rounded-2xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500"}>
        当前已接入 Telegram OIDC 登录验证和 TG 群入群校验；通知和自有信号源绑定后续继续接 bot 授权。
      </div>
    </div>
  );
}

function MyBindingRow({
  actionLabel,
  description,
  isDarkTheme,
  status,
  title,
  tone,
  onAction,
}: {
  actionLabel: string;
  description: string;
  isDarkTheme: boolean;
  status: string;
  title: string;
  tone: "pending" | "positive";
  onAction: () => void;
}) {
  const rowClassName = isDarkTheme
    ? "rounded-2xl border border-slate-800 bg-slate-900/80 p-3"
    : "rounded-2xl border border-slate-200 bg-slate-50 p-3";
  const statusClassName = tone === "positive"
    ? isDarkTheme ? "rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-300" : "rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700"
    : isDarkTheme ? "rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-black text-amber-300" : "rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700";
  const actionClassName = isDarkTheme
    ? "rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-[11px] font-bold text-slate-200 transition hover:border-cyan-500 hover:text-cyan-300"
    : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700";

  return (
    <div className={rowClassName}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={isDarkTheme ? "text-xs font-black text-slate-100" : "text-xs font-black text-slate-900"}>{title}</div>
          <div className={isDarkTheme ? "mt-1 text-[11px] leading-5 text-slate-400" : "mt-1 text-[11px] leading-5 text-slate-500"}>{description}</div>
        </div>
        <span className={statusClassName}>{status}</span>
      </div>
      <button className={`${actionClassName} mt-3`} type="button" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

function TelegramCommunityButton({
  isDarkTheme,
  onTelegramLogin,
}: {
  isDarkTheme: boolean;
  onTelegramLogin: () => void;
}) {
  const className = isDarkTheme
    ? "pointer-events-auto inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-sky-950/30 transition hover:bg-sky-400"
    : "pointer-events-auto inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-sky-200/70 transition hover:bg-sky-600";

  return (
    <button className={className} type="button" onClick={onTelegramLogin}>
      <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20" aria-hidden="true">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.7 3.4 18.3 20c-.2 1-1.1 1.3-1.9.8l-5.2-3.9-2.5 2.4c-.3.3-.5.5-1 .5l.4-5.4 9.8-8.9c.4-.4-.1-.6-.7-.2L5.1 13 0 11.4c-1.1-.3-1.1-1.1.2-1.6L20.3 2c.9-.3 1.7.2 1.4 1.4Z" />
        </svg>
      </span>
      社群接入
    </button>
  );
}

function WorkspaceNotificationBanner({
  isDarkTheme,
  notification,
  onDismiss,
}: {
  isDarkTheme: boolean;
  notification: WorkspaceNotification;
  onDismiss: () => void;
}) {
  const className = isDarkTheme
    ? "pointer-events-auto w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/96 shadow-2xl shadow-black/30 backdrop-blur"
    : "pointer-events-auto w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/96 shadow-2xl shadow-slate-300/50 backdrop-blur";

  return (
    <div className={className} role="status">
      <div className={isDarkTheme ? "border-b border-slate-800 bg-slate-900/80 px-4 py-2" : "border-b border-slate-100 bg-slate-50/90 px-4 py-2"}>
        <div className="flex items-center justify-between gap-3">
          <span className={isDarkTheme ? "text-[11px] font-bold text-cyan-300" : "text-[11px] font-bold text-cyan-700"}>浏览器通知</span>
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

function WorkspaceSettingsDock({
  isDarkTheme,
  language,
  onLanguageChange,
  onThemeToggle,
}: {
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  onLanguageChange: (language: WorkspaceLanguage) => void;
  onThemeToggle: () => void;
}) {
  const containerClassName = isDarkTheme
    ? "fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/90 p-2 shadow-2xl shadow-black/25 backdrop-blur"
    : "fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-2xl shadow-slate-300/45 backdrop-blur";
  const selectClassName = isDarkTheme
    ? "h-9 rounded-xl border border-slate-700 bg-slate-900 px-2 text-xs font-bold text-slate-200 outline-none"
    : "h-9 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-700 outline-none";

  return (
    <div className={containerClassName}>
      <AnimatedThemeToggler isDarkTheme={isDarkTheme} onThemeToggle={onThemeToggle} />
      <label className="sr-only" htmlFor="workspace-language">语言</label>
      <select
        className={selectClassName}
        id="workspace-language"
        value={language}
        onChange={(event) => onLanguageChange(event.target.value as WorkspaceLanguage)}
      >
        <option value="zh-CN">中文</option>
        <option value="en-US">English</option>
      </select>
      <span className={isDarkTheme ? "hidden text-[11px] font-semibold text-slate-500 sm:inline" : "hidden text-[11px] font-semibold text-slate-400 sm:inline"}>
        设置
      </span>
    </div>
  );
}

function AnimatedThemeToggler({
  isDarkTheme,
  onThemeToggle,
}: {
  isDarkTheme: boolean;
  onThemeToggle: () => void;
}) {
  const className = isDarkTheme
    ? "grid h-9 w-9 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-slate-100 transition hover:bg-slate-800"
    : "grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50";

  return (
    <button
      aria-label={isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}
      className={className}
      type="button"
      onClick={(event) => {
        const originX = event.clientX;
        const originY = event.clientY;

        if (!document.startViewTransition) {
          onThemeToggle();
          return;
        }

        const transition = document.startViewTransition(() => {
          flushSync(onThemeToggle);
        });

        void transition.ready.then(() => {
          const endRadius = Math.hypot(
            Math.max(originX, window.innerWidth - originX),
            Math.max(originY, window.innerHeight - originY),
          );

          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${originX}px ${originY}px)`,
                `circle(${endRadius}px at ${originX}px ${originY}px)`,
              ],
            },
            {
              duration: 820,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-new(root)",
            },
          );

          document.documentElement.animate(
            { opacity: [1, 0.82, 0] },
            {
              duration: 820,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-old(root)",
            },
          );
        });
      }}
    >
      {themeToggleIcon(isDarkTheme)}
    </button>
  );
}

function themeToggleIcon(isDarkTheme: boolean) {
  return isDarkTheme ? (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M12 3v2.25M12 18.75V21M4.22 4.22l1.59 1.59M18.19 18.19l1.59 1.59M3 12h2.25M18.75 12H21M4.22 19.78l1.59-1.59M18.19 5.81l1.59-1.59" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ) : (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M20.5 14.3A8.2 8.2 0 0 1 9.7 3.5 8.2 8.2 0 1 0 20.5 14.3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function SidebarCollapseButton({
  isCollapsed,
  isDarkTheme,
  onToggle,
}: {
  isCollapsed: boolean;
  isDarkTheme: boolean;
  onToggle: () => void;
}) {
  const className = isDarkTheme
    ? "hidden lg:grid absolute top-1/2 z-40 h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-slate-700 bg-slate-950 text-slate-200 shadow-xl transition hover:border-cyan-500 hover:text-cyan-300"
    : "hidden lg:grid absolute top-1/2 z-40 h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-xl transition hover:border-cyan-300 hover:text-cyan-700";
  const positionClassName = isCollapsed ? "right-4" : "right-[374px] xl:right-[404px]";

  return (
    <button
      aria-label={isCollapsed ? "Expand intelligence panel" : "Collapse intelligence panel"}
      className={`${className} ${positionClassName}`}
      type="button"
      onClick={onToggle}
    >
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path d={isCollapsed ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      </svg>
    </button>
  );
}

function openTelegramCommunityLink() {
  if (typeof window === "undefined") {
    return;
  }

  window.open(TELEGRAM_COMMUNITY_URL, "_blank", "noopener,noreferrer");
}

function readTelegramAuthResultFromUrl(): "success" | "error" | null {
  if (typeof window === "undefined") {
    return null;
  }

  const authResult = new URLSearchParams(window.location.search).get("telegram_auth");
  return authResult === "success" || authResult === "error" ? authResult : null;
}

function readShouldJoinCommunityFromUrl(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("join_community") === "1";
}

function clearTelegramAuthQueryFromUrl() {
  if (
    typeof window === "undefined"
    || (!window.location.search.includes("telegram_auth=") && !window.location.search.includes("join_community="))
  ) {
    return;
  }

  const searchParams = new URLSearchParams(window.location.search);
  searchParams.delete("telegram_auth");
  searchParams.delete("join_community");
  const nextSearch = searchParams.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
}

function normalizeTelegramAuthStatus(authStatus: TelegramAuthStatus): TelegramAuthStatus {
  return {
    botBinding: authStatus.botBinding === "bound" ? "bound" : "unbound",
    communityBinding: normalizeTelegramCommunityBinding(authStatus.communityBinding),
    isLoggedIn: Boolean(authStatus.isLoggedIn && authStatus.telegramUser),
    notificationPermission: authStatus.notificationPermission === "granted" ? "granted" : "none",
    sourceBindingCount: Number.isFinite(authStatus.sourceBindingCount) ? Math.max(0, authStatus.sourceBindingCount) : 0,
    telegramUser: authStatus.telegramUser,
  };
}

async function fetchTelegramAuthStatus(): Promise<TelegramAuthStatus> {
  const response = await fetch("/api/auth/me", { credentials: "same-origin" });
  const nextAuthStatus = response.ok ? await response.json() as TelegramAuthStatus : DEFAULT_TELEGRAM_AUTH_STATUS;
  return normalizeTelegramAuthStatus(nextAuthStatus);
}

async function openPersonalTelegramCommunityInvite(
  refreshTelegramCommunityMembership: () => Promise<TelegramAuthStatus>,
  setWorkspaceNotification: (notification: WorkspaceNotification | null) => void,
) {
  const inviteWindow = window.open("about:blank", "_blank");

  try {
    const response = await fetch("/api/telegram/community/invite", {
      credentials: "same-origin",
      method: "POST",
    });
    const inviteResponse = response.ok ? await response.json() as TelegramCommunityInviteResponse : null;

    if (!response.ok || !inviteResponse) {
      throw new Error("Telegram invite creation failed.");
    }

    if (inviteResponse.communityBinding === "joined") {
      inviteWindow?.close();
      openTelegramCommunityLink();
      return;
    }

    if (!inviteResponse.inviteLink) {
      throw new Error("Telegram invite link is missing.");
    }

    if (inviteWindow) {
      inviteWindow.location.href = inviteResponse.inviteLink;
    } else {
      window.location.assign(inviteResponse.inviteLink);
    }

    setWorkspaceNotification({
      id: "telegram-community-invite",
      title: "已生成专属入群链接",
      message: "完成入群后回到页面，系统会自动刷新 TG 群验证状态。",
      meta: "K线情报局 · TG 群验证",
    });

    window.setTimeout(() => {
      void refreshTelegramCommunityMembership();
    }, 5_000);
  } catch {
    inviteWindow?.close();
    setWorkspaceNotification({
      id: "telegram-community-invite-error",
      title: "TG 入群链接生成失败",
      message: "请确认 Vercel 已配置 bot token、群 chat id、webhook secret，并确认状态存储适配器可用。",
      meta: "K线情报局 · TG 群验证",
    });
  }
}

function normalizeTelegramCommunityBinding(communityBinding: TelegramAuthStatus["communityBinding"]): TelegramAuthStatus["communityBinding"] {
  return ["pending", "joined", "left", "kicked"].includes(communityBinding) ? communityBinding : "unverified";
}

function formatTelegramCommunityStatus(communityBinding: TelegramAuthStatus["communityBinding"], isLoggedIn: boolean): string {
  if (!isLoggedIn) {
    return "待登录";
  }

  switch (communityBinding) {
    case "joined":
      return "已入群";
    case "pending":
      return "等待入群";
    case "left":
      return "已退出";
    case "kicked":
      return "已移除";
    case "unverified":
      return "待入群";
    default:
      return "待入群";
  }
}

function formatTelegramDisplayName(telegramUser: TelegramAuthUser | null): string {
  if (!telegramUser) {
    return "Telegram 用户";
  }

  if (telegramUser.username) {
    return `@${telegramUser.username}`;
  }

  return telegramUser.name || "Telegram 用户";
}

function mergeIncomingSignals(
  incomingSignals: readonly StructuredSignal[],
  currentSignals: StructuredSignal[],
): StructuredSignal[] {
  const mergedSignals = dedupeStructuredSignalsByPosition([...currentSignals, ...incomingSignals]);
  return areStructuredSignalListsEqual(currentSignals, mergedSignals) ? currentSignals : mergedSignals;
}

function areStructuredSignalListsEqual(
  leftSignals: readonly StructuredSignal[],
  rightSignals: readonly StructuredSignal[],
): boolean {
  if (leftSignals.length !== rightSignals.length) {
    return false;
  }

  return leftSignals.every((leftSignal, index) => {
    const rightSignal = rightSignals[index];
    return Boolean(
      rightSignal
      && leftSignal.id === rightSignal.id
      && leftSignal.created_at === rightSignal.created_at
      && createStructuredSignalPositionKey(leftSignal) === createStructuredSignalPositionKey(rightSignal),
    );
  });
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
