"use client";

import { ChevronLeft, Languages, Moon, PanelRightClose, PanelRightOpen, Sun } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { markets } from "@/app/_lib/demo-data";
import { fetchUsdtPerpetualMarkets } from "@/app/_lib/binance-market-data";
import { createStructuredSignalPositionKey, fetchKolSignals, subscribeToKolSignals } from "@/app/_lib/kol-signal-api";
import { computePaperPositionRecord, type PaperPositionRecord } from "@/app/_lib/paper-position";
import { KolPanel } from "./signal-workspace/kol-panel";
import { OnboardingGuide } from "./signal-workspace/onboarding-guide";
import { RealtimeKlinePanel } from "./signal-workspace/realtime-kline-panel";
import { formatKolSignalSourceError, type KolSignalSourceStatus } from "./signal-workspace/types";
import { usePaperPositionCandles } from "./signal-workspace/use-paper-position-candles";
import type { ChartTheme } from "@/app/_components/kline-chart";
import type { KlineInterval, MarketSymbol } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";

const MAX_VISIBLE_KOL_SIGNALS = 50;
const TELEGRAM_COMMUNITY_URL = process.env.NEXT_PUBLIC_TELEGRAM_GROUP_URL ?? "https://t.me/smartkline";
const DEMO_USER_PROFILE = {
  name: "Alphafox",
  email: "alphafox@smartkline.ai",
  initials: "AF",
};

type WorkspaceLanguage = "zh-CN" | "en-US";

export function SignalWorkspace() {
  const [symbol, setSymbol] = useState<MarketSymbol>("BTC/USDT:USDT");
  const [interval, setInterval] = useState<KlineInterval>("15m");
  const [activeSignalId, setActiveSignalId] = useState("");
  const [theme, setTheme] = useState<ChartTheme>("light");
  const [language, setLanguage] = useState<WorkspaceLanguage>("zh-CN");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMyPanelOpen, setIsMyPanelOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [isRightPanelExiting, setIsRightPanelExiting] = useState(false);
  const [isWorkspaceMotionVisible, setIsWorkspaceMotionVisible] = useState(false);
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
  const rightPanelExitTimeoutRef = useRef<number | null>(null);
  const pageClassName = isDarkTheme ? "flex h-screen w-screen flex-col overflow-hidden bg-[#0B0E11] text-slate-100" : "flex h-screen w-screen flex-col overflow-hidden bg-[#F1F4F8] text-slate-900";
  const workspaceGridClassName = isRightPanelCollapsed
    ? "motion-fx-7-workspace-grid relative grid h-full min-h-0 gap-3 p-4 lg:grid-cols-[minmax(0,1fr)]"
    : "motion-fx-7-workspace-grid relative grid h-full min-h-0 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]";

  const startOnboardingGuide = () => {
    setIsRightPanelCollapsed(false);
    window.setTimeout(() => setIsOnboardingOpen(true), 180);
  };

  const handleTelegramLogin = ({ openCommunity = false }: { openCommunity?: boolean } = {}) => {
    if (openCommunity) {
      openTelegramCommunityLink();
    }

    const shouldStartFirstLoginGuide = !isLoggedIn && shouldShowFirstLoginOnboardingGuide();
    setIsLoggedIn(true);
    setIsMyPanelOpen(false);

    if (shouldStartFirstLoginGuide) {
      startOnboardingGuide();
    }
  };

  const handleMyPanelToggle = () => {
    if (isLoggedIn) {
      setIsMyPanelOpen(false);
      return;
    }

    handleTelegramLogin({ openCommunity: false });
  };

  const toggleTheme = () => setTheme((currentTheme) => currentTheme === "light" ? "dark" : "light");
  const toggleLanguage = () => setLanguage((currentLanguage) => currentLanguage === "zh-CN" ? "en-US" : "zh-CN");

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsWorkspaceMotionVisible(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    return () => {
      if (rightPanelExitTimeoutRef.current !== null) {
        window.clearTimeout(rightPanelExitTimeoutRef.current);
      }
    };
  }, []);

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

  const toggleRightPanel = () => {
    if (isRightPanelExiting) {
      return;
    }

    if (isRightPanelCollapsed) {
      setIsRightPanelCollapsed(false);
      return;
    }

    setIsRightPanelExiting(true);
    rightPanelExitTimeoutRef.current = window.setTimeout(() => {
      setIsRightPanelCollapsed(true);
      setIsRightPanelExiting(false);
      rightPanelExitTimeoutRef.current = null;
    }, 220);
  };

  return (
    <main className={pageClassName} data-compact-ui>
      <div className={`motion-fx-10-delay-0 motion-fx-10-reveal ${isWorkspaceMotionVisible ? "is-visible" : ""}`}>
        <WorkspaceTopNavigation
          isDarkTheme={isDarkTheme}
          isLoggedIn={isLoggedIn}
          isMyPanelOpen={isMyPanelOpen}
          language={language}
          onCommunityOpen={openTelegramCommunityLink}
          onGuideOpen={startOnboardingGuide}
          onLanguageToggle={toggleLanguage}
          onMyPanelClose={() => setIsMyPanelOpen(false)}
          onMyPanelToggle={handleMyPanelToggle}
          onThemeToggle={toggleTheme}
        />
      </div>
      <div className="min-h-0 min-w-0 flex-1">
        <section className={workspaceGridClassName} data-right-panel-collapsed={String(isRightPanelCollapsed)}>
          <div className={`motion-fx-10-delay-1 motion-fx-10-reveal motion-fx-7-primary-panel flex h-full min-h-0 min-w-0 w-full ${isWorkspaceMotionVisible ? "is-visible" : ""}`}>
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
            />
          </div>

          {!isRightPanelCollapsed || isRightPanelExiting ? (
            <div className={`kol-panel-shell motion-fx-10-delay-2 motion-fx-10-reveal motion-fx-7-secondary-panel relative flex min-h-0 min-w-0 flex-col gap-3 ${isWorkspaceMotionVisible ? "is-visible" : ""} ${isRightPanelExiting ? "is-exiting" : ""}`}>
              <KolPanel
                activeSignal={activeSignal}
                headerAction={(
                  <SidebarCollapseButton
                    isCollapsed={isRightPanelCollapsed}
                    isDarkTheme={isDarkTheme}
                    variant="header"
                    onToggle={toggleRightPanel}
                  />
                )}
                isDarkTheme={isDarkTheme}
                isLoggedIn={isLoggedIn}
                onTelegramLogin={handleTelegramLogin}
                paperPositionErrorsBySymbol={paperPositionErrorsBySymbol}
                paperPositionsBySignalId={paperPositionsBySignalId}
                sourceStatus={kolSignalSourceStatus}
                signals={kolSignals}
                onSignalSelect={(signal) => {
                  setActiveSignalId(signal.id);
                  setSymbol(signal.symbol);
                }}
              />
            </div>
          ) : (
            <SidebarCollapseButton
              isCollapsed={isRightPanelCollapsed}
              isDarkTheme={isDarkTheme}
              variant="edge-tab"
              onToggle={toggleRightPanel}
            />
          )}
        </section>
      </div>
      <OnboardingGuide
        isDarkTheme={isDarkTheme}
        isOpen={isOnboardingOpen}
        onComplete={() => setIsOnboardingOpen(false)}
      />
    </main>
  );
}

function WorkspaceTopNavigation({
  isDarkTheme,
  isLoggedIn,
  isMyPanelOpen,
  language,
  onCommunityOpen,
  onGuideOpen,
  onLanguageToggle,
  onMyPanelClose,
  onMyPanelToggle,
  onThemeToggle,
}: {
  isDarkTheme: boolean;
  isLoggedIn: boolean;
  isMyPanelOpen: boolean;
  language: WorkspaceLanguage;
  onCommunityOpen: () => void;
  onGuideOpen: () => void;
  onLanguageToggle: () => void;
  onMyPanelClose: () => void;
  onMyPanelToggle: () => void;
  onThemeToggle: () => void;
}) {
  const headerClassName = isDarkTheme
    ? "relative z-50 flex h-16 shrink-0 items-center justify-between border-b border-white/[0.075] bg-[#0B0E11]/95 px-5 backdrop-blur-xl"
    : "relative z-50 flex h-16 shrink-0 items-center justify-between border-b border-[#E5EAF0] bg-white/95 px-5 backdrop-blur-xl";
  const headerLinkClassName = isDarkTheme
    ? "motion-fx-1-nav-button px-2 py-2 text-sm font-semibold text-slate-400 transition-colors hover:text-[#69D4FF]"
    : "motion-fx-1-nav-button px-2 py-2 text-sm font-semibold text-slate-500 transition-colors hover:text-[#008DCC]";
  const loginButtonClassName = "motion-fx-1-nav-button h-10 rounded-full bg-[#00A6F4] px-5 text-sm font-semibold text-white transition hover:bg-[#0097DD]";
  const accountButtonClassName = isDarkTheme
    ? "motion-fx-1-nav-button group flex h-10 max-w-[180px] items-center gap-2 rounded-full border border-white/[0.075] bg-white/[0.035] py-1 pl-1 pr-3 text-left transition hover:border-white/[0.11] hover:bg-white/[0.08]"
    : "motion-fx-1-nav-button group flex h-10 max-w-[180px] items-center gap-2 rounded-full border border-[#E5EAF0] bg-white py-1 pl-1 pr-3 text-left transition hover:border-[#B7E8FC] hover:bg-[#EAF8FE]/70";
  const avatarClassName = isDarkTheme
    ? "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#00A6F4] text-[11px] font-black text-white ring-2 ring-[#0B0E11]"
    : "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#00A6F4] text-[11px] font-black text-white ring-2 ring-white";
  const accountNameClassName = isDarkTheme ? "truncate text-xs font-bold leading-4 text-slate-100" : "truncate text-xs font-bold leading-4 text-slate-900";
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const [isFollowHintVisible, setIsFollowHintVisible] = useState(false);

  useEffect(() => {
    if (!isMyPanelOpen || !isLoggedIn) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!accountMenuRef.current?.contains(target)) {
        onMyPanelClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isLoggedIn, isMyPanelOpen, onMyPanelClose]);

  return (
    <header className={headerClassName}>
      <div className="flex min-w-0 items-center gap-5">
        <BrandLogo isDarkTheme={isDarkTheme} language={language} />
        <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
          <button className={headerLinkClassName} type="button" onClick={onGuideOpen}>
            新手引导
          </button>
          <button
            className={headerLinkClassName}
            type="button"
            onBlur={() => setIsFollowHintVisible(false)}
            onClick={() => setIsFollowHintVisible(true)}
            onMouseLeave={() => setIsFollowHintVisible(false)}
          >
            {isFollowHintVisible ? "敬请期待" : "一键跟单"}
          </button>
          <button className={headerLinkClassName} type="button" onClick={onCommunityOpen}>
            加入TG社群
          </button>
        </nav>
      </div>
      <div ref={accountMenuRef} className="relative flex items-center gap-2">
        <AnimatedThemeToggler isCollapsed isDarkTheme={isDarkTheme} onThemeToggle={onThemeToggle} />
        <LanguageToggleButton
          isDarkTheme={isDarkTheme}
          language={language}
          onLanguageToggle={onLanguageToggle}
        />
        {isLoggedIn ? (
          <button
            aria-label={`Account: ${DEMO_USER_PROFILE.name}`}
            className={accountButtonClassName}
            type="button"
            onClick={onMyPanelToggle}
          >
            <span className={avatarClassName}>{DEMO_USER_PROFILE.initials}</span>
            <span className="hidden min-w-0 sm:block">
              <span className={accountNameClassName}>{DEMO_USER_PROFILE.name}</span>
            </span>
          </button>
        ) : (
          <button className={loginButtonClassName} type="button" onClick={onMyPanelToggle}>
            登录
          </button>
        )}
      </div>
    </header>
  );
}

function BrandLogo({ isDarkTheme, language }: { isDarkTheme: boolean; language: WorkspaceLanguage }) {
  void isDarkTheme;
  const wrapperClassName = "motion-fx-1-brand flex h-[54px] shrink-0 items-center gap-[7px] overflow-hidden rounded-xl px-0 py-1";
  const isEnglish = language === "en-US";
  const logoAlt = isEnglish ? "SmartKline Intel" : "K线情报局";
  const wordmarkSrc = isEnglish
    ? isDarkTheme ? "/logo-wordmark-en-dark.svg" : "/logo-wordmark-en-light.svg"
    : isDarkTheme ? "/logo-wordmark-zh-dark.svg" : "/logo-wordmark-zh-light.svg";

  return (
    <div aria-label={logoAlt} className={wrapperClassName}>
      <Image
        priority
        unoptimized
        alt=""
        aria-hidden="true"
        className="h-[39.6px] w-[39.6px] shrink-0 object-contain"
        height={64}
        src="/logo-mark.svg"
        width={64}
      />
      <Image
        priority
        unoptimized
        alt={logoAlt}
        className="h-[39.6px] w-auto object-contain object-left"
        height={64}
        src={wordmarkSrc}
        width={isEnglish ? 240 : 160}
      />
    </div>
  );
}

function LanguageToggleButton({
  isDarkTheme,
  language,
  onLanguageToggle,
}: {
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  onLanguageToggle: () => void;
}) {
  const className = isDarkTheme
    ? "motion-fx-1-nav-button flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/[0.075] bg-white/[0.035] text-slate-300 transition hover:bg-white/[0.08] hover:text-slate-50"
    : "motion-fx-1-nav-button flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[#E5EAF0] bg-white text-slate-600 transition hover:border-[#B7E8FC] hover:bg-[#EAF8FE]/70 hover:text-[#007DB8]";

  return (
    <button
      aria-label={language === "zh-CN" ? "Switch to English" : "Switch to Chinese"}
      className={className}
      title={language === "zh-CN" ? "Switch to English" : "Switch to Chinese"}
      type="button"
      onClick={onLanguageToggle}
    >
      <Languages aria-hidden="true" className="h-4 w-4" strokeWidth={1.9} />
    </button>
  );
}

function AnimatedThemeToggler({
  isCollapsed,
  isDarkTheme,
  onThemeToggle,
}: {
  isCollapsed: boolean;
  isDarkTheme: boolean;
  onThemeToggle: () => void;
}) {
  const className = isDarkTheme
    ? `motion-fx-1-nav-button ${isCollapsed ? "grid h-10 w-10 place-items-center" : "flex h-10 w-full items-center gap-3 px-2.5"} rounded-full border border-white/[0.075] bg-white/[0.035] text-sm font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-slate-50`
    : `motion-fx-1-nav-button ${isCollapsed ? "grid h-10 w-10 place-items-center" : "flex h-10 w-full items-center gap-3 px-2.5"} rounded-full border border-[#E5EAF0] bg-white text-sm font-medium text-slate-500 transition hover:border-[#B7E8FC] hover:bg-[#EAF8FE]/70 hover:text-slate-950`;

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
      <ThemeToggleIcon isDarkTheme={isDarkTheme} />
      {!isCollapsed ? <span>{isDarkTheme ? "娴呰壊妯″紡" : "娣辫壊妯″紡"}</span> : null}
    </button>
  );
}

function ThemeToggleIcon({ isDarkTheme }: { isDarkTheme: boolean }) {
  const Icon = isDarkTheme ? Sun : Moon;
  return <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={1.9} />;
}

function SidebarCollapseButton({
  isCollapsed,
  isDarkTheme,
  variant = "header",
  onToggle,
}: {
  isCollapsed: boolean;
  isDarkTheme: boolean;
  variant?: "header" | "edge-tab";
  onToggle: () => void;
}) {
  const label = isCollapsed ? "KOL\u4fe1\u606f" : "\u6298\u53e0";
  const edgeLabel = "\u5c55\u5f00 KOL\u4fe1\u606f";
  const Icon = isCollapsed ? PanelRightOpen : PanelRightClose;

  if (variant === "edge-tab") {
    const className = isDarkTheme
      ? "kol-edge-tab group fixed right-0 top-1/2 z-[60] hidden h-14 w-8 -translate-y-1/2 overflow-hidden rounded-l-2xl border border-r-0 border-white/[0.075] bg-[#181A20]/96 text-slate-200 backdrop-blur-xl transition-[width,transform,background-color,border-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:w-[116px] hover:-translate-x-0.5 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-slate-50 active:scale-[0.98] lg:flex"
      : "kol-edge-tab group fixed right-0 top-1/2 z-[60] hidden h-14 w-8 -translate-y-1/2 overflow-hidden rounded-l-2xl border border-r-0 border-[#BFE7FB] bg-[#F4FBFF] text-slate-700 backdrop-blur-xl transition-[width,transform,background-color,border-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:w-[116px] hover:-translate-x-0.5 hover:border-[#A7DDF7] hover:bg-[#ECF8FE] hover:text-slate-900 active:scale-[0.98] lg:flex";

    return (
      <button
        aria-label={edgeLabel}
        className={className}
        type="button"
        onClick={onToggle}
      >
        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-full items-center justify-center transition-all duration-200 ease-out group-hover:w-8 group-hover:justify-start group-hover:px-2.5">
          <ChevronLeft aria-hidden="true" className="motion-fx-7-collapse-icon h-4 w-4" strokeWidth={2.6} />
        </span>
        <span className="pointer-events-none absolute left-8 top-1/2 max-w-0 -translate-y-1/2 overflow-hidden whitespace-nowrap text-[13px] font-normal leading-none opacity-0 transition-[max-width,opacity] duration-200 ease-out group-hover:max-w-20 group-hover:opacity-100">
          KOL {"\u4fe1\u606f"}
        </span>
      </button>
    );
  }

  const className = isDarkTheme
    ? "group hidden h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/[0.075] bg-white/[0.035] px-0 text-slate-300 transition-[width,transform,background-color,border-color,color,padding] duration-200 ease-out hover:w-[74px] hover:border-white/[0.11] hover:bg-white/[0.08] hover:px-3 hover:text-slate-50 active:scale-[0.98] focus-visible:w-[74px] focus-visible:px-3 lg:flex"
    : "group hidden h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#BFE7FB] bg-[#F4FBFF] px-0 text-slate-700 transition-[width,transform,background-color,border-color,color,padding] duration-200 ease-out hover:w-[74px] hover:border-[#A7DDF7] hover:bg-[#ECF8FE] hover:px-3 hover:text-slate-900 active:scale-[0.98] focus-visible:w-[74px] focus-visible:px-3 lg:flex";

  return (
    <button
      aria-label={label}
      className={className}
      title={label}
      type="button"
      onClick={onToggle}
    >
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-normal opacity-0 transition-[max-width,opacity,margin] duration-200 ease-out group-hover:mr-2 group-hover:max-w-10 group-hover:opacity-100 group-focus-visible:mr-2 group-focus-visible:max-w-10 group-focus-visible:opacity-100">
        {label}
      </span>
      <span className="grid h-4 w-4 shrink-0 place-items-center">
        <Icon aria-hidden="true" className={`motion-fx-7-collapse-icon h-4 w-4 ${isCollapsed ? "is-collapsed" : ""}`} strokeWidth={1.9} />
      </span>
    </button>
  );
}

function openTelegramCommunityLink() {
  if (typeof window === "undefined") {
    return;
  }

  window.open(TELEGRAM_COMMUNITY_URL, "_blank", "noopener,noreferrer");
}

function shouldShowFirstLoginOnboardingGuide(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem("smartkline:onboarding-guide-seen") !== "true";
  } catch {
    return true;
  }
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
