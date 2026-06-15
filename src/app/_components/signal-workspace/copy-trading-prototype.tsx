"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import * as SelectPrimitive from "@radix-ui/react-select";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getTradingFoxErrorMessage } from "@/app/_lib/tradingfox-errors";
import { WORKSPACE_COPY, type WorkspaceCopy, type WorkspaceLanguage } from "@/app/_lib/i18n";
import { intervals } from "@/app/_lib/demo-data";
import {
  fetchHistoricalCandles,
  prependHistoricalCandles,
} from "@/app/_lib/binance-market-data";
import { toCopyTradingMarketSymbol } from "@/app/_lib/copy-trading-radar-api";
import type { TelegramSessionUser } from "@/app/_lib/auth/telegram-auth";
import type { TradingFoxPosition, TradingFoxStrategyDetail } from "@/app/_lib/tradingfox-control-plane";
import type { KlineChartProps } from "@/app/_components/kline-chart";
import type { ChartTimeFocusRequest } from "@/app/_components/kline-chart/types";
import type { CopyTradingTradeMarker, CopyTradingTrader } from "@/app/_types/copy-trading";
import type { KlineInterval, MarketCandle, MarketSymbol } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";
import { SourceAvatar } from "./card-ui";

export type CopyTradingPrototypeTarget = {
  eventsCount: number;
  positionsCount: number;
  trader: CopyTradingTrader;
};

export type PrototypeApiConnection = {
  accountName: string;
  accountBalance: number | null;
  displayName?: string;
  id: number;
  connectedAtLabel: string;
  exchangePlatform: string;
  isMock: boolean;
  mockMarginBalance: number | null;
  status: "empty" | "connected";
  whitelistIp?: string;
};

export type PrototypeStrategyStatus = "running" | "paused" | "stopped";
export type PrototypeStrategyType = "copyTrading" | "mario";

export type PrototypeStrategy = {
  apiAccountName: string;
  accountEquity?: number;
  exchangeConnectorId: number;
  avatarUrl: string;
  createdAtLabel: string;
  eventsCount: number;
  followRatioPercent?: number;
  id: string;
  platform: string;
  positionsCount: number;
  startedAt?: string;
  status: PrototypeStrategyStatus;
  stopLossPercent: number;
  strategyType?: PrototypeStrategyType;
  takeProfitPercent: number;
  traderId: string;
  traderName: string;
  unrealizedPnl?: number;
};

export type PrototypeStrategyCreateInput = {
  exchangeConnectorId: number;
  strategyType: "mario";
} | {
  exchangeConnectorId: number;
  followRatioPercent: 100;
  stopLossPercent: number;
  strategyType: "copyTrading";
  takeProfitPercent: number;
  target: CopyTradingPrototypeTarget;
};

type AccountCenterPrototypeProps = {
  apiConnection: PrototypeApiConnection;
  apiConnections: readonly PrototypeApiConnection[];
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  copy: WorkspaceCopy;
  isApiSetupOpen: boolean;
  isAuthLoading: boolean;
  isCoveredByModal?: boolean;
  isDarkTheme: boolean;
  isOpen: boolean;
  strategies: readonly PrototypeStrategy[];
  telegramUser: TelegramSessionUser | null;
  onApiSetupOpen: () => void;
  onApiSetupOpenChange: (isOpen: boolean) => void;
  onClose: () => void;
  onConnectionDelete: (connectionId: number) => Promise<void> | void;
  onConnectionSave: (input: PrototypeConnectionSaveInput) => void;
  onLogin: () => void;
  onLogout: () => void;
  onStrategyCreate: (input: PrototypeStrategyCreateInput) => Promise<void> | void;
  onStrategyDelete: (strategyId: string) => Promise<void> | void;
  onStrategyStatusChange: (strategyId: string, status: PrototypeStrategyStatus) => Promise<void> | void;
};

type CopyTradingPrototypeModalProps = {
  apiConnection: PrototypeApiConnection;
  apiConnections: readonly PrototypeApiConnection[];
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  strategies: readonly PrototypeStrategy[];
  target: CopyTradingPrototypeTarget | null;
  onClose: () => void;
  onStart: (input: {
    exchangeConnectorId: number;
    stopLossPercent: number;
    takeProfitPercent: number;
    target: CopyTradingPrototypeTarget;
  }) => void;
};

const BINANCE_DEMO_API_MANAGEMENT_URL = "https://demo.binance.com/zh-CN/my/settings/api-management";
const MOCK_MARGIN_BALANCE_MAX = 100000;
const MOCK_MARGIN_BALANCE_PRESETS = [1000, 5000, 10000] as const;
const TRADE_HISTORY_PAGE_SIZE = 50;
const TRADE_HISTORY_KLINE_CANDLE_LIMIT = 360;
const EMPTY_MARKET_CANDLES: readonly MarketCandle[] = [];
const EMPTY_STRUCTURED_SIGNALS: readonly StructuredSignal[] = [];
const KLINE_INTERVAL_MS_BY_INTERVAL: Record<KlineInterval, number> = {
  "1d": 86_400_000,
  "1h": 3_600_000,
  "1m": 60_000,
  "4h": 14_400_000,
  "5m": 300_000,
  "15m": 900_000,
};
const KlineChart = dynamic<KlineChartProps>(
  () => import("@/app/_components/kline-chart").then((module) => module.KlineChart),
  { loading: () => null },
);

export type PrototypeConnectionSaveInput = {
  accountName: string;
  apiKey?: string;
  exchangePlatform: string;
  ipAddress?: string;
  isMock: boolean;
  mockMarginBalance?: number;
  password?: string;
  privateKey?: string;
  secret?: string;
  walletAddress?: string;
};

const EXCHANGES = [
  { id: "binance", apiManagementUrl: "https://www.binance.com/en/my/settings/api-management", connectorExchangePlatform: "Binance", defaultAccountName: "Binance #1", enabled: true, fallback: "BN", logoPath: "/exchanges/binance/brand/icon.png", mode: "api", registrationUrl: "https://accounts.binance.com/register", requiresApiPassword: false, requiresPrivateKey: false, requiresWalletAddress: false },
  { id: "okx", apiManagementUrl: "https://www.okx.com/account/my-api", connectorExchangePlatform: "OKX", defaultAccountName: "OKX #1", enabled: true, fallback: "OK", logoPath: "/exchanges/okx/brand/icon.png", mode: "api", registrationUrl: "https://www.okx.com/join", requiresApiPassword: true, requiresPrivateKey: false, requiresWalletAddress: false },
  { id: "hyperliquid", apiManagementUrl: "https://app.hyperliquid.xyz/API", connectorExchangePlatform: "Hyperliquid", defaultAccountName: "Hyperliquid #1", enabled: true, fallback: "HL", logoPath: "/exchanges/hyperliquid/brand/icon.png", mode: "api", registrationUrl: "https://app.hyperliquid.xyz/", requiresApiPassword: false, requiresPrivateKey: true, requiresWalletAddress: true },
  { id: "aster", apiManagementUrl: "https://www.asterdex.com/en/api-management", connectorExchangePlatform: "Aster", defaultAccountName: "Aster #1", enabled: true, fallback: "AS", logoPath: "/exchanges/aster/brand/icon.png", mode: "api", registrationUrl: "https://www.asterdex.com/en", requiresApiPassword: false, requiresPrivateKey: false, requiresWalletAddress: true },
  { id: "bitget", apiManagementUrl: "https://www.bitget.com/account/newapi", connectorExchangePlatform: "Bitget", defaultAccountName: "Bitget #1", enabled: true, fallback: "BG", logoPath: "/exchanges/bitget/brand/icon.png", mode: "api", registrationUrl: "https://www.bitget.com/register", requiresApiPassword: true, requiresPrivateKey: false, requiresWalletAddress: false },
  { id: "bybit", apiManagementUrl: "https://www.bybit.com/app/user/api-management", connectorExchangePlatform: "Bybit", defaultAccountName: "Bybit #1", enabled: true, fallback: "BY", logoPath: "/exchanges/bybit/brand/icon.png", mode: "api", registrationUrl: "https://www.bybit.com/register", requiresApiPassword: false, requiresPrivateKey: false, requiresWalletAddress: false },
  { id: "gate", apiManagementUrl: "https://www.gate.com/myaccount/apikeys", connectorExchangePlatform: "Gate", defaultAccountName: "Gate #1", enabled: true, fallback: "GT", logoPath: "/exchanges/gate/brand/icon.png", mode: "api", registrationUrl: "https://www.gate.com/signup", requiresApiPassword: false, requiresPrivateKey: false, requiresWalletAddress: false },
  { id: "mockExchange", apiManagementUrl: null, connectorExchangePlatform: "Mock", defaultAccountName: "Mock Exchange #1", enabled: true, fallback: "MX", logoPath: "/exchanges/binance/brand/icon.png", mode: "demo", registrationUrl: null, requiresApiPassword: false, requiresPrivateKey: false, requiresWalletAddress: false },
  { id: "binanceDemo", apiManagementUrl: BINANCE_DEMO_API_MANAGEMENT_URL, connectorExchangePlatform: "Binance", defaultAccountName: "Binance Demo #1", enabled: true, fallback: "BN", logoPath: "/exchanges/binance/brand/icon.png", mode: "demo", registrationUrl: null, requiresApiPassword: false, requiresPrivateKey: false, requiresWalletAddress: false },
] as const;
type PrototypeExchange = typeof EXCHANGES[number];
type PrototypeExchangeId = PrototypeExchange["id"];

export function AccountCenterPrototype({
  apiConnection,
  apiConnections,
  availableSignalSources,
  copy,
  isApiSetupOpen,
  isAuthLoading,
  isCoveredByModal = false,
  isDarkTheme,
  isOpen,
  strategies,
  telegramUser,
  onApiSetupOpen,
  onApiSetupOpenChange,
  onClose,
  onConnectionDelete,
  onConnectionSave,
  onLogin,
  onLogout,
  onStrategyCreate,
  onStrategyDelete,
  onStrategyStatusChange,
}: AccountCenterPrototypeProps) {
  const accountCopy = copy.workspace.accountCenter;
  const isDrawerModal = !isApiSetupOpen && !isCoveredByModal;
  const hasApiConnections = apiConnections.length > 0;
  const [isStrategyCreateOpen, setIsStrategyCreateOpen] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const selectedStrategy = strategies.find((strategy) => strategy.id === selectedStrategyId) ?? null;
  const openStrategyDetail = (strategy: PrototypeStrategy) => {
    if (getPrototypeStrategyType(strategy) === "mario") {
      window.location.assign("/mario-dashboard");
      return;
    }
    setSelectedStrategyId(strategy.id);
  };

  return (
    <>
      {isOpen ? (
        <>
          <button
            aria-label={copy.common.close}
            className={isDarkTheme ? "fixed inset-0 z-[85] bg-black/45 backdrop-blur-[3px]" : "fixed inset-0 z-[85] bg-slate-950/20 backdrop-blur-[3px]"}
            type="button"
            onClick={onClose}
          />
          <aside
            aria-label={accountCopy.drawer.title}
            aria-modal={isDrawerModal ? true : undefined}
            className={isDarkTheme
              ? "fixed inset-x-0 bottom-0 z-[90] flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[28px] border-t border-white/[0.08] bg-[#0F141B] text-slate-100 shadow-[0_-24px_70px_rgba(0,0,0,0.42)] sm:bottom-0 sm:left-auto sm:right-0 sm:top-0 sm:max-h-none sm:w-[min(440px,100vw)] sm:rounded-none sm:border-l sm:border-t-0 sm:shadow-[-24px_0_70px_rgba(0,0,0,0.42)]"
              : "fixed inset-x-0 bottom-0 z-[90] flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[28px] border-t border-[#E5EAF0] bg-[#FAFBFD] text-slate-950 shadow-[0_-24px_70px_rgba(15,23,42,0.18)] sm:bottom-0 sm:left-auto sm:right-0 sm:top-0 sm:max-h-none sm:w-[min(440px,100vw)] sm:rounded-none sm:border-l sm:border-t-0 sm:shadow-[-24px_0_70px_rgba(15,23,42,0.18)]"}
            role="dialog"
          >
            <div className={isDarkTheme ? "border-b border-white/[0.075] px-4 py-4 sm:px-5 sm:py-5" : "border-b border-[#E5EAF0] px-4 py-4 sm:px-5 sm:py-5"}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black tracking-tight">{accountCopy.drawer.title}</h2>
                  <p className={isDarkTheme ? "mt-1 text-sm leading-5 text-slate-400" : "mt-1 text-sm leading-5 text-slate-600"}>
                    {accountCopy.drawer.description}
                  </p>
                </div>
                <button
                  aria-label={copy.common.close}
                  className={isDarkTheme ? "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.075] bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-slate-50" : "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#E5EAF0] bg-white text-slate-500 transition hover:border-[#BFE7FB] hover:text-slate-900"}
                  type="button"
                  onClick={onClose}
                >
                  <span aria-hidden="true" className="text-lg leading-none">×</span>
                </button>
              </div>
              <div className={isDarkTheme ? "mt-5 flex items-center gap-3 rounded-3xl border border-white/[0.075] bg-white/[0.035] p-3" : "mt-5 flex items-center gap-3 rounded-3xl border border-[#E5EAF0] bg-white p-3 shadow-sm"}>
                <TelegramUserAvatar
                  isDarkTheme={isDarkTheme}
                  size="large"
                  user={telegramUser}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black">{getTelegramUserDisplayName(telegramUser, accountCopy.user.demoName)}</div>
                  <div className={isDarkTheme ? "mt-0.5 truncate text-xs text-slate-500" : "mt-0.5 truncate text-xs text-slate-500"}>
                    {telegramUser?.username ? `@${telegramUser.username}` : accountCopy.user.demoSubtitle}
                  </div>
                </div>
                {telegramUser ? (
                  <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={onLogout}>
                    {accountCopy.user.logoutAction}
                  </button>
                ) : (
                  <button className={getPrimaryButtonClassName(isDarkTheme)} disabled={isAuthLoading} type="button" onClick={onLogin}>
                    {isAuthLoading ? accountCopy.user.loading : accountCopy.user.loginAction}
                  </button>
                )}
              </div>
            </div>

            <div className="kol-scroll-area min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              {selectedStrategy ? (
                <StrategyDetailView
                  copy={copy}
                  isDarkTheme={isDarkTheme}
                  strategy={selectedStrategy}
                  telegramUser={telegramUser}
                  onBack={() => setSelectedStrategyId(null)}
                  onStrategyDelete={onStrategyDelete}
                  onStrategyStatusChange={onStrategyStatusChange}
                />
              ) : (
                <>
                  <section className={isDarkTheme ? "rounded-[24px] border border-white/[0.075] bg-white/[0.035] p-4" : "rounded-[24px] border border-[#E5EAF0] bg-white p-4 shadow-sm"}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black">{accountCopy.api.title}</h3>
                        <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-600"}>
                          {hasApiConnections ? accountCopy.api.connectedDescription : accountCopy.api.emptyDescription}
                        </p>
                      </div>
                      <span className={hasApiConnections
                        ? isDarkTheme ? "rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-black text-emerald-300" : "rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700"
                        : isDarkTheme ? "rounded-full bg-slate-700 px-2.5 py-1 text-[11px] font-black text-slate-300" : "rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600"}
                      >
                        {hasApiConnections ? accountCopy.api.connected : accountCopy.api.empty}
                      </span>
                    </div>
                    {hasApiConnections ? (
                      <div className="mt-4 grid gap-3">
                        {apiConnections.map((connection) => (
                          <ApiConnectionCard
                            key={connection.id}
                            accountCopy={accountCopy}
                            apiConnection={connection}
                            isDisabled={isAuthLoading}
                            isDarkTheme={isDarkTheme}
                            onDelete={onConnectionDelete}
                          />
                        ))}
                        <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={onApiSetupOpen}>
                          {accountCopy.api.addAction}
                        </button>
                      </div>
                    ) : (
                      <button className={getPrimaryButtonClassName(isDarkTheme)} type="button" onClick={onApiSetupOpen}>
                        {accountCopy.api.addAction}
                      </button>
                    )}
                  </section>

                  <section className={isDarkTheme ? "rounded-[24px] border border-white/[0.075] bg-white/[0.035] p-4" : "rounded-[24px] border border-[#E5EAF0] bg-white p-4 shadow-sm"}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black">{accountCopy.strategy.title}</h3>
                        <div className={isDarkTheme ? "mt-1 text-xs font-bold text-slate-500" : "mt-1 text-xs font-bold text-slate-400"}>{accountCopy.strategyCreate.count(strategies.length)}</div>
                      </div>
                      <button className={getPrimaryButtonClassName(isDarkTheme)} type="button" onClick={() => setIsStrategyCreateOpen(true)}>
                        {accountCopy.strategyCreate.action}
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3">
                      {strategies.length > 0 ? strategies.map((strategy) => (
                        <PrototypeStrategyCard
                          key={strategy.id}
                          copy={copy}
                          isDarkTheme={isDarkTheme}
                          strategy={strategy}
                          onOpenDetail={openStrategyDetail}
                          onStrategyDelete={onStrategyDelete}
                          onStrategyStatusChange={onStrategyStatusChange}
                        />
                      )) : (
                        <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-[#181A20] px-3 py-4 text-sm leading-5 text-slate-400" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-4 text-sm leading-5 text-slate-600"}>
                          {accountCopy.strategy.empty}
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}
            </div>

            <div className={isDarkTheme ? "border-t border-white/[0.075] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs leading-5 text-slate-500 sm:px-5" : "border-t border-[#E5EAF0] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs leading-5 text-slate-500 sm:px-5"}>
              {accountCopy.drawer.riskNote}
            </div>
          </aside>
        </>
      ) : null}

      {isApiSetupOpen ? (
        <ExchangeApiSetupLayer
          key={apiConnection.accountName}
          copy={copy}
          initialAccountName={apiConnection.status === "connected" ? apiConnection.accountName : ""}
          initialMockMarginBalance={apiConnection.mockMarginBalance}
          isDarkTheme={isDarkTheme}
          onClose={() => onApiSetupOpenChange(false)}
          onSave={(input) => {
            onConnectionSave(input);
            onApiSetupOpenChange(false);
          }}
        />
      ) : null}
      {isStrategyCreateOpen ? (
        <StrategyCreateLayer
          apiConnections={apiConnections}
          availableSignalSources={availableSignalSources}
          copy={copy}
          isDarkTheme={isDarkTheme}
          strategies={strategies}
          onClose={() => setIsStrategyCreateOpen(false)}
          onCreate={onStrategyCreate}
        />
      ) : null}
    </>
  );
}

export function AccountManagementPanel({
  apiConnection,
  apiConnections,
  availableSignalSources,
  copy,
  isApiSetupOpen,
  isAuthLoading,
  isDarkTheme,
  strategies,
  telegramUser,
  onApiSetupOpen,
  onApiSetupOpenChange,
  onConnectionDelete,
  onConnectionSave,
  onLogin,
  onLogout,
  onStrategyCreate,
  onStrategyDelete,
  onStrategyStatusChange,
}: {
  apiConnection: PrototypeApiConnection;
  apiConnections: readonly PrototypeApiConnection[];
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  copy: WorkspaceCopy;
  isApiSetupOpen: boolean;
  isAuthLoading: boolean;
  isDarkTheme: boolean;
  strategies: readonly PrototypeStrategy[];
  telegramUser: TelegramSessionUser | null;
  onApiSetupOpen: () => void;
  onApiSetupOpenChange: (isOpen: boolean) => void;
  onConnectionDelete: (connectionId: number) => Promise<void> | void;
  onConnectionSave: (input: PrototypeConnectionSaveInput) => void;
  onLogin: () => void;
  onLogout: () => void;
  onStrategyCreate: (input: PrototypeStrategyCreateInput) => Promise<void> | void;
  onStrategyDelete: (strategyId: string) => Promise<void> | void;
  onStrategyStatusChange: (strategyId: string, status: PrototypeStrategyStatus) => Promise<void> | void;
}) {
  const accountCopy = copy.workspace.accountCenter;
  const hasApiConnections = apiConnections.length > 0;
  const [isStrategyCreateOpen, setIsStrategyCreateOpen] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const selectedStrategy = strategies.find((strategy) => strategy.id === selectedStrategyId) ?? null;
  const openStrategyDetail = (strategy: PrototypeStrategy) => {
    if (getPrototypeStrategyType(strategy) === "mario") {
      window.location.assign("/mario-dashboard");
      return;
    }
    setSelectedStrategyId(strategy.id);
  };

  return (
    <section className="kol-scroll-area h-full min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 lg:px-6 lg:py-6">
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <header className={isDarkTheme ? "rounded-[28px] border border-white/[0.075] bg-white/[0.035] p-5 text-slate-100" : "rounded-[28px] border border-[#E5EAF0] bg-white p-5 text-slate-950 shadow-sm"}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight">{accountCopy.drawer.title}</h1>
              <p className={isDarkTheme ? "mt-2 max-w-2xl text-sm leading-6 text-slate-400" : "mt-2 max-w-2xl text-sm leading-6 text-slate-600"}>
                {accountCopy.drawer.description}
              </p>
            </div>
            {telegramUser ? (
              <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={onLogout}>
                {accountCopy.user.logoutAction}
              </button>
            ) : (
              <button className={getPrimaryButtonClassName(isDarkTheme)} disabled={isAuthLoading} type="button" onClick={onLogin}>
                {isAuthLoading ? accountCopy.user.loading : accountCopy.user.loginAction}
              </button>
            )}
          </div>
          <div className={isDarkTheme ? "mt-5 flex items-center gap-3 rounded-3xl border border-white/[0.075] bg-white/[0.035] p-3" : "mt-5 flex items-center gap-3 rounded-3xl border border-[#E5EAF0] bg-[#FAFBFD] p-3"}>
            <TelegramUserAvatar isDarkTheme={isDarkTheme} size="large" user={telegramUser} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black">{getTelegramUserDisplayName(telegramUser, accountCopy.user.demoName)}</div>
              <div className="mt-0.5 truncate text-xs text-slate-500">
                {telegramUser?.username ? `@${telegramUser.username}` : accountCopy.user.demoSubtitle}
              </div>
            </div>
          </div>
        </header>

        {selectedStrategy ? (
          <StrategyDetailView
            copy={copy}
            isDarkTheme={isDarkTheme}
            strategy={selectedStrategy}
            telegramUser={telegramUser}
            onBack={() => setSelectedStrategyId(null)}
            onStrategyDelete={onStrategyDelete}
            onStrategyStatusChange={onStrategyStatusChange}
          />
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section className={isDarkTheme ? "rounded-[28px] border border-white/[0.075] bg-white/[0.035] p-4" : "rounded-[28px] border border-[#E5EAF0] bg-white p-4 shadow-sm"}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-black">{accountCopy.api.title}</h2>
                  <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-600"}>
                    {hasApiConnections ? accountCopy.api.connectedDescription : accountCopy.api.emptyDescription}
                  </p>
                </div>
                <span className={hasApiConnections
                  ? isDarkTheme ? "rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-black text-emerald-300" : "rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700"
                  : isDarkTheme ? "rounded-full bg-slate-700 px-2.5 py-1 text-[11px] font-black text-slate-300" : "rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600"}
                >
                  {hasApiConnections ? accountCopy.api.connected : accountCopy.api.empty}
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {hasApiConnections ? apiConnections.map((connection) => (
                  <ApiConnectionCard
                    key={connection.id}
                    accountCopy={accountCopy}
                    apiConnection={connection}
                    isDisabled={isAuthLoading}
                    isDarkTheme={isDarkTheme}
                    onDelete={onConnectionDelete}
                  />
                )) : (
                  <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-[#181A20] px-3 py-4 text-sm leading-5 text-slate-400" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-4 text-sm leading-5 text-slate-600"}>
                    {accountCopy.api.emptyDescription}
                  </div>
                )}
                <button className={getPrimaryButtonClassName(isDarkTheme)} type="button" onClick={onApiSetupOpen}>
                  {accountCopy.api.addAction}
                </button>
              </div>
            </section>

            <section className={isDarkTheme ? "rounded-[28px] border border-white/[0.075] bg-white/[0.035] p-4" : "rounded-[28px] border border-[#E5EAF0] bg-white p-4 shadow-sm"}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black">{accountCopy.strategy.title}</h2>
                  <div className={isDarkTheme ? "mt-1 text-xs font-bold text-slate-500" : "mt-1 text-xs font-bold text-slate-400"}>{accountCopy.strategyCreate.count(strategies.length)}</div>
                </div>
                <button className={getPrimaryButtonClassName(isDarkTheme)} type="button" onClick={() => setIsStrategyCreateOpen(true)}>
                  {accountCopy.strategyCreate.action}
                </button>
              </div>
              <div className="mt-3 grid gap-3">
                {strategies.length > 0 ? strategies.map((strategy) => (
                  <PrototypeStrategyCard
                    key={strategy.id}
                    copy={copy}
                    isDarkTheme={isDarkTheme}
                    strategy={strategy}
                    onOpenDetail={openStrategyDetail}
                    onStrategyDelete={onStrategyDelete}
                    onStrategyStatusChange={onStrategyStatusChange}
                  />
                )) : (
                  <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-[#181A20] px-3 py-4 text-sm leading-5 text-slate-400" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-4 text-sm leading-5 text-slate-600"}>
                    {accountCopy.strategy.empty}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {isApiSetupOpen ? (
        <ExchangeApiSetupLayer
          key={apiConnection.accountName}
          copy={copy}
          initialAccountName=""
          initialMockMarginBalance={apiConnection.mockMarginBalance}
          isDarkTheme={isDarkTheme}
          onClose={() => onApiSetupOpenChange(false)}
          onSave={(input) => {
            onConnectionSave(input);
            onApiSetupOpenChange(false);
          }}
        />
      ) : null}
      {isStrategyCreateOpen ? (
        <StrategyCreateLayer
          apiConnections={apiConnections}
          availableSignalSources={availableSignalSources}
          copy={copy}
          isDarkTheme={isDarkTheme}
          strategies={strategies}
          onClose={() => setIsStrategyCreateOpen(false)}
          onCreate={onStrategyCreate}
        />
      ) : null}
    </section>
  );
}

export function CopyTradingPrototypeModal({
  apiConnection,
  apiConnections,
  copy,
  isDarkTheme,
  strategies,
  target,
  onClose,
  onStart,
}: CopyTradingPrototypeModalProps) {
  const [takeProfitPercent, setTakeProfitPercent] = useState("20");
  const [selectedConnectorId, setSelectedConnectorId] = useState(String(apiConnection.id));
  const [stopLossPercent, setStopLossPercent] = useState("10");
  const accountCopy = copy.workspace.accountCenter;

  const parsedTakeProfit = Number(takeProfitPercent);
  const parsedStopLoss = Number(stopLossPercent);
  const occupiedConnectorIds = useMemo(() => new Set(strategies
    .filter((strategy) => strategy.status !== "stopped")
    .map((strategy) => strategy.exchangeConnectorId)), [strategies]);
  const availableApiConnections = useMemo(() => apiConnections.filter((connection) =>
    connection.status === "connected" && !occupiedConnectorIds.has(connection.id),
  ), [apiConnections, occupiedConnectorIds]);
  const selectedApiConnection = availableApiConnections.find((connection) => String(connection.id) === selectedConnectorId) ?? availableApiConnections[0] ?? null;
  const selectedTradingAccountId = selectedApiConnection ? String(selectedApiConnection.id) : "";
  const canStart = Boolean(target)
    && selectedApiConnection !== null
    && selectedApiConnection.status === "connected"
    && Number.isFinite(parsedTakeProfit)
    && Number.isFinite(parsedStopLoss)
    && parsedTakeProfit > 0
    && parsedStopLoss > 0;

  if (!target) {
    return null;
  }

  return (
    <>
      <button
        aria-label={copy.common.close}
        className={isDarkTheme ? "fixed inset-0 z-[95] bg-black/52 backdrop-blur-[4px]" : "fixed inset-0 z-[95] bg-slate-950/24 backdrop-blur-[4px]"}
        type="button"
        onClick={onClose}
      />
      <section
        aria-label={accountCopy.copyTrading.modalTitle}
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-[100] max-h-[92dvh] overflow-hidden rounded-t-[28px] shadow-[0_-24px_80px_rgba(15,23,42,0.24)] sm:inset-x-3 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:max-h-[min(720px,calc(100dvh-2rem))] sm:max-w-[520px] sm:-translate-y-1/2 sm:rounded-[28px] sm:shadow-[0_28px_90px_rgba(15,23,42,0.24)]"
        role="dialog"
      >
        <div className={isDarkTheme ? "flex max-h-[92dvh] flex-col border border-white/[0.085] bg-[#111820] text-slate-100 sm:max-h-[min(720px,calc(100dvh-2rem))]" : "flex max-h-[92dvh] flex-col border border-[#D5E4EF] bg-white text-slate-950 sm:max-h-[min(720px,calc(100dvh-2rem))]"}>
          <div className={isDarkTheme ? "border-b border-white/[0.075] px-4 py-4 sm:px-5 sm:py-5" : "border-b border-[#E5EAF0] px-4 py-4 sm:px-5 sm:py-5"}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={isDarkTheme ? "text-[11px] font-black uppercase tracking-[0.16em] text-sky-300" : "text-[11px] font-black uppercase tracking-[0.16em] text-[#008DCC]"}>{accountCopy.copyTrading.copyMode}</div>
                <h2 className="mt-2 text-xl font-black tracking-tight">{accountCopy.copyTrading.modalTitle}</h2>
              </div>
              <button aria-label={copy.common.close} className={getIconButtonClassName(isDarkTheme)} type="button" onClick={onClose}>
                <span aria-hidden="true" className="text-lg leading-none">×</span>
              </button>
            </div>
            <div className={isDarkTheme ? "mt-5 flex items-center gap-3 rounded-3xl border border-white/[0.075] bg-white/[0.035] p-3" : "mt-5 flex items-center gap-3 rounded-3xl border border-[#E5EAF0] bg-[#FAFBFD] p-3"}>
              <SourceAvatar isDarkTheme={isDarkTheme} name={target.trader.name} url={target.trader.avatar} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black">{target.trader.name}</div>
                <div className={isDarkTheme ? "mt-1 flex flex-wrap gap-2 text-xs font-bold text-slate-500" : "mt-1 flex flex-wrap gap-2 text-xs font-bold text-slate-500"}>
                  <span>{target.trader.platform}</span>
                  <span>{copy.workspace.topSignals.currentPositions}: {target.positionsCount}</span>
                  <span>{copy.workspace.topSignals.tradeHistory}: {target.eventsCount}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="kol-scroll-area min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            <label className="block">
              <span className={getLabelClassName(isDarkTheme)}>{accountCopy.copyTrading.apiSelect}</span>
              {availableApiConnections.length > 0 ? (
                <TradingAccountSelect
                  accountCopy={accountCopy}
                  connections={availableApiConnections}
                  isDarkTheme={isDarkTheme}
                  value={selectedTradingAccountId}
                  onChange={setSelectedConnectorId}
                />
              ) : (
                <div className={isDarkTheme ? "mt-2 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-3 text-sm font-bold" : "mt-2 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-3 text-sm font-bold"}>
                  {apiConnections.length > 0 ? accountCopy.copyTrading.noAvailableAccount : accountCopy.copyTrading.apiRequired}
                </div>
              )}
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <PercentInput
                copyLabel={accountCopy.copyTrading.takeProfit}
                fieldName="take-profit"
                isDarkTheme={isDarkTheme}
                placeholder={accountCopy.copyTrading.takeProfitPlaceholder}
                value={takeProfitPercent}
                onChange={setTakeProfitPercent}
              />
              <PercentInput
                copyLabel={accountCopy.copyTrading.stopLoss}
                fieldName="stop-loss"
                isDarkTheme={isDarkTheme}
                placeholder={accountCopy.copyTrading.stopLossPlaceholder}
                value={stopLossPercent}
                onChange={setStopLossPercent}
              />
            </div>
            <div className={isDarkTheme ? "rounded-2xl border border-amber-300/15 bg-amber-300/[0.07] px-3 py-3 text-xs leading-5 text-amber-100/80" : "rounded-2xl border border-amber-100 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800"}>
              <div>{accountCopy.copyTrading.futureOnly}</div>
              <div className="mt-1">{accountCopy.copyTrading.riskNote}</div>
            </div>
          </div>

          <div className={isDarkTheme ? "grid grid-cols-2 gap-2 border-t border-white/[0.075] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:items-center sm:justify-end sm:px-5" : "grid grid-cols-2 gap-2 border-t border-[#E5EAF0] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:items-center sm:justify-end sm:px-5"}>
            <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={onClose}>{copy.common.close}</button>
            <button
              className={getPrimaryButtonClassName(isDarkTheme)}
              disabled={!canStart}
              type="button"
              onClick={() => {
                if (!canStart) {
                  return;
                }
                if (!selectedApiConnection) {
                  return;
                }
                onStart({
                  exchangeConnectorId: selectedApiConnection.id,
                  stopLossPercent: parsedStopLoss,
                  takeProfitPercent: parsedTakeProfit,
                  target,
                });
              }}
            >
              {accountCopy.copyTrading.start}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function StrategyCreateLayer({
  apiConnections,
  availableSignalSources,
  copy,
  isDarkTheme,
  strategies,
  onClose,
  onCreate,
}: {
  apiConnections: readonly PrototypeApiConnection[];
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  strategies: readonly PrototypeStrategy[];
  onClose: () => void;
  onCreate: (input: PrototypeStrategyCreateInput) => Promise<void> | void;
}) {
  const accountCopy = copy.workspace.accountCenter;
  const strategyCreateCopy = accountCopy.strategyCreate;
  const [strategyType, setStrategyType] = useState<PrototypeStrategyType>("copyTrading");
  const [selectedConnectorId, setSelectedConnectorId] = useState("");
  const [selectedSignalSourceId, setSelectedSignalSourceId] = useState("");
  const [takeProfitPercent, setTakeProfitPercent] = useState("20");
  const [stopLossPercent, setStopLossPercent] = useState("10");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const occupiedConnectorIds = useMemo(() => new Set(strategies
    .filter((strategy) => strategy.status !== "stopped")
    .map((strategy) => strategy.exchangeConnectorId)), [strategies]);
  const availableApiConnections = useMemo(() => apiConnections.filter((connection) =>
    connection.status === "connected" && !occupiedConnectorIds.has(connection.id),
  ), [apiConnections, occupiedConnectorIds]);
  const selectedApiConnection = availableApiConnections.find((connection) => String(connection.id) === selectedConnectorId) ?? availableApiConnections[0] ?? null;
  const selectedTradingAccountId = selectedApiConnection ? String(selectedApiConnection.id) : "";
  const selectedSignalSource = availableSignalSources.find((target) => target.trader.trader_id === selectedSignalSourceId) ?? availableSignalSources[0] ?? null;
  const parsedTakeProfit = Number(takeProfitPercent);
  const parsedStopLoss = Number(stopLossPercent);
  const canCreate = selectedApiConnection !== null
    && !isSubmitting
    && (strategyType === "mario" || (
      selectedSignalSource !== null
      && Number.isFinite(parsedTakeProfit)
      && Number.isFinite(parsedStopLoss)
      && parsedTakeProfit > 0
      && parsedStopLoss > 0
    ));


  const submitStrategy = async () => {
    if (!canCreate || !selectedApiConnection) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      if (strategyType === "mario") {
        await onCreate({
          exchangeConnectorId: selectedApiConnection.id,
          strategyType: "mario",
        });
      } else if (selectedSignalSource) {
        await onCreate({
          exchangeConnectorId: selectedApiConnection.id,
          followRatioPercent: 100,
          stopLossPercent: parsedStopLoss,
          strategyType: "copyTrading",
          takeProfitPercent: parsedTakeProfit,
          target: selectedSignalSource,
        });
      }
      onClose();
    } catch (error) {
      setSubmitError(getTradingFoxErrorMessage(error, copy));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        aria-label={copy.common.close}
        className={isDarkTheme ? "fixed inset-0 z-[95] bg-black/52 backdrop-blur-[4px]" : "fixed inset-0 z-[95] bg-slate-950/24 backdrop-blur-[4px]"}
        type="button"
        onClick={onClose}
      />
      <section
        aria-label={strategyCreateCopy.modalTitle}
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-[100] max-h-[92dvh] overflow-hidden rounded-t-[28px] shadow-[0_-24px_80px_rgba(15,23,42,0.24)] sm:inset-x-3 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:max-h-[min(760px,calc(100dvh-2rem))] sm:max-w-[560px] sm:-translate-y-1/2 sm:rounded-[28px] sm:shadow-[0_28px_90px_rgba(15,23,42,0.24)]"
        role="dialog"
      >
        <div className={isDarkTheme ? "flex max-h-[92dvh] flex-col border border-white/[0.085] bg-[#111820] text-slate-100 sm:max-h-[min(760px,calc(100dvh-2rem))]" : "flex max-h-[92dvh] flex-col border border-[#D5E4EF] bg-white text-slate-950 sm:max-h-[min(760px,calc(100dvh-2rem))]"}>
          <div className={isDarkTheme ? "border-b border-white/[0.075] px-4 py-4 sm:px-5 sm:py-5" : "border-b border-[#E5EAF0] px-4 py-4 sm:px-5 sm:py-5"}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={isDarkTheme ? "text-[11px] font-black uppercase tracking-[0.16em] text-sky-300" : "text-[11px] font-black uppercase tracking-[0.16em] text-[#008DCC]"}>{strategyCreateCopy.modalEyebrow}</div>
                <h2 className="mt-2 text-xl font-black tracking-tight">{strategyCreateCopy.modalTitle}</h2>
                <p className={isDarkTheme ? "mt-2 text-sm leading-5 text-slate-400" : "mt-2 text-sm leading-5 text-slate-600"}>{strategyCreateCopy.modalDescription}</p>
              </div>
              <button aria-label={copy.common.close} className={getIconButtonClassName(isDarkTheme)} type="button" onClick={onClose}>
                <span aria-hidden="true" className="text-lg leading-none">×</span>
              </button>
            </div>
          </div>

          <div className="kol-scroll-area min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            <section className="grid gap-3 sm:grid-cols-2">
              <StrategyTypeOptionButton
                description={strategyCreateCopy.copyTradingDescription}
                isDarkTheme={isDarkTheme}
                isSelected={strategyType === "copyTrading"}
                title={strategyCreateCopy.copyTradingTitle}
                onSelect={() => setStrategyType("copyTrading")}
              />
              <StrategyTypeOptionButton
                description={strategyCreateCopy.marioDescription}
                isDarkTheme={isDarkTheme}
                isSelected={strategyType === "mario"}
                title={strategyCreateCopy.marioTitle}
                onSelect={() => setStrategyType("mario")}
              />
            </section>

            <label className="block">
              <span className={getLabelClassName(isDarkTheme)}>{strategyCreateCopy.apiSelect}</span>
              {availableApiConnections.length > 0 ? (
                <TradingAccountSelect
                  accountCopy={accountCopy}
                  connections={availableApiConnections}
                  isDarkTheme={isDarkTheme}
                  value={selectedTradingAccountId}
                  onChange={setSelectedConnectorId}
                />
              ) : (
                <div className={isDarkTheme ? "mt-2 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-3 text-sm font-bold" : "mt-2 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-3 text-sm font-bold"}>
                  {apiConnections.length > 0 ? strategyCreateCopy.noAvailableAccount : accountCopy.copyTrading.apiRequired}
                </div>
              )}
            </label>

            {strategyType === "copyTrading" ? (
              <>
                <label className="block">
                  <span className={getLabelClassName(isDarkTheme)}>{strategyCreateCopy.signalSourceSelect}</span>
                  {availableSignalSources.length > 0 ? (
                    <SignalSourceSelect
                      copy={copy}
                      isDarkTheme={isDarkTheme}
                      sources={availableSignalSources}
                      value={selectedSignalSource?.trader.trader_id ?? ""}
                      onChange={setSelectedSignalSourceId}
                    />
                  ) : (
                    <div className={isDarkTheme ? "mt-2 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-3 text-sm font-bold" : "mt-2 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-3 text-sm font-bold"}>
                      {strategyCreateCopy.signalSourceEmpty}
                    </div>
                  )}
                </label>
                <div className={isDarkTheme ? "rounded-2xl border border-sky-300/15 bg-sky-300/[0.07] px-3 py-3" : "rounded-2xl border border-sky-100 bg-sky-50 px-3 py-3"}>
                  <div className={isDarkTheme ? "text-[11px] font-black uppercase tracking-[0.14em] text-sky-200/70" : "text-[11px] font-black uppercase tracking-[0.14em] text-sky-700/70"}>{strategyCreateCopy.followRatioLabel}</div>
                  <div className={isDarkTheme ? "mt-1 text-sm font-black text-sky-100" : "mt-1 text-sm font-black text-sky-800"}>{strategyCreateCopy.followRatioValue}</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <PercentInput
                    copyLabel={accountCopy.copyTrading.takeProfit}
                    fieldName="create-take-profit"
                    isDarkTheme={isDarkTheme}
                    placeholder={accountCopy.copyTrading.takeProfitPlaceholder}
                    value={takeProfitPercent}
                    onChange={setTakeProfitPercent}
                  />
                  <PercentInput
                    copyLabel={accountCopy.copyTrading.stopLoss}
                    fieldName="create-stop-loss"
                    isDarkTheme={isDarkTheme}
                    placeholder={accountCopy.copyTrading.stopLossPlaceholder}
                    value={stopLossPercent}
                    onChange={setStopLossPercent}
                  />
                </div>
                <div className={isDarkTheme ? "rounded-2xl border border-amber-300/15 bg-amber-300/[0.07] px-3 py-3 text-xs leading-5 text-amber-100/80" : "rounded-2xl border border-amber-100 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800"}>
                  {strategyCreateCopy.copyTradingRiskNote}
                </div>
              </>
            ) : (
              <div className={isDarkTheme ? "rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.07] px-3 py-3 text-xs leading-5 text-emerald-100/80" : "rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-800"}>
                {strategyCreateCopy.marioDashboardHint}
              </div>
            )}

            {submitError ? <p className={getInlineErrorClassName(isDarkTheme)}>{submitError}</p> : null}
          </div>

          <div className={isDarkTheme ? "grid grid-cols-2 gap-2 border-t border-white/[0.075] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:items-center sm:justify-end sm:px-5" : "grid grid-cols-2 gap-2 border-t border-[#E5EAF0] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:items-center sm:justify-end sm:px-5"}>
            <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={onClose}>{copy.common.close}</button>
            <button className={getPrimaryButtonClassName(isDarkTheme)} disabled={!canCreate} type="button" onClick={() => void submitStrategy()}>
              {isSubmitting ? strategyCreateCopy.starting : strategyCreateCopy.start}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function StrategyTypeOptionButton({
  description,
  isDarkTheme,
  isSelected,
  title,
  onSelect,
}: {
  description: string;
  isDarkTheme: boolean;
  isSelected: boolean;
  title: string;
  onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={getStrategyTypeOptionClassName(isDarkTheme, isSelected)}
      type="button"
      onClick={onSelect}
    >
      <span className="block text-sm font-black">{title}</span>
      <span className={isDarkTheme ? "mt-2 block text-xs leading-5 text-slate-400" : "mt-2 block text-xs leading-5 text-slate-600"}>{description}</span>
    </button>
  );
}

function SignalSourceSelect({
  copy,
  isDarkTheme,
  sources,
  value,
  onChange,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  sources: readonly CopyTradingPrototypeTarget[];
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedSource = sources.find((source) => source.trader.trader_id === value) ?? sources[0];

  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange}>
      <SelectPrimitive.Trigger
        className={isDarkTheme
          ? "mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-left text-sm font-bold text-slate-100 outline-none transition hover:bg-white/[0.055] focus:border-sky-400/45 focus:ring-2 focus:ring-sky-400/10 data-[placeholder]:text-slate-500"
          : "mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[#D5E4EF] bg-white px-3 py-2 text-left text-sm font-bold text-slate-950 shadow-sm outline-none transition hover:bg-[#F8FAFC] focus:border-[#7DBEFF] focus:ring-2 focus:ring-[#16AFF5]/10 data-[placeholder]:text-slate-400"}
      >
        <SignalSourceOptionContent copy={copy} isDarkTheme={isDarkTheme} target={selectedSource} />
        <SelectPrimitive.Icon asChild>
          <span aria-hidden="true" className={isDarkTheme ? "text-xs text-slate-500" : "text-xs text-slate-400"}>⌄</span>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={isDarkTheme
            ? "z-[130] max-h-[300px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-white/[0.075] bg-[#111820] p-1 text-slate-100 shadow-[0_18px_44px_rgba(0,0,0,0.38)]"
            : "z-[130] max-h-[300px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-[#D5E4EF] bg-white p-1 text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.14)]"}
          position="popper"
          sideOffset={8}
        >
          <SelectPrimitive.Viewport className="grid gap-1">
            {sources.map((target) => (
              <SelectPrimitive.Item
                key={target.trader.trader_id}
                className={isDarkTheme
                  ? "flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left outline-none transition data-[highlighted]:bg-white/[0.055] data-[state=checked]:bg-sky-400/10 data-[state=checked]:text-sky-100"
                  : "flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left outline-none transition data-[highlighted]:bg-[#F8FAFC] data-[state=checked]:bg-[#EAF8FE] data-[state=checked]:text-[#007DB8]"}
                value={target.trader.trader_id}
              >
                <SelectPrimitive.ItemText asChild>
                  <SignalSourceOptionContent copy={copy} isDarkTheme={isDarkTheme} target={target} />
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="text-xs font-black">✓</SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

function SignalSourceOptionContent({
  copy,
  isDarkTheme,
  target,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  target: CopyTradingPrototypeTarget;
}) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <SourceAvatar isDarkTheme={isDarkTheme} name={target.trader.name} url={target.trader.avatar} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black">{target.trader.name}</span>
        <span className={isDarkTheme ? "mt-0.5 block truncate text-xs font-semibold text-slate-500" : "mt-0.5 block truncate text-xs font-semibold text-slate-500"}>
          {target.trader.platform} · {copy.workspace.topSignals.currentPositions}: {target.positionsCount} · {copy.workspace.topSignals.tradeHistory}: {target.eventsCount}
        </span>
      </span>
    </span>
  );
}

function ApiConnectionCard({
  accountCopy,
  apiConnection,
  isDisabled,
  isDarkTheme,
  onDelete,
}: {
  accountCopy: WorkspaceCopy["workspace"]["accountCenter"];
  apiConnection: PrototypeApiConnection;
  isDisabled: boolean;
  isDarkTheme: boolean;
  onDelete: (connectionId: number) => Promise<void> | void;
}) {
  const exchangeLabel = getConnectionExchangeLabel(accountCopy, apiConnection);
  const exchange = getConnectionExchange(apiConnection);

  return (
    <div className={isDarkTheme ? "rounded-3xl border border-emerald-400/10 bg-emerald-400/[0.06] p-3" : "rounded-3xl border border-emerald-100 bg-emerald-50/70 p-3"}>
      <div className="flex items-start gap-3">
        <AccountConnectionExchangeIcon
          exchange={exchange}
          fallback={getConnectionFallback(apiConnection)}
          isDarkTheme={isDarkTheme}
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="truncate text-sm font-black">{apiConnection.accountName}</div>
            {apiConnection.isMock ? (
              <span className={isDarkTheme ? "rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black text-emerald-200" : "rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700"}>
                {accountCopy.api.mockBadge}
              </span>
            ) : null}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MiniMetric isDarkTheme={isDarkTheme} label={accountCopy.api.accountType} value={exchangeLabel} />
            <MiniMetric
              isDarkTheme={isDarkTheme}
              label={accountCopy.api.accountBalance}
              value={formatAccountBalance(apiConnection.accountBalance)}
            />
          </div>
          {apiConnection.whitelistIp ? (
            <div className={isDarkTheme ? "mt-3 rounded-2xl border border-emerald-300/10 bg-[#0F141B]/60 px-3 py-2" : "mt-3 rounded-2xl border border-emerald-100 bg-white/70 px-3 py-2"}>
              <div className={isDarkTheme ? "text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200/60" : "text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700/60"}>
                {accountCopy.apiSetup.whitelistIp}
              </div>
              <div className={isDarkTheme ? "mt-1 font-mono text-xs font-black text-emerald-100" : "mt-1 font-mono text-xs font-black text-emerald-800"}>
                {apiConnection.whitelistIp}
              </div>
            </div>
          ) : null}
          <div className={isDarkTheme ? "mt-3 text-xs text-emerald-200/70" : "mt-3 text-xs text-emerald-700/75"}>
            #{apiConnection.id} · {accountCopy.api.updatedAt}: {apiConnection.connectedAtLabel || "--"}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              className={getDangerButtonClassName(isDarkTheme)}
              disabled={isDisabled}
              type="button"
              onClick={() => void onDelete(apiConnection.id)}
            >
              {accountCopy.api.deleteAction}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExchangeResourceLinks({
  accountCopy,
  exchange,
  isDarkTheme,
}: {
  accountCopy: WorkspaceCopy["workspace"]["accountCenter"];
  exchange: PrototypeExchange;
  isDarkTheme: boolean;
}) {
  const links: Array<{ href: string; label: string }> = [];
  if (exchange.registrationUrl) {
    links.push({ href: exchange.registrationUrl, label: accountCopy.apiSetup.registerRebate });
  }
  if (exchange.apiManagementUrl) {
    links.push({ href: exchange.apiManagementUrl, label: accountCopy.apiSetup.createApi });
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex shrink-0 flex-nowrap gap-2 xl:ml-auto xl:justify-end">
      {links.map((link) => (
        <a
          key={link.label}
          className={getExchangeResourceLinkClassName(isDarkTheme)}
          href={link.href}
          rel="noreferrer"
          target="_blank"
        >
          <span className="whitespace-nowrap">{link.label}</span>
          <ExternalLinkGlyph />
        </a>
      ))}
    </div>
  );
}

function AccountConnectionExchangeIcon({
  exchange,
  fallback,
  isDarkTheme,
}: {
  exchange: PrototypeExchange | null;
  fallback: string;
  isDarkTheme: boolean;
}) {
  const logoPath = exchange?.logoPath ?? "";
  const [failedLogoPath, setFailedLogoPath] = useState<string | null>(null);
  const canShowLogo = Boolean(logoPath) && failedLogoPath !== logoPath;
  const shellClassName = isDarkTheme
    ? "relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[16px] bg-emerald-400/10 text-xs font-black text-emerald-200"
    : "relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[16px] bg-white text-xs font-black text-emerald-700 shadow-sm";

  return (
    <div className={shellClassName}>
      <span className="leading-none">{fallback}</span>
      {canShowLogo ? (
        <Image
          alt=""
          className="absolute h-8 w-8 rounded-[10px] object-contain"
          height={32}
          loading="lazy"
          src={logoPath}
          unoptimized
          width={32}
          onError={() => setFailedLogoPath(logoPath)}
        />
      ) : null}
    </div>
  );
}

function TradingAccountSelect({
  accountCopy,
  connections,
  isDarkTheme,
  value,
  onChange,
}: {
  accountCopy: WorkspaceCopy["workspace"]["accountCenter"];
  connections: readonly PrototypeApiConnection[];
  isDarkTheme: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedConnection = connections.find((connection) => String(connection.id) === value) ?? connections[0];

  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange}>
      <SelectPrimitive.Trigger
        className={isDarkTheme
          ? "mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-left text-sm font-bold text-slate-100 outline-none transition hover:bg-white/[0.055] focus:border-sky-400/45 focus:ring-2 focus:ring-sky-400/10 data-[placeholder]:text-slate-500"
          : "mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[#D5E4EF] bg-white px-3 py-2 text-left text-sm font-bold text-slate-950 shadow-sm outline-none transition hover:bg-[#F8FAFC] focus:border-[#7DBEFF] focus:ring-2 focus:ring-[#16AFF5]/10 data-[placeholder]:text-slate-400"}
      >
        <TradingAccountOptionContent accountCopy={accountCopy} connection={selectedConnection} isDarkTheme={isDarkTheme} />
        <SelectPrimitive.Icon asChild>
          <span aria-hidden="true" className={isDarkTheme ? "text-xs text-slate-500" : "text-xs text-slate-400"}>⌄</span>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={isDarkTheme
            ? "z-[130] max-h-[260px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-white/[0.075] bg-[#111820] p-1 text-slate-100 shadow-[0_18px_44px_rgba(0,0,0,0.38)]"
            : "z-[130] max-h-[260px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-[#D5E4EF] bg-white p-1 text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.14)]"}
          position="popper"
          sideOffset={8}
        >
          <SelectPrimitive.Viewport className="grid gap-1">
            {connections.map((connection) => (
              <SelectPrimitive.Item
                key={connection.id}
                className={isDarkTheme
                  ? "flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left outline-none transition data-[highlighted]:bg-white/[0.055] data-[state=checked]:bg-sky-400/10 data-[state=checked]:text-sky-100"
                  : "flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left outline-none transition data-[highlighted]:bg-[#F8FAFC] data-[state=checked]:bg-[#EAF8FE] data-[state=checked]:text-[#007DB8]"}
                value={String(connection.id)}
              >
                <SelectPrimitive.ItemText asChild>
                  <TradingAccountOptionContent accountCopy={accountCopy} connection={connection} isDarkTheme={isDarkTheme} />
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="text-xs font-black">✓</SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

function TradingAccountOptionContent({
  accountCopy,
  connection,
  isDarkTheme,
}: {
  accountCopy: WorkspaceCopy["workspace"]["accountCenter"];
  connection: PrototypeApiConnection;
  isDarkTheme: boolean;
}) {
  const exchangeLabel = getConnectionExchangeLabel(accountCopy, connection);

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black">{connection.accountName}</span>
        <span className={isDarkTheme ? "mt-0.5 block truncate text-xs font-semibold text-slate-500" : "mt-0.5 block truncate text-xs font-semibold text-slate-500"}>
          {exchangeLabel} · {formatAccountBalance(connection.accountBalance)}
        </span>
      </span>
      {connection.isMock ? (
        <span className={isDarkTheme ? "shrink-0 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black text-emerald-200" : "shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700"}>
          {accountCopy.api.mockBadge}
        </span>
      ) : null}
    </span>
  );
}

function getConnectionExchangeLabel(
  accountCopy: WorkspaceCopy["workspace"]["accountCenter"],
  connection: PrototypeApiConnection,
): string {
  const exchange = getConnectionExchange(connection);

  return exchange
    ? getExchangeName(accountCopy, exchange.id)
    : connection.exchangePlatform || accountCopy.exchanges.mockExchange;
}

function getConnectionFallback(connection: PrototypeApiConnection): string {
  return getConnectionExchange(connection)?.fallback ?? createExchangeFallback(connection.exchangePlatform);
}

function getConnectionExchange(connection: PrototypeApiConnection): PrototypeExchange | null {
  const normalizedPlatform = normalizeConnectionExchangePlatform(connection.exchangePlatform);
  if (connection.isMock && isBinanceDemoConnectionPlatform(connection.exchangePlatform)) {
    return getExchangeById("binanceDemo");
  }

  return EXCHANGES.find((exchange) =>
    normalizeConnectionExchangePlatform(exchange.connectorExchangePlatform) === normalizedPlatform
      && (connection.isMock ? exchange.mode === "demo" : exchange.mode === "api"),
  ) ?? null;
}

function isBinanceDemoConnectionPlatform(value: string): boolean {
  const normalizedPlatform = normalizeConnectionExchangePlatform(value);
  return normalizedPlatform === "binance" || normalizedPlatform === "binancedemo" || normalizedPlatform === "bn";
}

function normalizeConnectionExchangePlatform(value: string): string {
  return value.replace(/[\s_-]/gu, "").toLowerCase();
}

function createExchangeFallback(exchangePlatform: string): string {
  const fallback = exchangePlatform.replace(/[^a-z0-9]/giu, "").slice(0, 2).toUpperCase();
  return fallback || "API";
}

export function AccountEntryButton({
  copy,
  isAuthLoading,
  isDarkTheme,
  telegramUser,
  onOpen,
}: {
  copy: WorkspaceCopy;
  isAuthLoading: boolean;
  isDarkTheme: boolean;
  telegramUser: TelegramSessionUser | null;
  onOpen: () => void;
}) {
  const accountCopy = copy.workspace.accountCenter;
  const className = isDarkTheme
    ? "group inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.075] bg-white/[0.035] p-0 text-left text-slate-200 transition hover:bg-white/[0.08] hover:text-slate-50 sm:h-10 sm:w-auto sm:justify-start sm:gap-2 sm:py-1 sm:pl-1 sm:pr-3"
    : "group inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#D5E4EF] bg-white p-0 text-left text-slate-700 shadow-sm transition hover:border-[#BFE7FB] hover:bg-[#F4FBFF] hover:text-slate-950 sm:h-10 sm:w-auto sm:justify-start sm:gap-2 sm:py-1 sm:pl-1 sm:pr-3";

  return (
    <button aria-label={accountCopy.drawer.openAccount} className={className} type="button" onClick={onOpen}>
      <TelegramUserAvatar
        isDarkTheme={isDarkTheme}
        size="compact"
        user={telegramUser}
      />
      <span className="hidden min-w-0 sm:block">
        <span className="block max-w-[112px] truncate text-xs font-black leading-tight">
          {isAuthLoading ? accountCopy.user.loading : getTelegramUserDisplayName(telegramUser, accountCopy.user.loginAction)}
        </span>
        <span className={isDarkTheme ? "block max-w-[112px] truncate text-[10px] font-bold leading-tight text-slate-500" : "block max-w-[112px] truncate text-[10px] font-bold leading-tight text-slate-500"}>
          {telegramUser?.username ? `@${telegramUser.username}` : accountCopy.user.demoSubtitle}
        </span>
      </span>
    </button>
  );
}

function TelegramUserAvatar({
  isDarkTheme,
  size,
  user,
}: {
  isDarkTheme: boolean;
  size: "compact" | "large" | "table";
  user: TelegramSessionUser | null;
}) {
  const baseClassName = size === "large"
    ? "grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-cover bg-center text-sm font-black"
    : size === "table"
      ? "grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-cover bg-center text-xs font-black"
      : "grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-cover bg-center text-[10px] font-black sm:h-8 sm:w-8 sm:text-[11px]";
  const colorClassName = isDarkTheme
    ? "bg-sky-400/15 text-sky-200"
    : "bg-[#EAF8FE] text-[#008DCC]";
  const avatarStyle = user?.avatarUrl ? { backgroundImage: `url("${user.avatarUrl}")` } : undefined;

  return (
    <span
      aria-hidden="true"
      className={`${baseClassName} ${colorClassName}`}
      style={avatarStyle}
    >
      {user?.avatarUrl ? null : getTelegramUserInitials(user)}
    </span>
  );
}

function getTelegramUserDisplayName(user: TelegramSessionUser | null, fallback: string): string {
  return user?.username ? `@${user.username}` : (user?.name ?? fallback);
}

function getTelegramUserInitials(user: TelegramSessionUser | null): string {
  const label = user?.username ?? user?.name ?? "SK";
  const letters = label
    .replace(/^@/u, "")
    .split(/\s+/u)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return letters || "SK";
}

function ExchangeApiSetupLayer({
  copy,
  initialAccountName,
  initialMockMarginBalance,
  isDarkTheme,
  onClose,
  onSave,
}: {
  copy: WorkspaceCopy;
  initialAccountName: string;
  initialMockMarginBalance: number | null;
  isDarkTheme: boolean;
  onClose: () => void;
  onSave: (input: PrototypeConnectionSaveInput) => void;
}) {
  const [selectedExchangeId, setSelectedExchangeId] = useState<PrototypeExchangeId>("binance");
  const selectedExchange = getExchangeById(selectedExchangeId);
  const [accountName, setAccountName] = useState(initialAccountName || selectedExchange.defaultAccountName);
  const [mockMarginBalance, setMockMarginBalance] = useState(String(initialMockMarginBalance ?? 10000));
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [apiPassword, setApiPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [hasCopiedIp, setHasCopiedIp] = useState(false);
  const [whitelistIp, setWhitelistIp] = useState("");
  const [whitelistIpError, setWhitelistIpError] = useState("");
  const [isWhitelistIpLoading, setIsWhitelistIpLoading] = useState(false);
  const accountCopy = copy.workspace.accountCenter;
  const isDemoExchange = selectedExchange.mode === "demo";
  const isBuiltInMockExchange = selectedExchange.id === "mockExchange";
  const isBinanceDemoExchange = selectedExchange.id === "binanceDemo";
  const isLiveExchange = !isDemoExchange;
  const isHyperliquidExchange = selectedExchange.id === "hyperliquid";
  const requiresApiCredentials = !isBuiltInMockExchange && !isHyperliquidExchange;
  const requiresApiPassword = selectedExchange.requiresApiPassword;
  const requiresWalletAddress = selectedExchange.requiresWalletAddress;
  const requiresPrivateKey = selectedExchange.requiresPrivateKey;
  const parsedMockMarginBalance = Number(mockMarginBalance);
  const hasValidMockMarginBalance = Number.isFinite(parsedMockMarginBalance) && parsedMockMarginBalance > 0 && parsedMockMarginBalance <= MOCK_MARGIN_BALANCE_MAX;
  const hasApiCredentials = !requiresApiCredentials || (apiKey.trim().length > 0 && secret.trim().length > 0);
  const hasApiPassword = !requiresApiPassword || apiPassword.trim().length > 0;
  const hasWalletAddress = !requiresWalletAddress || walletAddress.trim().length > 0;
  const hasPrivateKey = !requiresPrivateKey || privateKey.trim().length > 0;
  const hasWhitelistIp = whitelistIp.trim().length > 0;
  const walletAddressLabel = isHyperliquidExchange ? accountCopy.apiSetup.mainWalletAddress : accountCopy.apiSetup.walletAddress;
  const walletAddressPlaceholder = isHyperliquidExchange ? accountCopy.apiSetup.mainWalletAddressPlaceholder : accountCopy.apiSetup.walletAddressPlaceholder;

  const canSave = isBuiltInMockExchange
    ? accountName.trim().length > 0 && hasValidMockMarginBalance
    : isBinanceDemoExchange
      ? accountName.trim().length > 0 && hasApiCredentials
      : accountName.trim().length > 0 && hasApiCredentials && hasApiPassword && hasWalletAddress && hasPrivateKey && hasWhitelistIp && !isWhitelistIpLoading;

  useEffect(() => {
    let isMounted = true;

    async function loadWhitelistIp() {
      if (!isLiveExchange) {
        if (!isMounted) {
          return;
        }
        setWhitelistIp("");
        setWhitelistIpError("");
        setIsWhitelistIpLoading(false);
        return;
      }

      setWhitelistIp("");
      setWhitelistIpError("");
      setHasCopiedIp(false);
      setIsWhitelistIpLoading(true);
      try {
        const nextWhitelistIp = await requestTradingFoxConnectorWhitelistIP(selectedExchange.connectorExchangePlatform);
        if (!isMounted) {
          return;
        }
        setWhitelistIp(nextWhitelistIp);
        setWhitelistIpError(nextWhitelistIp ? "" : accountCopy.apiSetup.whitelistIpUnavailable);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setWhitelistIp("");
        setWhitelistIpError(error instanceof Error ? error.message : accountCopy.apiSetup.whitelistIpUnavailable);
      } finally {
        if (isMounted) {
          setIsWhitelistIpLoading(false);
        }
      }
    }

    void loadWhitelistIp();

    return () => {
      isMounted = false;
    };
  }, [accountCopy.apiSetup.whitelistIpUnavailable, isLiveExchange, selectedExchange.connectorExchangePlatform]);

  const updateMockMarginBalance = (value: string) => {
    const normalizedValue = value.replace(/[^\d.]/gu, "");
    const parsedValue = Number(normalizedValue);
    if (Number.isFinite(parsedValue) && parsedValue > MOCK_MARGIN_BALANCE_MAX) {
      setMockMarginBalance(String(MOCK_MARGIN_BALANCE_MAX));
      return;
    }

    setMockMarginBalance(normalizedValue);
  };
  const chooseExchange = (exchange: PrototypeExchange) => {
    if (!exchange.enabled) {
      return;
    }

    const previousDefaultAccountName = selectedExchange.defaultAccountName;
    setSelectedExchangeId(exchange.id);
    setHasCopiedIp(false);
    setApiKey("");
    setSecret("");
    setApiPassword("");
    setWalletAddress("");
    setPrivateKey("");
    setAccountName((currentAccountName) => {
      const trimmedAccountName = currentAccountName.trim();
      if (trimmedAccountName.length > 0 && trimmedAccountName !== previousDefaultAccountName) {
        return currentAccountName;
      }

      return exchange.defaultAccountName;
    });
  };

  return (
    <>
      <button
        aria-label={copy.common.close}
        className={isDarkTheme ? "fixed inset-0 z-[110] bg-black/58 backdrop-blur-[5px]" : "fixed inset-0 z-[110] bg-slate-950/28 backdrop-blur-[5px]"}
        type="button"
        onClick={onClose}
      />
      <section
        aria-label={accountCopy.apiSetup.title}
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-[115] max-h-[94dvh] overflow-hidden rounded-t-[30px] shadow-[0_-26px_88px_rgba(15,23,42,0.26)] sm:inset-x-3 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:max-h-[min(860px,calc(100dvh-2rem))] sm:max-w-[920px] sm:-translate-y-1/2 sm:rounded-[30px] sm:shadow-[0_30px_90px_rgba(15,23,42,0.26)]"
        role="dialog"
      >
        <form
          className={isDarkTheme ? "flex max-h-[94dvh] flex-col border border-white/[0.085] bg-[#111820] text-slate-100 sm:max-h-[min(860px,calc(100dvh-2rem))]" : "flex max-h-[94dvh] flex-col border border-[#D5E4EF] bg-white text-slate-950 sm:max-h-[min(860px,calc(100dvh-2rem))]"}
          onSubmit={(event) => event.preventDefault()}
        >
          <header className={isDarkTheme ? "border-b border-white/[0.075] px-4 py-4 sm:px-5 sm:py-5" : "border-b border-[#E5EAF0] px-4 py-4 sm:px-5 sm:py-5"}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className={isDarkTheme ? "text-[11px] font-black uppercase tracking-[0.16em] text-sky-300" : "text-[11px] font-black uppercase tracking-[0.16em] text-[#008DCC]"}>
                  {accountCopy.apiSetup.selectExchange}
                </div>
                <h2 className="mt-2 text-xl font-black tracking-tight">{accountCopy.apiSetup.title}</h2>
                <p className={isDarkTheme ? "mt-2 max-w-2xl text-sm leading-6 text-slate-400" : "mt-2 max-w-2xl text-sm leading-6 text-slate-600"}>
                  {accountCopy.apiSetup.subtitle}
                </p>
              </div>
              <button aria-label={copy.common.close} className={getIconButtonClassName(isDarkTheme)} type="button" onClick={onClose}>
                <span aria-hidden="true" className="text-lg leading-none">×</span>
              </button>
            </div>
          </header>

          <div className="kol-scroll-area min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className={isDarkTheme ? "rounded-[24px] border border-white/[0.075] bg-white/[0.035] p-3" : "rounded-[24px] border border-[#E5EAF0] bg-[#FAFBFD] p-3"}>
                <div className={isDarkTheme ? "px-1 pb-2 text-xs font-black text-slate-300" : "px-1 pb-2 text-xs font-black text-slate-700"}>
                  {accountCopy.apiSetup.selectExchange}
                </div>
                <div className="kol-scroll-area flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
                  {EXCHANGES.map((exchange) => (
                    <button
                      key={exchange.id}
                      className={getExchangeButtonClassName(isDarkTheme, exchange.enabled, exchange.id === selectedExchangeId)}
                      disabled={!exchange.enabled}
                      type="button"
                      onClick={() => chooseExchange(exchange)}
                    >
                      <ExchangeIcon enabled={exchange.enabled} exchange={exchange} isDarkTheme={isDarkTheme} />
                      <span className="min-w-0 flex-1 whitespace-nowrap text-sm font-black">{getExchangeName(accountCopy, exchange.id)}</span>
                      {!exchange.enabled ? (
                        <span className={isDarkTheme ? "shrink-0 text-[10px] font-bold text-slate-500" : "shrink-0 text-[10px] font-bold text-slate-400"}>{accountCopy.apiSetup.comingSoon}</span>
                      ) : exchange.mode === "demo" ? (
                        <span className={isDarkTheme ? "shrink-0 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black text-emerald-300" : "shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700"}>{accountCopy.apiSetup.demoBadge}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </aside>

              <main className="grid min-w-0 gap-4">
                <section className={getModalSectionClassName(isDarkTheme)}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <ExchangeIcon enabled exchange={selectedExchange} isDarkTheme={isDarkTheme} />
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-black">{getExchangeName(accountCopy, selectedExchange.id)}</h3>
                        <div className={isDarkTheme ? "mt-1 text-xs font-bold text-slate-500" : "mt-1 text-xs font-bold text-slate-500"}>
                          {isDemoExchange ? accountCopy.apiSetup.demoMode : accountCopy.apiSetup.enabledExchange}
                        </div>
                      </div>
                    </div>
                    {isBuiltInMockExchange ? (
                      <span className={isDarkTheme ? "rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200" : "rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"}>
                        {accountCopy.apiSetup.noKeysRequired}
                      </span>
                    ) : isBinanceDemoExchange ? (
                      <span className={isDarkTheme ? "rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200" : "rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"}>
                        {accountCopy.apiSetup.noWhitelistIpRequired}
                      </span>
                    ) : null}
                    <ExchangeResourceLinks accountCopy={accountCopy} exchange={selectedExchange} isDarkTheme={isDarkTheme} />
                  </div>
                </section>

                {isDemoExchange ? (
                  <section className={getModalSectionClassName(isDarkTheme)}>
                    <h3 className="text-base font-black">{accountCopy.apiSetup.demoTitle}</h3>
                    <p className={isDarkTheme ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-600"}>
                      {selectedExchange.id === "mockExchange" ? accountCopy.apiSetup.mockExchangeDescription : accountCopy.apiSetup.binanceDemoDescription}
                    </p>
                    <div className={isDarkTheme ? "mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] px-3 py-3 text-xs leading-5 text-emerald-100/85" : "mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-800"}>
                      {accountCopy.apiSetup.demoRiskNote}
                    </div>
                    <div className="mt-4 grid gap-3">
                      <PrototypeInput autoComplete="off" fieldName="account-name" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.accountName} value={accountName} onChange={setAccountName} />
                      {requiresApiCredentials ? (
                        <>
                          <PrototypeInput autoComplete="off" fieldName="api-key" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.apiKey} placeholder={accountCopy.apiSetup.apiKeyPlaceholder} value={apiKey} onChange={setApiKey} />
                          <PrototypeInput autoComplete="new-password" fieldName="secret" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.secret} placeholder={accountCopy.apiSetup.secretPlaceholder} type="password" value={secret} onChange={setSecret} />
                          {requiresApiPassword ? (
                            <PrototypeInput autoComplete="new-password" fieldName="api-password" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.apiPassword} placeholder={accountCopy.apiSetup.apiPasswordPlaceholder} type="password" value={apiPassword} onChange={setApiPassword} />
                          ) : null}
                        </>
                      ) : null}
                      {isBuiltInMockExchange ? (
                      <div>
                        <PrototypeInput
                          autoComplete="off"
                          fieldName="mock-margin-balance"
                          inputMode="decimal"
                          isDarkTheme={isDarkTheme}
                          label={accountCopy.apiSetup.mockMarginBalance}
                          placeholder={accountCopy.apiSetup.mockMarginBalancePlaceholder}
                          value={mockMarginBalance}
                          onChange={updateMockMarginBalance}
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          {MOCK_MARGIN_BALANCE_PRESETS.map((amount) => (
                            <button
                              key={amount}
                              className={getSoftButtonClassName(isDarkTheme)}
                              type="button"
                              onClick={() => setMockMarginBalance(String(amount))}
                            >
                              {formatAccountBalance(amount)}
                            </button>
                          ))}
                        </div>
                        <p className={isDarkTheme ? "mt-2 text-xs leading-5 text-slate-500" : "mt-2 text-xs leading-5 text-slate-500"}>{accountCopy.apiSetup.mockMarginBalanceLimit}</p>
                      </div>
                      ) : null}
                    </div>
                    <p className={isDarkTheme ? "mt-3 text-xs leading-5 text-slate-500" : "mt-3 text-xs leading-5 text-slate-500"}>{accountCopy.apiSetup.sensitiveNote}</p>
                  </section>
                ) : (
                  <>
                    <section className={getModalSectionClassName(isDarkTheme)}>
                      <div className={getLabelClassName(isDarkTheme)}>{accountCopy.apiSetup.whitelistIp}</div>
                      <div className="mt-2 flex items-stretch gap-2">
                        <div className={isDarkTheme ? "flex min-h-11 min-w-0 flex-1 items-center break-all rounded-[18px] border border-white/[0.085] bg-[#0F141B] px-3 font-mono text-sm font-black tracking-[0.045em] text-slate-100" : "flex min-h-11 min-w-0 flex-1 items-center break-all rounded-[18px] border border-[#D5E4EF] bg-[#F8FAFC] px-3 font-mono text-sm font-black tracking-[0.045em] text-slate-900"}>
                          {isWhitelistIpLoading ? accountCopy.apiSetup.whitelistIpLoading : (whitelistIp || accountCopy.apiSetup.whitelistIpUnavailable)}
                        </div>
                        <button
                          aria-label={accountCopy.apiSetup.copyWhitelistIp}
                          className={getWhitelistCopyButtonClassName(isDarkTheme)}
                          disabled={!hasWhitelistIp}
                          title={accountCopy.apiSetup.copyWhitelistIp}
                          type="button"
                          onClick={() => {
                            setHasCopiedIp(true);
                            void navigator.clipboard?.writeText(whitelistIp);
                          }}
                        >
                          {hasCopiedIp ? <CheckGlyph /> : <CopyGlyph />}
                        </button>
                      </div>
                      <p className={whitelistIpError
                        ? isDarkTheme ? "mt-3 text-xs leading-5 text-amber-200" : "mt-3 text-xs leading-5 text-amber-700"
                        : isDarkTheme ? "mt-3 text-xs leading-5 text-slate-500" : "mt-3 text-xs leading-5 text-slate-500"}
                      >
                        {whitelistIpError || accountCopy.apiSetup.whitelistIpDescription}
                      </p>
                    </section>

                    <section className={getModalSectionClassName(isDarkTheme)}>
                      <h3 className="text-base font-black">{accountCopy.api.title}</h3>
                      <p className={isDarkTheme ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-600"}>
                        {accountCopy.apiSetup.liveExchangeDescription}
                      </p>
                      <div className="mt-4 grid gap-3">
                        <PrototypeInput autoComplete="off" fieldName="account-name" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.accountName} value={accountName} onChange={setAccountName} />
                        {requiresApiCredentials ? (
                          <>
                            <PrototypeInput autoComplete="off" fieldName="api-key" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.apiKey} placeholder={accountCopy.apiSetup.apiKeyPlaceholder} value={apiKey} onChange={setApiKey} />
                            <PrototypeInput autoComplete="new-password" fieldName="secret" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.secret} placeholder={accountCopy.apiSetup.secretPlaceholder} type="password" value={secret} onChange={setSecret} />
                            {requiresApiPassword ? (
                              <PrototypeInput autoComplete="new-password" fieldName="api-password" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.apiPassword} placeholder={accountCopy.apiSetup.apiPasswordPlaceholder} type="password" value={apiPassword} onChange={setApiPassword} />
                            ) : null}
                          </>
                        ) : null}
                        {requiresWalletAddress ? (
                          <PrototypeInput autoComplete="off" fieldName="wallet-address" isDarkTheme={isDarkTheme} label={walletAddressLabel} placeholder={walletAddressPlaceholder} value={walletAddress} onChange={setWalletAddress} />
                        ) : null}
                        {requiresPrivateKey ? (
                          <PrototypeInput autoComplete="new-password" fieldName="private-key" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.privateKey} placeholder={accountCopy.apiSetup.privateKeyPlaceholder} type="password" value={privateKey} onChange={setPrivateKey} />
                        ) : null}
                      </div>
                      <p className={isDarkTheme ? "mt-3 text-xs leading-5 text-slate-500" : "mt-3 text-xs leading-5 text-slate-500"}>{accountCopy.apiSetup.sensitiveNote}</p>
                    </section>
                  </>
                )}

              </main>
            </div>
          </div>

          <footer className={isDarkTheme ? "grid grid-cols-2 gap-2 border-t border-white/[0.075] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:px-5" : "grid grid-cols-2 gap-2 border-t border-[#E5EAF0] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:px-5"}>
            <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={onClose}>{copy.common.close}</button>
            <button
              className={getPrimaryButtonClassName(isDarkTheme)}
              disabled={!canSave}
              type="button"
              onClick={() => onSave({
                accountName: accountName.trim() || selectedExchange.defaultAccountName,
                apiKey: requiresApiCredentials ? apiKey.trim() : undefined,
                exchangePlatform: selectedExchange.connectorExchangePlatform,
                ipAddress: isLiveExchange ? whitelistIp.trim() : undefined,
                isMock: isDemoExchange,
                mockMarginBalance: isBuiltInMockExchange && hasValidMockMarginBalance ? parsedMockMarginBalance : undefined,
                password: requiresApiPassword ? apiPassword.trim() : undefined,
                privateKey: requiresPrivateKey ? privateKey.trim() : undefined,
                secret: requiresApiCredentials ? secret.trim() : undefined,
                walletAddress: requiresWalletAddress ? walletAddress.trim() : undefined,
              })}
            >
              {accountCopy.apiSetup.save}
            </button>
          </footer>
        </form>
      </section>
    </>
  );
}

function PrototypeStrategyCard({
  copy,
  isDarkTheme,
  strategy,
  onOpenDetail,
  onStrategyDelete,
  onStrategyStatusChange,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  strategy: PrototypeStrategy;
  onOpenDetail: (strategy: PrototypeStrategy) => void;
  onStrategyDelete: (strategyId: string) => Promise<void> | void;
  onStrategyStatusChange: (strategyId: string, status: PrototypeStrategyStatus) => Promise<void> | void;
}) {
  const accountCopy = copy.workspace.accountCenter;
  const strategyCopy = accountCopy.strategy;
  const strategyType = getPrototypeStrategyType(strategy);
  const statusLabel = getStrategyStatusLabel(strategyCopy, strategy.status);
  const typeLabel = strategyType === "mario" ? accountCopy.strategyCreate.marioTypeChip : accountCopy.strategyCreate.copyTradingTypeChip;

  return (
    <article className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-[#181A20] p-3" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3"}>
      <button
        className="block w-full text-left"
        type="button"
        onClick={() => onOpenDetail(strategy)}
      >
      <div className="flex items-start gap-3">
        <SourceAvatar isDarkTheme={isDarkTheme} name={strategy.traderName} url={strategy.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h4 className="truncate text-sm font-black">{strategy.traderName}</h4>
            <span className={getStrategyStatusClassName(isDarkTheme, strategy.status)}>{statusLabel}</span>
            <span className={isDarkTheme ? "shrink-0 rounded-full bg-white/[0.055] px-2 py-0.5 text-[10px] font-black text-slate-300" : "shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-500"}>{typeLabel}</span>
          </div>
          <div className={isDarkTheme ? "mt-1 text-xs font-bold text-slate-500" : "mt-1 text-xs font-bold text-slate-500"}>
            {strategy.platform} · {strategy.apiAccountName}
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <MiniMetric isDarkTheme={isDarkTheme} label={copy.workspace.topSignals.currentPositions} value={String(strategy.positionsCount)} />
        <MiniMetric isDarkTheme={isDarkTheme} label={copy.workspace.topSignals.tradeHistory} value={String(strategy.eventsCount)} />
        <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.accountEquity} value={formatDetailCurrency(strategy.accountEquity)} />
        <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.unrealizedPnl} value={formatSignedDetailCurrency(strategy.unrealizedPnl)} valueClassName={getPnlClassName(isDarkTheme, numberOrZero(strategy.unrealizedPnl))} />
      </div>
      <p className={isDarkTheme ? "mt-3 text-[11px] leading-5 text-slate-500" : "mt-3 text-[11px] leading-5 text-slate-500"}>
        {strategyType === "mario" ? accountCopy.strategyCreate.marioCardHint : strategyCopy.stopNote}
      </p>
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        {strategy.status === "running" ? (
          <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={() => onStrategyStatusChange(strategy.id, "paused")}>{strategyCopy.pause}</button>
        ) : (
          <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={() => onStrategyStatusChange(strategy.id, "running")}>{strategyCopy.resume}</button>
        )}
        <button className={getDangerButtonClassName(isDarkTheme)} type="button" onClick={() => onStrategyDelete(strategy.id)}>{strategyCopy.delete}</button>
      </div>
    </article>
  );
}

function StrategyDetailView({
  copy,
  isDarkTheme,
  strategy,
  telegramUser,
  onBack,
  onStrategyDelete,
  onStrategyStatusChange,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  strategy: PrototypeStrategy;
  telegramUser: TelegramSessionUser | null;
  onBack: () => void;
  onStrategyDelete: (strategyId: string) => Promise<void> | void;
  onStrategyStatusChange: (strategyId: string, status: PrototypeStrategyStatus) => Promise<void> | void;
}) {
  const [detail, setDetail] = useState<TradingFoxStrategyDetail | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [syncRatioPercent, setSyncRatioPercent] = useState("100");
  const [syncError, setSyncError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [isSyncingPositions, setIsSyncingPositions] = useState(false);
  const [isUpdatingLifecycle, setIsUpdatingLifecycle] = useState(false);
  const [isDeletingStrategy, setIsDeletingStrategy] = useState(false);
  const [tradeHistoryPageOffset, setTradeHistoryPageOffset] = useState(0);
  const [isTradeKlineOpen, setIsTradeKlineOpen] = useState(false);
  const [selectedTradeKlineRowId, setSelectedTradeKlineRowId] = useState<string | null>(null);
  const [tradeKlineInterval, setTradeKlineInterval] = useState<KlineInterval>("15m");
  const strategyCopy = copy.workspace.accountCenter.strategy;

  useEffect(() => {
    let isMounted = true;

    const loadDetail = async () => {
      setIsLoading(true);
      setError("");
      try {
        const nextDetail = await requestStrategyDetail(strategy.id, {
          orderLimit: TRADE_HISTORY_PAGE_SIZE,
          orderOffset: tradeHistoryPageOffset,
        });
        if (isMounted) {
          setDetail(nextDetail);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getTradingFoxErrorMessage(loadError, copy));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [copy, strategy.id, tradeHistoryPageOffset]);

  const liveStrategy = detail?.strategy ?? strategy;
  const parsedSyncRatioPercent = Number(syncRatioPercent);
  const canSyncPositions = Boolean(detail?.trader.enabled) && Number.isFinite(parsedSyncRatioPercent) && parsedSyncRatioPercent > 0 && !isSyncingPositions;
  const orderItems = detail?.orderHistory?.items ?? [];
  const signalSourceOrderItems = detail?.orderHistory?.signalSourceOrders ?? [];
  const tradeLogItems = detail?.orderHistory?.tradeLogs ?? [];
  const signalSourceIdentityById = createSignalSourceIdentityById(detail?.signalSources ?? [], liveStrategy);
  const tradeHistoryOffset = detail?.orderHistory?.offset ?? tradeHistoryPageOffset;
  const allTradeHistoryRows = filterTradeHistoryRowsByStrategyStart(createTradeHistoryRows({
    orders: orderItems,
    signalSourceIdentityById,
    signalSourceOrders: signalSourceOrderItems,
    strategy: liveStrategy,
    tradeLogs: tradeLogItems,
  }), liveStrategy);
  const visibleTradeHistoryRows = allTradeHistoryRows.slice(tradeHistoryOffset, tradeHistoryOffset + TRADE_HISTORY_PAGE_SIZE);
  const selectedTradeKlineRow = visibleTradeHistoryRows.find((row) => row.id === selectedTradeKlineRowId) ?? visibleTradeHistoryRows.find((row) => row.kind === "me") ?? visibleTradeHistoryRows[0] ?? null;
  const hasPreviousTradeHistoryPage = tradeHistoryOffset > 0;
  const hasNextTradeHistoryPage = allTradeHistoryRows.length > tradeHistoryOffset + TRADE_HISTORY_PAGE_SIZE || Boolean(detail?.orderHistory?.hasMore);
  const shouldShowTradeHistoryPagination = hasPreviousTradeHistoryPage || hasNextTradeHistoryPage;
  const tradeHistoryRangeLabel = createOpenEndedPageRangeLabel(tradeHistoryOffset, visibleTradeHistoryRows.length);
  const detailPositions = detail?.positions ?? EMPTY_TRADING_FOX_POSITIONS;
  const copyPositionMarkPricesBySymbol = useMemo(
    () => createCopyPositionMarkPricesBySymbol(detailPositions),
    [detailPositions],
  );

  const openTradeKline = (row: TradeHistoryRow) => {
    setSelectedTradeKlineRowId(row.id);
    setIsTradeKlineOpen(true);
  };

  const toggleTradeKline = () => {
    if (!selectedTradeKlineRow) {
      return;
    }

    setSelectedTradeKlineRowId(selectedTradeKlineRow.id);
    setIsTradeKlineOpen((currentValue) => !currentValue);
  };

  const showPreviousTradeHistoryPage = () => {
    setTradeHistoryPageOffset((currentOffset) => Math.max(0, currentOffset - TRADE_HISTORY_PAGE_SIZE));
  };

  const showNextTradeHistoryPage = () => {
    setTradeHistoryPageOffset((currentOffset) => currentOffset + TRADE_HISTORY_PAGE_SIZE);
  };

  const syncPositions = async () => {
    if (!canSyncPositions) {
      return;
    }

    setIsSyncingPositions(true);
    setSyncError("");
    setSyncMessage("");
    try {
      const nextDetail = await requestStrategyPositionSync(liveStrategy.id, parsedSyncRatioPercent);
      setDetail(nextDetail);
      setTradeHistoryPageOffset(0);
      setSyncMessage(strategyCopy.syncPositionsSuccess);
    } catch (syncPositionsError) {
      setSyncError(getTradingFoxErrorMessage(syncPositionsError, copy));
    } finally {
      setIsSyncingPositions(false);
    }
  };

  const updateLifecycle = async (status: PrototypeStrategyStatus) => {
    setIsUpdatingLifecycle(true);
    setSyncError("");
    try {
      await onStrategyStatusChange(liveStrategy.id, status);
      setDetail(await requestStrategyDetail(liveStrategy.id, {
        orderLimit: TRADE_HISTORY_PAGE_SIZE,
        orderOffset: tradeHistoryPageOffset,
      }));
    } catch (lifecycleError) {
      setSyncError(getTradingFoxErrorMessage(lifecycleError, copy));
    } finally {
      setIsUpdatingLifecycle(false);
    }
  };

  const deleteStrategy = async () => {
    setIsDeletingStrategy(true);
    setSyncError("");
    try {
      await onStrategyDelete(liveStrategy.id);
      onBack();
    } catch (deleteError) {
      setSyncError(getTradingFoxErrorMessage(deleteError, copy));
    } finally {
      setIsDeletingStrategy(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className={getModalSectionClassName(isDarkTheme)}>
        <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={onBack}>← {strategyCopy.back}</button>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <SourceAvatar isDarkTheme={isDarkTheme} name={liveStrategy.traderName} url={liveStrategy.avatarUrl} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-black">{liveStrategy.traderName}</h3>
                <span className={getStrategyStatusClassName(isDarkTheme, liveStrategy.status)}>{getStrategyStatusLabel(strategyCopy, liveStrategy.status)}</span>
              </div>
              <p className={isDarkTheme ? "mt-1 text-xs font-bold text-slate-500" : "mt-1 text-xs font-bold text-slate-500"}>
                #{liveStrategy.id} · {liveStrategy.platform} · {liveStrategy.apiAccountName}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 lg:self-end">
            {liveStrategy.status === "running" ? (
              <button className={getSoftButtonClassName(isDarkTheme)} disabled={isUpdatingLifecycle} type="button" onClick={() => void updateLifecycle("paused")}>{isUpdatingLifecycle ? strategyCopy.updating : strategyCopy.pause}</button>
            ) : (
              <button className={getPrimaryButtonClassName(isDarkTheme)} disabled={isUpdatingLifecycle} type="button" onClick={() => void updateLifecycle("running")}>{isUpdatingLifecycle ? strategyCopy.updating : strategyCopy.resume}</button>
            )}
            <button className={getDangerButtonClassName(isDarkTheme)} disabled={isDeletingStrategy} type="button" onClick={() => void deleteStrategy()}>{isDeletingStrategy ? strategyCopy.deleting : strategyCopy.delete}</button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs lg:grid-cols-4">
          <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.accountEquity} value={formatDetailCurrency(detail?.account?.equity)} />
          <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.positionCount} value={String(detail?.positions.length ?? liveStrategy.positionsCount)} />
          <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.signalSourceCount} value={String(detail?.signalSources.length ?? 0)} />
          <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.traderOrders} value={String(orderItems.length)} />
        </div>
        {detail?.trader.statusMessage ? (
          <p className={isDarkTheme ? "mt-3 whitespace-pre-line break-words text-xs leading-5 text-amber-200" : "mt-3 whitespace-pre-line break-words text-xs leading-5 text-amber-700"}>
            {getTradingFoxErrorMessage(detail.trader.statusMessage, copy)}
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <div className={getModalSectionClassName(isDarkTheme)}>{strategyCopy.loadingDetail}</div>
      ) : error ? (
        <div className={getErrorPanelClassName(isDarkTheme)}>{error}</div>
      ) : detail ? (
        <>
          <section className={getModalSectionClassName(isDarkTheme)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-sm font-black">{strategyCopy.syncPositions}</h3>
                <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-500" : "mt-1 text-xs leading-5 text-slate-500"}>{strategyCopy.syncPositionsHint}</p>
              </div>
              <div className="flex gap-2">
                <div className="relative w-28">
                  <input
                    className={isDarkTheme ? "h-10 w-full rounded-xl border border-white/[0.075] bg-white/[0.035] px-3 pr-7 text-sm font-black text-slate-100 outline-none transition focus:border-sky-400/45" : "h-10 w-full rounded-xl border border-[#D5E4EF] bg-white px-3 pr-7 text-sm font-black text-slate-950 outline-none transition focus:border-[#7DBEFF]"}
                    inputMode="decimal"
                    placeholder={strategyCopy.ratioPlaceholder}
                    value={syncRatioPercent}
                    onChange={(event) => setSyncRatioPercent(event.target.value)}
                  />
                  <span className={isDarkTheme ? "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500" : "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400"}>%</span>
                </div>
                <button className={getPrimaryButtonClassName(isDarkTheme)} disabled={!canSyncPositions} type="button" onClick={syncPositions}>
                  {isSyncingPositions ? strategyCopy.syncingPositions : strategyCopy.syncPositions}
                </button>
              </div>
            </div>
            {syncMessage ? <p className={isDarkTheme ? "mt-3 text-xs text-emerald-200" : "mt-3 text-xs text-emerald-700"}>{syncMessage}</p> : null}
            {syncError ? <p className={getInlineErrorClassName(isDarkTheme)}>{syncError}</p> : null}
            {!detail.trader.enabled ? <p className={isDarkTheme ? "mt-3 text-xs text-amber-200" : "mt-3 text-xs text-amber-700"}>{strategyCopy.syncPositionsDisabled}</p> : null}
          </section>

          <section className={getModalSectionClassName(isDarkTheme)}>
            <h3 className="text-sm font-black">{strategyCopy.copyPositions}</h3>
            {detail.positionsError ? <p className={getInlineErrorClassName(isDarkTheme)}>{getTradingFoxErrorMessage(detail.positionsError, copy)}</p> : null}
            {detail.positions.length > 0 ? (
              <>
                <PositionSummaryPanel
                  isDarkTheme={isDarkTheme}
                  strategyCopy={strategyCopy}
                  summary={createCopyPositionSummary(detail)}
                />
                <CopyPositionTable isDarkTheme={isDarkTheme} positions={detail.positions} strategyCopy={strategyCopy} />
              </>
            ) : <div className={isDarkTheme ? "mt-3 text-sm text-slate-500" : "mt-3 text-sm text-slate-500"}>{strategyCopy.copyPositionsEmpty}</div>}
          </section>

          <section className={getModalSectionClassName(isDarkTheme)}>
            <h3 className="text-sm font-black">{strategyCopy.signalSourcePositions}</h3>
            {detail.signalSourcesError ? <p className={getInlineErrorClassName(isDarkTheme)}>{getTradingFoxErrorMessage(detail.signalSourcesError, copy)}</p> : null}
            <div className="mt-3 grid gap-2">
              {detail.signalSources.length > 0 ? detail.signalSources.map((source) => (
                <div key={source.signalSourceId} className={isDarkTheme ? "rounded-2xl bg-white/[0.035] p-3" : "rounded-2xl bg-[#F8FAFC] p-3"}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-black">{source.name || source.signalSourceId}</div>
                    <div className={isDarkTheme ? "text-xs font-bold text-slate-500" : "text-xs font-bold text-slate-500"}>{strategyCopy.followSide}: {source.followSide || "both"}</div>
                  </div>
                  <PositionSummaryPanel
                    isDarkTheme={isDarkTheme}
                    strategyCopy={strategyCopy}
                    summary={createSignalSourcePositionSummary(source, copyPositionMarkPricesBySymbol)}
                  />
                  {source.positions.length > 0 ? (
                    <SignalSourcePositionTable
                      copyPositionMarkPricesBySymbol={copyPositionMarkPricesBySymbol}
                      isDarkTheme={isDarkTheme}
                      positions={source.positions}
                      strategyCopy={strategyCopy}
                    />
                  ) : <div className={isDarkTheme ? "mt-3 text-xs text-slate-500" : "mt-3 text-xs text-slate-500"}>{strategyCopy.signalSourcePositionsEmpty}</div>}
                </div>
              )) : <div className={isDarkTheme ? "text-sm text-slate-500" : "text-sm text-slate-500"}>{strategyCopy.signalSourcePositionsEmpty}</div>}
            </div>
          </section>

          <section className={getModalSectionClassName(isDarkTheme)}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black">{strategyCopy.tradeHistory}</h3>
                <div className={isDarkTheme ? "mt-1 text-[11px] font-bold text-slate-500" : "mt-1 text-[11px] font-bold text-slate-400"}>
                  {tradeHistoryRangeLabel}
                </div>
              </div>
              <button
                className={getSoftButtonClassName(isDarkTheme)}
                disabled={!selectedTradeKlineRow}
                type="button"
                onClick={toggleTradeKline}
              >
                {isTradeKlineOpen ? strategyCopy.hideKline : strategyCopy.viewKline}
              </button>
            </div>
            {detail.orderHistoryError ? <p className={getInlineErrorClassName(isDarkTheme)}>{getTradingFoxErrorMessage(detail.orderHistoryError, copy)}</p> : null}
            {isTradeKlineOpen && selectedTradeKlineRow ? (
              <TradeHistoryKlinePanel
                copy={copy}
                interval={tradeKlineInterval}
                isDarkTheme={isDarkTheme}
                row={selectedTradeKlineRow}
                rows={allTradeHistoryRows}
                strategy={liveStrategy}
                onIntervalChange={setTradeKlineInterval}
              />
            ) : null}
            {visibleTradeHistoryRows.length > 0 ? (
              <>
                <TradeHistoryTable
                  activeKlineRowId={selectedTradeKlineRow?.id ?? null}
                  isDarkTheme={isDarkTheme}
                  rows={visibleTradeHistoryRows}
                  strategyCopy={strategyCopy}
                  telegramUser={telegramUser}
                  onRowKlineOpen={openTradeKline}
                />
                {shouldShowTradeHistoryPagination ? (
                  <div className="mt-3">
                    <RowsPaginationControls
                      canGoNext={hasNextTradeHistoryPage}
                      canGoPrevious={hasPreviousTradeHistoryPage}
                      isDarkTheme={isDarkTheme}
                      nextLabel={strategyCopy.nextTradeHistoryPage}
                      previousLabel={strategyCopy.previousTradeHistoryPage}
                      rangeLabel={tradeHistoryRangeLabel}
                      onNext={showNextTradeHistoryPage}
                      onPrevious={showPreviousTradeHistoryPage}
                    />
                  </div>
                ) : null}
              </>
            ) : <div className={isDarkTheme ? "mt-3 text-sm text-slate-500" : "mt-3 text-sm text-slate-500"}>{strategyCopy.noTradeHistory}</div>}
          </section>

        </>
      ) : null}
    </section>
  );
}

async function requestTradingFoxConnectorWhitelistIP(exchangePlatform: string): Promise<string> {
  const query = new URLSearchParams({ exchangePlatform });
  const response = await fetch(`/api/tradingfox/connectors/whitelist-ip?${query.toString()}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await response.json() as {
    error?: string;
    ipAddress?: { address?: string };
    whitelistIp?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error || `Whitelist IP request failed with status ${response.status}.`);
  }
  const ipAddress = typeof payload.ipAddress?.address === "string" ? payload.ipAddress.address.trim() : "";
  return ipAddress || (typeof payload.whitelistIp === "string" ? payload.whitelistIp.trim() : "");
}

async function requestStrategyDetail(
  strategyId: string,
  options: { orderLimit?: number; orderOffset?: number } = {},
): Promise<TradingFoxStrategyDetail> {
  const query = new URLSearchParams();
  if (options.orderLimit !== undefined) {
    query.set("orderLimit", String(options.orderLimit));
  }
  if (options.orderOffset !== undefined) {
    query.set("orderOffset", String(options.orderOffset));
  }
  const queryString = query.toString();
  const response = await fetch(`/api/tradingfox/copy-strategies/${encodeURIComponent(strategyId)}${queryString ? `?${queryString}` : ""}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await response.json() as TradingFoxStrategyDetail | { error?: string };
  if (!response.ok) {
    throw new Error("error" in payload && payload.error ? payload.error : `Strategy detail failed with status ${response.status}.`);
  }
  return payload as TradingFoxStrategyDetail;
}

async function requestStrategyPositionSync(strategyId: string, ratioPercent: number): Promise<TradingFoxStrategyDetail> {
  const response = await fetch(`/api/tradingfox/copy-strategies/${encodeURIComponent(strategyId)}/sync-positions`, {
    body: JSON.stringify({ ratioPercent }),
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = await response.json() as TradingFoxStrategyDetail | { error?: string };
  if (!response.ok) {
    throw new Error("error" in payload && payload.error ? payload.error : `Position sync failed with status ${response.status}.`);
  }
  return payload as TradingFoxStrategyDetail;
}

type StrategyCopy = WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
type SignalSourcePosition = TradingFoxStrategyDetail["signalSources"][number]["positions"][number];
type TradingFoxOrderItem = NonNullable<TradingFoxStrategyDetail["orderHistory"]>["items"][number];
type TradingFoxSignalSourceOrderItem = NonNullable<TradingFoxStrategyDetail["orderHistory"]>["signalSourceOrders"][number];
type TradingFoxTradeLogItem = NonNullable<TradingFoxStrategyDetail["orderHistory"]>["tradeLogs"][number];
type CopyPositionMarkPricesBySymbol = ReadonlyMap<string, number>;
type SignalSourceIdentityById = ReadonlyMap<string, TradeHistorySourceIdentity>;

const EMPTY_TRADING_FOX_POSITIONS: readonly TradingFoxPosition[] = [];

type TradeHistorySourceIdentity = {
  avatarUrl: string | null;
  id: string;
  name: string;
};

type TradeHistoryRow = {
  action: string | undefined;
  id: string;
  kind: "me" | "signalSource" | "tradeLog";
  order: TradingFoxOrderItem | null;
  price: number | null;
  quantity: number | null;
  side: string | undefined;
  signalSourceOrder: TradingFoxSignalSourceOrderItem | null;
  source: TradeHistorySourceIdentity;
  sourceTimeMs: number;
  status: string | undefined;
  symbol: string;
  timestamp: string;
  tradeLog: TradingFoxTradeLogItem | null;
};

type TradeHistorySymbolOption = {
  count: number;
  label: string;
  symbol: MarketSymbol;
};

type PositionSummaryModel = {
  availableMargin: number | null;
  longRatio: number | null;
  positionCount: number;
  shortRatio: number | null;
  totalLeverage: number | null;
  totalMargin: number | null;
  totalNotional: number | null;
  totalPnlRate: number | null;
  unrealizedPnl: number | null;
};

type NormalizedSummaryPosition = {
  margin: number | null;
  notional: number | null;
  pnl: number | null;
  side: string | undefined;
};

type PositionSummaryTotals = {
  longRatio: number | null;
  positionCount: number;
  shortRatio: number | null;
  totalNotional: number | null;
  totalPnl: number | null;
  usedMargin: number | null;
};

function PositionSummaryPanel({
  isDarkTheme,
  strategyCopy,
  summary,
}: {
  isDarkTheme: boolean;
  strategyCopy: StrategyCopy;
  summary: PositionSummaryModel;
}) {
  const containerClassName = isDarkTheme
    ? "mt-3 rounded-2xl border border-white/[0.075] bg-[#111820] p-2.5"
    : "mt-3 rounded-2xl border border-[#E5EAF0] bg-white p-2.5";
  const pnlValue = summary.unrealizedPnl ?? 0;
  const pnlRateValue = summary.totalPnlRate ?? 0;
  const longRatioClassName = isDarkTheme ? "text-emerald-300" : "text-emerald-600";

  return (
    <div className={containerClassName}>
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        <PositionSummaryMetric isDarkTheme={isDarkTheme} label={strategyCopy.positionCount}>
          {summary.positionCount}
        </PositionSummaryMetric>
        <PositionSummaryMetric isDarkTheme={isDarkTheme} label={strategyCopy.availableTotalMargin}>
          <span className={longRatioClassName}>{formatDetailCurrency(summary.availableMargin)}</span>
          <span className={isDarkTheme ? "text-slate-500" : "text-slate-400"}>/</span>
          <span>{formatDetailCurrency(summary.totalMargin)}</span>
        </PositionSummaryMetric>
        <PositionSummaryMetric isDarkTheme={isDarkTheme} label={strategyCopy.totalNotionalValue}>
          {formatDetailCurrency(summary.totalNotional)}
        </PositionSummaryMetric>
        <PositionSummaryMetric isDarkTheme={isDarkTheme} label={strategyCopy.totalLeverage}>
          {formatSummaryLeverage(summary.totalLeverage)}
        </PositionSummaryMetric>
        <PositionSummaryMetric
          isDarkTheme={isDarkTheme}
          label={strategyCopy.unrealizedPnl}
          valueClassName={getPnlClassName(isDarkTheme, pnlValue)}
        >
          {formatSignedDetailCurrency(summary.unrealizedPnl)}
        </PositionSummaryMetric>
        <PositionSummaryMetric
          isDarkTheme={isDarkTheme}
          label={strategyCopy.totalPnlRate}
          valueClassName={getPnlClassName(isDarkTheme, pnlRateValue)}
        >
          {formatSignedPercent(summary.totalPnlRate)}
        </PositionSummaryMetric>
        <PositionSummaryMetric isDarkTheme={isDarkTheme} label={strategyCopy.longRatio} valueClassName={longRatioClassName}>
          {formatUnsignedPercent(summary.longRatio)}
        </PositionSummaryMetric>
        <PositionSummaryMetric isDarkTheme={isDarkTheme} label={strategyCopy.shortRatio} valueClassName="text-[#ff2d3d]">
          {formatUnsignedPercent(summary.shortRatio)}
        </PositionSummaryMetric>
      </div>
    </div>
  );
}

function PositionSummaryMetric({
  children,
  isDarkTheme,
  label,
  valueClassName,
}: {
  children: ReactNode;
  isDarkTheme: boolean;
  label: string;
  valueClassName?: string;
}) {
  const containerClassName = isDarkTheme ? "min-w-0 overflow-hidden rounded-xl bg-white/[0.035] px-2 py-1.5" : "min-w-0 overflow-hidden rounded-xl bg-[#F8FAFC] px-2 py-1.5";
  const labelClassName = isDarkTheme ? "truncate text-[10px] font-black leading-4 text-slate-400" : "truncate text-[10px] font-black leading-4 text-slate-700";
  const neutralValueClassName = isDarkTheme ? "text-slate-50" : "text-slate-950";
  const defaultValueClassName = "mt-0.5 flex min-w-0 items-baseline gap-x-0.5 overflow-hidden whitespace-nowrap text-[13px] font-black leading-4 sm:text-sm";

  return (
    <div className={containerClassName}>
      <div className={labelClassName}>{label}</div>
      <div className={`${defaultValueClassName} ${valueClassName ?? neutralValueClassName}`}>{children}</div>
    </div>
  );
}

function createCopyPositionSummary(detail: TradingFoxStrategyDetail): PositionSummaryModel {
  const totals = summarizePositions(detail.positions.map((position) => {
    const notional = getCopyPositionNotional(position);
    const leverage = finiteNumberOrNull(position.leverage);
    return {
      margin: calculatePositionMargin(notional, leverage),
      notional,
      pnl: getCopyPositionPnl(position),
      side: position.side,
    };
  }));
  const totalMargin = finiteNumberOrNull(detail.account?.usdtTotal)
    ?? finiteNumberOrNull(detail.account?.equity)
    ?? totals.usedMargin;
  const availableMargin = finiteNumberOrNull(detail.account?.usdtFree)
    ?? calculateAvailableMargin(totalMargin, totals.usedMargin);

  return createPositionSummaryModel({ availableMargin, totalMargin, totals });
}

function createSignalSourcePositionSummary(
  source: TradingFoxStrategyDetail["signalSources"][number],
  copyPositionMarkPricesBySymbol: CopyPositionMarkPricesBySymbol,
): PositionSummaryModel {
  const totals = summarizePositions(source.positions.map((position) => {
    const notional = getSignalSourcePositionNotional(position, copyPositionMarkPricesBySymbol);
    const leverage = finiteNumberOrNull(position.leverage);
    return {
      margin: calculatePositionMargin(notional, leverage),
      notional,
      pnl: getSignalSourcePositionPnl(position, copyPositionMarkPricesBySymbol),
      side: position.positionSide,
    };
  }));
  const totalMargin = finiteNumberOrNull(source.marginBalance) ?? totals.usedMargin;
  const availableMargin = calculateAvailableMargin(totalMargin, totals.usedMargin);

  return createPositionSummaryModel({ availableMargin, totalMargin, totals });
}

function createPositionSummaryModel(input: {
  availableMargin: number | null;
  totalMargin: number | null;
  totals: PositionSummaryTotals;
}): PositionSummaryModel {
  const { availableMargin, totalMargin, totals } = input;
  const marginBase = positiveFiniteNumberOrNull(totalMargin) ?? positiveFiniteNumberOrNull(totals.usedMargin);
  const totalLeverage = totals.totalNotional !== null && totals.totalNotional > 0 && marginBase !== null
    ? totals.totalNotional / marginBase
    : totals.totalNotional === 0
      ? 0
      : null;
  const totalPnlRate = totals.totalPnl !== null && marginBase !== null
    ? (totals.totalPnl / marginBase) * 100
    : totals.totalPnl === 0
      ? 0
      : null;

  return {
    availableMargin,
    longRatio: totals.longRatio,
    positionCount: totals.positionCount,
    shortRatio: totals.shortRatio,
    totalLeverage,
    totalMargin,
    totalNotional: totals.totalNotional,
    totalPnlRate,
    unrealizedPnl: totals.totalPnl,
  };
}

function summarizePositions(positions: readonly NormalizedSummaryPosition[]): PositionSummaryTotals {
  let hasMargin = false;
  let hasNotional = positions.length === 0;
  let hasPnl = positions.length === 0;
  let longCount = 0;
  let longNotional = 0;
  let shortCount = 0;
  let shortNotional = 0;
  let totalNotional = 0;
  let totalPnl = 0;
  let usedMargin = 0;

  positions.forEach((position) => {
    const notional = positiveFiniteNumberOrNull(position.notional);
    const margin = positiveFiniteNumberOrNull(position.margin);
    const sideBucket = getPositionSideBucket(position.side);

    if (notional !== null) {
      hasNotional = true;
      totalNotional += notional;
    }

    if (margin !== null) {
      hasMargin = true;
      usedMargin += margin;
    }

    if (position.pnl !== null) {
      hasPnl = true;
      totalPnl += position.pnl;
    }

    if (sideBucket === "long") {
      longCount += 1;
      longNotional += notional ?? 0;
    } else if (sideBucket === "short") {
      shortCount += 1;
      shortNotional += notional ?? 0;
    }
  });

  const directionalNotional = longNotional + shortNotional;
  const directionalCount = longCount + shortCount;
  const longRatio = directionalNotional > 0
    ? (longNotional / directionalNotional) * 100
    : directionalCount > 0
      ? (longCount / directionalCount) * 100
      : null;
  const shortRatio = longRatio === null ? null : 100 - longRatio;

  return {
    longRatio,
    positionCount: positions.length,
    shortRatio,
    totalNotional: hasNotional ? totalNotional : null,
    totalPnl: hasPnl ? totalPnl : null,
    usedMargin: hasMargin ? usedMargin : null,
  };
}

function getCopyPositionNotional(position: TradingFoxPosition): number | null {
  const explicitNotional = finiteNumberOrNull(position.notional);
  if (explicitNotional !== null) {
    return Math.abs(explicitNotional);
  }

  const contracts = finiteNumberOrNull(position.contracts);
  const price = finiteNumberOrNull(position.markPrice) ?? finiteNumberOrNull(position.entryPrice);
  if (contracts === null || price === null) {
    return null;
  }

  return Math.abs(contracts * price);
}

function createCopyPositionMarkPricesBySymbol(positions: readonly TradingFoxPosition[]): CopyPositionMarkPricesBySymbol {
  const markPricesBySymbol = new Map<string, number>();

  positions.forEach((position) => {
    const symbol = normalizePositionSymbolForMarkPriceLookup(position.symbol);
    const markPrice = finiteNumberOrNull(position.markPrice);
    if (symbol && markPrice !== null) {
      markPricesBySymbol.set(symbol, markPrice);
    }
  });

  return markPricesBySymbol;
}

function normalizePositionSymbolForMarkPriceLookup(value: string | undefined): string {
  const normalizedValue = (value ?? "").trim().toUpperCase();
  if (!normalizedValue) {
    return "";
  }

  const symbolWithoutSettlement = normalizedValue.split(":")[0] ?? normalizedValue;
  return symbolWithoutSettlement.replace(/[\s/_-]/gu, "");
}

function getSignalSourcePositionMarkPrice(
  position: SignalSourcePosition,
  copyPositionMarkPricesBySymbol: CopyPositionMarkPricesBySymbol,
): number | null {
  const copiedMarkPrice = copyPositionMarkPricesBySymbol.get(normalizePositionSymbolForMarkPriceLookup(position.symbol));
  return copiedMarkPrice ?? finiteNumberOrNull(position.markPrice);
}

function getSignalSourcePositionNotional(
  position: SignalSourcePosition,
  copyPositionMarkPricesBySymbol: CopyPositionMarkPricesBySymbol,
): number | null {
  const size = finiteNumberOrNull(position.positionSize);
  const price = getSignalSourcePositionMarkPrice(position, copyPositionMarkPricesBySymbol) ?? finiteNumberOrNull(position.entryPrice);
  if (size === null || price === null) {
    return null;
  }

  return Math.abs(size * price);
}

function getCopyPositionPnl(position: TradingFoxPosition): number | null {
  const explicitPnl = finiteNumberOrNull(position.unrealizedPnl);
  if (explicitPnl !== null) {
    return explicitPnl;
  }

  return calculatePositionPnl({
    entryPrice: finiteNumberOrNull(position.entryPrice),
    markPrice: finiteNumberOrNull(position.markPrice),
    quantity: finiteNumberOrNull(position.contracts),
    side: position.side,
  });
}

function getSignalSourcePositionPnl(
  position: SignalSourcePosition,
  copyPositionMarkPricesBySymbol: CopyPositionMarkPricesBySymbol,
): number | null {
  return calculatePositionPnl({
    entryPrice: finiteNumberOrNull(position.entryPrice),
    markPrice: getSignalSourcePositionMarkPrice(position, copyPositionMarkPricesBySymbol),
    quantity: finiteNumberOrNull(position.positionSize),
    side: position.positionSide,
  });
}

function calculatePositionPnl(input: {
  entryPrice: number | null;
  markPrice: number | null;
  quantity: number | null;
  side: string | undefined;
}): number | null {
  const { entryPrice, markPrice, quantity, side } = input;
  const sideBucket = getPositionSideBucket(side);
  if (entryPrice === null || markPrice === null || quantity === null || sideBucket === null) {
    return null;
  }

  const priceMove = sideBucket === "long" ? markPrice - entryPrice : entryPrice - markPrice;
  return priceMove * Math.abs(quantity);
}

function calculatePositionMargin(notional: number | null, leverage: number | null): number | null {
  if (notional === null || leverage === null || leverage <= 0) {
    return null;
  }

  return Math.abs(notional) / leverage;
}

function calculateAvailableMargin(totalMargin: number | null, usedMargin: number | null): number | null {
  if (totalMargin === null || usedMargin === null) {
    return null;
  }

  return Math.max(totalMargin - usedMargin, 0);
}

function CopyPositionTable({
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
          <tr className={isDarkTheme ? "border-b border-white/[0.075] text-xs font-black text-slate-500" : "border-b border-[#DDE8F0] text-xs font-black text-slate-500"}>
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
              <tr key={`${position.symbol}-${position.side}-${index}`} className={isDarkTheme ? "border-b border-white/[0.06] last:border-0" : "border-b border-[#DDE8F0] last:border-0"}>
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

function SignalSourcePositionTable({
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
          <tr className={isDarkTheme ? "border-b border-white/[0.075] text-xs font-black text-slate-500" : "border-b border-[#DDE8F0] text-xs font-black text-slate-500"}>
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
              <tr key={`${position.symbol}-${position.positionSide}-${index}`} className={isDarkTheme ? "border-b border-white/[0.06] last:border-0" : "border-b border-[#DDE8F0] last:border-0"}>
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

function createSignalSourceIdentityById(
  signalSources: readonly TradingFoxStrategyDetail["signalSources"][number][],
  strategy: PrototypeStrategy,
): SignalSourceIdentityById {
  const identities = new Map<string, TradeHistorySourceIdentity>();
  signalSources.forEach((source) => {
    const sourceId = source.signalSourceId.trim();
    if (!sourceId) {
      return;
    }
    identities.set(sourceId, {
      avatarUrl: null,
      id: sourceId,
      name: source.name || strategy.traderName || sourceId,
    });
  });

  if (strategy.traderId.trim()) {
    identities.set(strategy.traderId, {
      avatarUrl: strategy.avatarUrl || null,
      id: strategy.traderId,
      name: strategy.traderName,
    });
  }

  return identities;
}

function createTradeHistoryRows({
  orders,
  signalSourceIdentityById,
  signalSourceOrders,
  strategy,
  tradeLogs,
}: {
  orders: readonly TradingFoxOrderItem[];
  signalSourceIdentityById: SignalSourceIdentityById;
  signalSourceOrders: readonly TradingFoxSignalSourceOrderItem[];
  strategy: PrototypeStrategy;
  tradeLogs: readonly TradingFoxTradeLogItem[];
}): TradeHistoryRow[] {
  return [
    ...orders.map((order) => createMyTradeHistoryRow(order, strategy)),
    ...signalSourceOrders.map((order) => createSignalSourceTradeHistoryRow(order, signalSourceIdentityById, strategy)),
    ...tradeLogs.map((log) => createTradeLogHistoryRow(log, signalSourceIdentityById, strategy)),
  ].sort(compareTradeHistoryRows);
}

function createMyTradeHistoryRow(order: TradingFoxOrderItem, strategy: PrototypeStrategy): TradeHistoryRow {
  return {
    action: order.side,
    id: `me:${order.clientOrderId}`,
    kind: "me",
    order,
    price: finiteNumberOrNull(order.price),
    quantity: finiteNumberOrNull(order.contractAmount),
    side: order.side,
    signalSourceOrder: null,
    source: {
      avatarUrl: strategy.avatarUrl || null,
      id: strategy.traderId,
      name: strategy.traderName,
    },
    sourceTimeMs: getTimestampMs(order.timestamp),
    status: order.status,
    symbol: order.symbol,
    timestamp: order.timestamp,
    tradeLog: null,
  };
}

function createSignalSourceTradeHistoryRow(
  order: TradingFoxSignalSourceOrderItem,
  signalSourceIdentityById: SignalSourceIdentityById,
  strategy: PrototypeStrategy,
): TradeHistoryRow {
  const fallbackName = order.signalSourceName || strategy.traderName || order.signalSourceId;
  const source = signalSourceIdentityById.get(order.signalSourceId) ?? {
    avatarUrl: null,
    id: order.signalSourceId || strategy.traderId,
    name: fallbackName,
  };
  const sourceTimestamp = order.timestamp || order.sourceTimestamp || "";

  return {
    action: order.action,
    id: `source:${order.eventId || `${order.signalSourceId}:${order.symbol}:${sourceTimestamp}`}`,
    kind: "signalSource",
    order: null,
    price: getSignalSourceOrderPrice(order),
    quantity: getSignalSourceOrderQuantity(order),
    side: order.side,
    signalSourceOrder: order,
    source: {
      ...source,
      name: resolveTradeHistorySourceName(order.signalSourceName || source.name, source.id, fallbackName),
    },
    sourceTimeMs: getTimestampMs(sourceTimestamp),
    status: undefined,
    symbol: order.symbol,
    timestamp: sourceTimestamp,
    tradeLog: null,
  };
}

function createTradeLogHistoryRow(
  log: TradingFoxTradeLogItem,
  signalSourceIdentityById: SignalSourceIdentityById,
  strategy: PrototypeStrategy,
): TradeHistoryRow {
  const trade = log.ssTradeInfo ?? {};
  const config = log.ssConfig ?? {};
  const orderData = log.orderData ?? {};
  const sourceId = firstString(
    trade.signalSourceId,
    trade.signalSourceID,
    config.signalSourceId,
    config.signalSourceID,
    strategy.traderId,
  );
  const fallbackName = firstString(
    trade.signalSourceName,
    trade.sourceName,
    config.signalSourceName,
    config.sourceName,
    strategy.traderName,
    sourceId,
  );
  const source = signalSourceIdentityById.get(sourceId) ?? {
    avatarUrl: null,
    id: sourceId,
    name: fallbackName,
  };
  const timestamp = firstString(trade.timestamp, trade.signalTimestamp, log.timestamp);
  const side = getTradeLogSide(log);

  return {
    action: log.type,
    id: `trade-log:${log.id}`,
    kind: "tradeLog",
    order: null,
    price: firstFiniteNumber(trade.price, orderData.orderPrice, orderData.price, orderData.markPrice),
    quantity: getTradeLogQuantity(log),
    side,
    signalSourceOrder: null,
    source: {
      ...source,
      name: resolveTradeHistorySourceName(source.name, source.id, fallbackName),
    },
    sourceTimeMs: getTimestampMs(timestamp),
    status: getTradeLogReason(log),
    symbol: firstString(trade.symbol, orderData.symbol) || "--",
    timestamp,
    tradeLog: log,
  };
}

function resolveTradeHistorySourceName(preferredName: string | undefined, sourceId: string, fallbackName: string): string {
  const normalizedPreferredName = firstString(preferredName);
  if (normalizedPreferredName && !isOpaqueSignalSourceId(normalizedPreferredName)) {
    return normalizedPreferredName;
  }

  const normalizedFallbackName = firstString(fallbackName);
  if (normalizedFallbackName && !isOpaqueSignalSourceId(normalizedFallbackName)) {
    return normalizedFallbackName;
  }

  return normalizedPreferredName || normalizedFallbackName || sourceId;
}

function isOpaqueSignalSourceId(value: string): boolean {
  return /^(?:信号源[:：]\s*)?(?:bn|mx)-[\da-z-]+$/iu.test(value.trim());
}

function compareTradeHistoryRows(left: TradeHistoryRow, right: TradeHistoryRow): number {
  if (left.sourceTimeMs !== right.sourceTimeMs) {
    return right.sourceTimeMs - left.sourceTimeMs;
  }
  if (left.kind !== right.kind) {
    return getTradeHistoryRowKindRank(left.kind) - getTradeHistoryRowKindRank(right.kind);
  }
  return left.id.localeCompare(right.id);
}

function filterTradeHistoryRowsByStrategyStart(rows: readonly TradeHistoryRow[], strategy: PrototypeStrategy): TradeHistoryRow[] {
  const startedAtMs = getStrategyStartedAtMs(strategy);
  if (startedAtMs === null) {
    return [...rows];
  }

  return rows.filter((row) => row.sourceTimeMs >= startedAtMs);
}

function getStrategyStartedAtMs(strategy: PrototypeStrategy): number | null {
  const timestamp = Date.parse(strategy.startedAt ?? "");
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getTradeHistoryRowKindRank(kind: TradeHistoryRow["kind"]): number {
  switch (kind) {
    case "signalSource":
      return 0;
    case "me":
      return 1;
    case "tradeLog":
      return 2;
  }
}

function getTimestampMs(value: string | undefined): number {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getSignalSourceOrderQuantity(order: TradingFoxSignalSourceOrderItem): number | null {
  const quantity = finiteNumberOrNull(order.deltaQty);
  return quantity === null ? null : Math.abs(quantity);
}

function getSignalSourceOrderPrice(order: TradingFoxSignalSourceOrderItem): number | null {
  return firstFiniteNumber(
    order.price,
    order.metadata?.eventPrice,
    order.metadata?.event_price,
    order.metadata?.price,
    order.markPrice,
    order.metadata?.markPrice,
    order.metadata?.mark_price,
    order.entryPrice,
    order.metadata?.entryPrice,
    order.metadata?.entry_price,
  );
}

function getTradeLogQuantity(log: TradingFoxTradeLogItem): number | null {
  const trade = log.ssTradeInfo ?? {};
  const orderData = log.orderData ?? {};
  const quantity = firstFiniteNumber(trade.amountAbsolute, trade.nomAmount, orderData.contractAmount, orderData.amount);
  return quantity === null ? null : Math.abs(quantity);
}

function getTradeLogSide(log: TradingFoxTradeLogItem): string | undefined {
  const trade = log.ssTradeInfo ?? {};
  const orderData = log.orderData ?? {};
  const explicitSide = firstString(orderData.side, orderData.ccxtOrderSide, orderData.CCXTOrderSide);
  if (explicitSide) {
    return explicitSide;
  }

  const amount = firstFiniteNumber(trade.nomAmount);
  if (amount === null) {
    return undefined;
  }
  if (amount > 0) {
    return "buy";
  }
  if (amount < 0) {
    return "sell";
  }
  return undefined;
}

function getTradeLogReason(log: TradingFoxTradeLogItem): string {
  const additional = log.additionalInfo ?? {};
  return firstString(additional.skipReason, additional.errorCode, log.errorMessage, log.type) || "--";
}

function firstFiniteNumber(...values: readonly unknown[]): number | null {
  for (const value of values) {
    const number = finiteNumberOrNull(value);
    if (number !== null) {
      return number;
    }
  }
  return null;
}

function firstString(...values: readonly unknown[]): string {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmedValue = value.trim();
      if (trimmedValue) {
        return trimmedValue;
      }
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function TradeHistoryKlinePanel({
  copy,
  interval,
  isDarkTheme,
  row,
  rows,
  strategy,
  onIntervalChange,
}: {
  copy: WorkspaceCopy;
  interval: KlineInterval;
  isDarkTheme: boolean;
  row: TradeHistoryRow;
  rows: readonly TradeHistoryRow[];
  strategy: PrototypeStrategy;
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
  const language = resolveWorkspaceLanguage(copy);

  useEffect(() => {
    setSelectedSymbol(rowSymbol);
  }, [rowSymbol]);

  const tradeMarkers = useMemo(
    () => createTradeHistoryTradeMarkers({
      rows,
      selectedSymbol: symbol,
      strategy,
      strategyCopy: copy.workspace.accountCenter.strategy,
    }),
    [copy.workspace.accountCenter.strategy, rows, strategy, symbol],
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

function TradeHistoryTable({
  activeKlineRowId,
  isDarkTheme,
  rows,
  strategyCopy,
  telegramUser,
  onRowKlineOpen,
}: {
  activeKlineRowId: string | null;
  isDarkTheme: boolean;
  rows: readonly TradeHistoryRow[];
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
  telegramUser: TelegramSessionUser | null;
  onRowKlineOpen: (row: TradeHistoryRow) => void;
}) {
  return (
    <div className="kol-scroll-area mt-3 overflow-x-auto">
      <table className="min-w-[1080px] w-full border-collapse text-left text-sm">
        <thead>
          <tr className={isDarkTheme ? "border-b border-white/[0.075] text-xs font-black text-slate-500" : "border-b border-[#DDE8F0] text-xs font-black text-slate-500"}>
            <th className="px-3 py-3">{strategyCopy.orderTime}</th>
            <th className="px-3 py-3">{strategyCopy.orderSource}</th>
            <th className="px-3 py-3">{strategyCopy.orderPair}</th>
            <th className="px-3 py-3">{strategyCopy.orderSide}</th>
            <th className="px-3 py-3">{strategyCopy.referencePrice}</th>
            <th className="px-3 py-3">{strategyCopy.orderQuantity}</th>
            <th className="px-3 py-3">{strategyCopy.notional}</th>
            <th className="px-3 py-3">{strategyCopy.tradeStatus}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const notional = row.price !== null && row.quantity !== null ? row.price * row.quantity : null;
            const isActiveKlineRow = row.id === activeKlineRowId;
            return (
              <tr key={row.id} className={getTradeHistoryRowClassName(isDarkTheme, row.kind, isActiveKlineRow)}>
                <td className="px-3 py-4 font-semibold">{formatDetailDate(row.timestamp)}</td>
                <td className="px-3 py-4">
                  <TradeHistorySourceCell isDarkTheme={isDarkTheme} row={row} strategyCopy={strategyCopy} telegramUser={telegramUser} />
                </td>
                <td className="px-3 py-4 font-black">
                  <button
                    className={isActiveKlineRow ? "rounded-full bg-sky-400/15 px-2 py-1 text-sky-400" : "rounded-full px-2 py-1 underline underline-offset-2 transition hover:bg-sky-400/10 hover:text-sky-400"}
                    type="button"
                    onClick={() => onRowKlineOpen(row)}
                  >
                    {row.symbol}
                  </button>
                </td>
                <td className={`px-3 py-4 font-black ${getTradeHistorySideClassName(isDarkTheme, row)}`}>{formatTradeHistoryAction(row, strategyCopy)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(row.price)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(row.quantity)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailCurrency(notional)}</td>
                <td className={getTradeHistoryStatusClassName(isDarkTheme, row)}>{formatTradeHistoryStatus(row, strategyCopy)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TradeHistorySourceCell({
  isDarkTheme,
  row,
  strategyCopy,
  telegramUser,
}: {
  isDarkTheme: boolean;
  row: TradeHistoryRow;
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
  telegramUser: TelegramSessionUser | null;
}) {
  if (row.kind === "me") {
    return (
      <div className="inline-flex items-center gap-2">
        {telegramUser ? (
          <TelegramUserAvatar isDarkTheme={isDarkTheme} size="table" user={telegramUser} />
        ) : (
          <span className={isDarkTheme ? "grid h-8 w-8 place-items-center rounded-full bg-sky-400/15 text-xs font-black text-sky-200" : "grid h-8 w-8 place-items-center rounded-full bg-[#EAF8FE] text-xs font-black text-[#008DCC]"}>
            {strategyCopy.orderSourceMe}
          </span>
        )}
        <div className="min-w-0">
          <div className="text-sm font-black">{strategyCopy.orderSourceMe}</div>
          <div className={isDarkTheme ? "mt-0.5 max-w-36 truncate text-[10px] font-semibold text-slate-500" : "mt-0.5 max-w-36 truncate text-[10px] font-semibold text-slate-400"}>{row.source.name}</div>
        </div>
      </div>
    );
  }

  const sourceDisplayName = row.source.name || row.source.id;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <SourceAvatar isDarkTheme={isDarkTheme} name={sourceDisplayName} url={row.source.avatarUrl} />
      <div className="min-w-0">
        <div className="max-w-44 truncate text-sm font-black">{sourceDisplayName}</div>
        {row.kind === "tradeLog" ? (
          <div className={isDarkTheme ? "mt-0.5 max-w-44 truncate text-[10px] font-semibold text-slate-500" : "mt-0.5 max-w-44 truncate text-[10px] font-semibold text-slate-400"}>
            {`${strategyCopy.tradeEventNoOrder} #${row.tradeLog?.id ?? "--"}`}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getTradeHistoryRowClassName(isDarkTheme: boolean, kind: TradeHistoryRow["kind"], isActive: boolean): string {
  if (kind === "tradeLog") {
    if (isActive) {
      return isDarkTheme
        ? "border-b border-rose-400/20 bg-rose-400/[0.08] shadow-[inset_3px_0_0_rgba(251,113,133,0.85)] last:border-0"
        : "border-b border-rose-200 bg-rose-50 shadow-[inset_3px_0_0_#f43f5e] last:border-0";
    }
    return isDarkTheme
      ? "border-b border-white/[0.06] bg-rose-400/[0.035] shadow-[inset_3px_0_0_rgba(251,113,133,0.6)] last:border-0"
      : "border-b border-[#F3D3DA] bg-rose-50/70 shadow-[inset_3px_0_0_#fb7185] last:border-0";
  }

  if (kind === "signalSource") {
    if (isActive) {
      return isDarkTheme
        ? "border-b border-sky-400/20 bg-sky-400/[0.08] shadow-[inset_3px_0_0_rgba(56,189,248,0.75)] last:border-0"
        : "border-b border-[#B7E8FC] bg-[#EAF8FE] shadow-[inset_3px_0_0_#00A6F4] last:border-0";
    }
    return isDarkTheme
      ? "border-b border-white/[0.06] bg-white/[0.025] shadow-[inset_3px_0_0_rgba(148,163,184,0.35)] last:border-0"
      : "border-b border-[#DDE8F0] bg-[#F8FAFC] shadow-[inset_3px_0_0_#CBD5E1] last:border-0";
  }

  if (isActive) {
    return isDarkTheme
      ? "border-b border-sky-400/20 bg-sky-400/[0.08] last:border-0"
      : "border-b border-[#B7E8FC] bg-[#EAF8FE] last:border-0";
  }
  return isDarkTheme ? "border-b border-white/[0.06] last:border-0" : "border-b border-[#DDE8F0] last:border-0";
}

function RowsPaginationControls({
  canGoNext,
  canGoPrevious,
  isDarkTheme,
  nextLabel,
  previousLabel,
  rangeLabel,
  onNext,
  onPrevious,
}: {
  canGoNext: boolean;
  canGoPrevious: boolean;
  isDarkTheme: boolean;
  nextLabel: string;
  previousLabel: string;
  rangeLabel: string;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const buttonClassName = isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-[11px] font-bold text-sky-200 transition hover:border-sky-400/25 hover:bg-sky-400/10 disabled:cursor-not-allowed disabled:opacity-45"
    : "rounded-2xl border border-[#B7E8FC] bg-white px-3 py-2 text-[11px] font-bold text-[#008DCC] transition hover:bg-[#EAF8FE] disabled:cursor-not-allowed disabled:opacity-45";
  const rangeClassName = isDarkTheme
    ? "text-center text-[10px] font-semibold text-slate-500"
    : "text-center text-[10px] font-semibold text-slate-400";

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <button className={buttonClassName} disabled={!canGoPrevious} type="button" onClick={onPrevious}>
        {previousLabel}
      </button>
      <span className={rangeClassName}>{rangeLabel}</span>
      <button className={buttonClassName} disabled={!canGoNext} type="button" onClick={onNext}>
        {nextLabel}
      </button>
    </div>
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
}: {
  rows: readonly TradeHistoryRow[];
  selectedSymbol: MarketSymbol;
  strategy: PrototypeStrategy;
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
}): CopyTradingTradeMarker[] {
  return rows
    .filter((row) => row.kind === "me" && toCopyTradingMarketSymbol(row.symbol) === selectedSymbol)
    .map((row) => createTradeHistoryTradeMarker(row, strategy, strategyCopy))
    .filter((marker): marker is CopyTradingTradeMarker => marker !== null)
    .sort((left, right) => left.sourceTimeMs - right.sourceTimeMs);
}

function createTradeHistoryTradeMarker(
  row: TradeHistoryRow,
  strategy: PrototypeStrategy,
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"],
): CopyTradingTradeMarker | null {
  const sourceTimeMs = Date.parse(row.timestamp);
  if (!Number.isFinite(sourceTimeMs)) {
    return null;
  }

  const price = row.price;
  const side = getTradeHistoryMarkerSide(row);
  const actionLabel = formatTradeHistoryMarkerAction(side);
  const priceText = price === null ? null : formatDetailNumber(price);
  const priceSuffix = priceText ? ` @ ${priceText}` : "";

  return {
    actionLabel,
    avatarUrl: null,
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
    title: `${actionLabel} ${row.symbol}${priceSuffix}`,
    traderId: strategy.traderId,
    traderName: actionLabel,
  };
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

function formatTradeHistoryMarkerAction(side: "buy" | "sell"): "BUY" | "SELL" {
  return side === "buy" ? "BUY" : "SELL";
}

function resolveInitialTradeHistoryKlineUntilMs(sourceTimeMs: number, interval: KlineInterval): number | undefined {
  if (!Number.isFinite(sourceTimeMs)) {
    return undefined;
  }

  return sourceTimeMs + KLINE_INTERVAL_MS_BY_INTERVAL[interval] * 120;
}

function createOpenEndedPageRangeLabel(pageOffset: number, visibleCount: number): string {
  if (visibleCount <= 0) {
    return "0 / 0";
  }

  return `${pageOffset + 1}-${pageOffset + visibleCount}`;
}

function resolveWorkspaceLanguage(copy: WorkspaceCopy): WorkspaceLanguage {
  return copy === WORKSPACE_COPY["en-US"] ? "en-US" : "zh-CN";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}


function formatDetailNumber(value: unknown): string {
  if (value === null || value === undefined) {
    return "--";
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(number);
}

function formatDetailCurrency(value: unknown): string {
  if (value === null || value === undefined) {
    return "--";
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(number)}`;
}

function formatSignedDetailCurrency(value: unknown): string {
  if (value === null || value === undefined) {
    return "--";
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  const prefix = number > 0 ? "+" : "";
  return `${prefix}${formatDetailCurrency(number)}`;
}

function formatSignedPercent(value: unknown): string {
  if (value === null || value === undefined) {
    return "--";
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  const prefix = number > 0 ? "+" : "";
  return `${prefix}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(number)}%`;
}

function formatUnsignedPercent(value: unknown): string {
  if (value === null || value === undefined) {
    return "--";
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(number)}%`;
}

function formatLeverage(value: unknown): string {
  if (value === null || value === undefined) {
    return "--";
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return `${formatDetailNumber(number)}x`;
}

function formatSummaryLeverage(value: unknown): string {
  if (value === null || value === undefined) {
    return "--";
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(number)}x`;
}

function numberOrZero(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function finiteNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveFiniteNumberOrNull(value: unknown): number | null {
  const number = finiteNumberOrNull(value);
  return number !== null && number > 0 ? number : null;
}

function getPositionSideBucket(value: string | undefined): "long" | "short" | null {
  const normalizedValue = (value ?? "").toLowerCase();
  if (normalizedValue.includes("long") || normalizedValue.includes("buy")) {
    return "long";
  }
  if (normalizedValue.includes("short") || normalizedValue.includes("sell")) {
    return "short";
  }
  return null;
}

function formatPositionSide(value: string | undefined): string {
  const normalizedValue = (value ?? "").toLowerCase();
  if (normalizedValue.includes("long") || normalizedValue.includes("buy")) {
    return "多头";
  }
  if (normalizedValue.includes("short") || normalizedValue.includes("sell")) {
    return "空头";
  }
  return value || "--";
}

function formatOrderSide(value: string | undefined, strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"]): string {
  const normalizedValue = (value ?? "").toLowerCase();
  if (normalizedValue.includes("buy")) {
    return strategyCopy.orderOpenLong;
  }
  if (normalizedValue.includes("sell")) {
    return strategyCopy.orderOpenShort;
  }
  return value || "--";
}

function formatTradeHistoryAction(row: TradeHistoryRow, strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"]): string {
  if (row.kind === "me") {
    return formatOrderSide(row.action, strategyCopy);
  }
  if (row.kind === "tradeLog") {
    return row.side ? formatOrderSide(row.side, strategyCopy) : strategyCopy.tradeEventNoOrder;
  }

  const normalizedAction = (row.action ?? "").toLowerCase();
  const normalizedSide = row.side?.toLowerCase() ?? "";
  const isShort = normalizedSide.includes("short") || normalizedSide.includes("sell") || normalizedAction.includes("short");
  if (normalizedAction.includes("close")) {
    return isShort ? strategyCopy.orderCloseShort : strategyCopy.orderCloseLong;
  }
  if (normalizedAction.includes("reduce")) {
    return isShort ? strategyCopy.orderReduceShort : strategyCopy.orderReduceLong;
  }
  if (normalizedAction.includes("add") || normalizedAction.includes("increase")) {
    return isShort ? strategyCopy.orderAddShort : strategyCopy.orderAddLong;
  }
  if (normalizedAction.includes("open")) {
    return isShort ? strategyCopy.orderOpenShort : strategyCopy.orderOpenLong;
  }
  if (normalizedSide.includes("short") || normalizedSide.includes("sell")) {
    return strategyCopy.orderOpenShort;
  }
  if (normalizedSide.includes("long") || normalizedSide.includes("buy")) {
    return strategyCopy.orderOpenLong;
  }
  return row.action || row.signalSourceOrder?.side || "--";
}

function getTradeHistorySideClassName(isDarkTheme: boolean, row: TradeHistoryRow): string {
  if (row.kind === "tradeLog" && !row.side) {
    return isDarkTheme ? "text-rose-300" : "text-rose-600";
  }
  return getSideClassName(isDarkTheme, row.side || row.action);
}

function formatTradeHistoryStatus(row: TradeHistoryRow, strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"]): string {
  if (row.kind === "me") {
    return formatOrderStatus(row.status, strategyCopy);
  }
  if (row.kind === "tradeLog") {
    return row.status || strategyCopy.tradeEventNoOrder;
  }
  return "--";
}

function getTradeHistoryStatusClassName(isDarkTheme: boolean, row: TradeHistoryRow): string {
  if (row.kind === "me") {
    return isDarkTheme ? "px-3 py-4 font-black text-emerald-300" : "px-3 py-4 font-black text-emerald-600";
  }
  if (row.kind === "tradeLog") {
    return isDarkTheme ? "px-3 py-4 font-black text-rose-300" : "px-3 py-4 font-black text-rose-600";
  }
  return isDarkTheme ? "px-3 py-4 font-semibold text-slate-500" : "px-3 py-4 font-semibold text-slate-400";
}

function formatOrderStatus(value: string | undefined, strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"]): string {
  const normalizedValue = (value ?? "").toLowerCase();
  if (normalizedValue === "closed" || normalizedValue === "filled") {
    return strategyCopy.orderStatusCompleted;
  }
  return value || "--";
}

function getSideClassName(isDarkTheme: boolean, value: string | undefined): string {
  const normalizedValue = (value ?? "").toLowerCase();
  if (normalizedValue.includes("long") || normalizedValue.includes("buy")) {
    return isDarkTheme ? "text-emerald-300" : "text-emerald-600";
  }
  if (normalizedValue.includes("short") || normalizedValue.includes("sell")) {
    return "text-[#ff2d3d]";
  }
  return isDarkTheme ? "text-slate-300" : "text-slate-700";
}

function getPnlClassName(isDarkTheme: boolean, value: number): string {
  if (value > 0) {
    return isDarkTheme ? "text-emerald-300" : "text-emerald-600";
  }
  if (value < 0) {
    return "text-[#ff2d3d]";
  }
  return isDarkTheme ? "text-slate-300" : "text-slate-700";
}

function formatDetailDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return date.toLocaleString();
}

function PercentInput({
  copyLabel,
  fieldName,
  isDarkTheme,
  placeholder,
  value,
  onChange,
}: {
  copyLabel: string;
  fieldName: string;
  isDarkTheme: boolean;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `copy-trading-${fieldName}`;

  return (
    <label className="block" htmlFor={id}>
      <span className={getLabelClassName(isDarkTheme)}>{copyLabel}</span>
      <div className="relative mt-2">
        <input
          className={isDarkTheme ? "h-12 w-full rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 pr-8 text-sm font-black text-slate-100 outline-none transition focus:border-sky-400/45" : "h-12 w-full rounded-2xl border border-[#D5E4EF] bg-white px-3 pr-8 text-sm font-black text-slate-950 outline-none transition focus:border-[#7DBEFF]"}
          id={id}
          inputMode="decimal"
          name={id}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className={isDarkTheme ? "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500" : "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400"}>%</span>
      </div>
    </label>
  );
}

function PrototypeInput({
  autoComplete,
  fieldName,
  inputMode,
  isDarkTheme,
  label,
  placeholder,
  type = "text",
  value,
  onChange,
}: {
  autoComplete?: string;
  fieldName: string;
  inputMode?: "decimal" | "numeric" | "text";
  isDarkTheme: boolean;
  label: string;
  placeholder?: string;
  type?: "password" | "text";
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `copy-trading-api-${fieldName}`;

  return (
    <label className="block" htmlFor={id}>
      <span className={getLabelClassName(isDarkTheme)}>{label}</span>
      <input
        autoComplete={autoComplete}
        className={isDarkTheme ? "mt-2 h-12 w-full rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 text-sm font-semibold text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-sky-400/45" : "mt-2 h-12 w-full rounded-2xl border border-[#D5E4EF] bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#7DBEFF]"}
        id={id}
        inputMode={inputMode}
        name={id}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function formatAccountBalance(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }
  const prefix = value < 0 ? "-" : "";
  return `${prefix}$${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

function MiniMetric({ isDarkTheme, label, value, valueClassName }: { isDarkTheme: boolean; label: string; value: string; valueClassName?: string }) {
  const baseValueClassName = "mt-1 truncate text-xs font-black";
  const defaultValueColorClassName = isDarkTheme ? "text-slate-100" : "text-slate-900";
  return (
    <div className={isDarkTheme ? "rounded-xl border border-white/[0.06] bg-white/[0.035] px-2 py-2" : "rounded-xl border border-[#E5EAF0] bg-white px-2 py-2"}>
      <div className={isDarkTheme ? "text-[10px] font-semibold text-slate-500" : "text-[10px] font-semibold text-slate-400"}>{label}</div>
      <div className={`${baseValueClassName} ${valueClassName ?? defaultValueColorClassName}`}>{value}</div>
    </div>
  );
}

function ExchangeIcon({ enabled, exchange, isDarkTheme }: { enabled: boolean; exchange: PrototypeExchange; isDarkTheme: boolean }) {
  const [failedLogoPath, setFailedLogoPath] = useState<string | null>(null);
  const canShowLogo = exchange.logoPath && failedLogoPath !== exchange.logoPath;

  const shellClassName = enabled
    ? isDarkTheme ? "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-sky-400/15 text-xs font-black text-sky-200" : "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-[#EAF8FE] text-xs font-black text-[#008DCC]"
    : isDarkTheme ? "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-white/[0.06] text-xs font-black text-slate-500" : "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-slate-100 text-xs font-black text-slate-400";

  return (
    <span className={shellClassName}>
      <span className="leading-none">{exchange.fallback}</span>
      {canShowLogo ? (
        <Image
          alt=""
          className={`absolute h-8 w-8 rounded-[10px] object-contain transition-opacity ${enabled ? "" : "opacity-55 grayscale"}`}
          height={32}
          loading="lazy"
          src={exchange.logoPath}
          unoptimized
          width={32}
          onError={() => setFailedLogoPath(exchange.logoPath)}
        />
      ) : null}
    </span>
  );
}

function ExternalLinkGlyph() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M8 8H6.8C5.81 8 5 8.81 5 9.8V17.2C5 18.19 5.81 19 6.8 19H14.2C15.19 19 16 18.19 16 17.2V16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      <path d="M13 5H19V11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      <path d="M11 13L18.5 5.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  );
}

function CopyGlyph() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <rect height="12" rx="2" stroke="currentColor" strokeLinejoin="round" strokeWidth="2.1" width="12" x="8" y="8" />
      <path d="M5 15.2V6.8C5 5.81 5.81 5 6.8 5H15.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.1" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M5 12.4L9.4 16.8L19 7.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
    </svg>
  );
}

function getExchangeById(exchangeId: PrototypeExchangeId): PrototypeExchange {
  return EXCHANGES.find((exchange) => exchange.id === exchangeId) ?? EXCHANGES[0];
}

function getExchangeName(accountCopy: WorkspaceCopy["workspace"]["accountCenter"], id: PrototypeExchangeId): string {
  return accountCopy.exchanges[id];
}

function getPrimaryButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "inline-flex min-h-10 items-center justify-center rounded-2xl bg-sky-400 px-4 text-sm font-black text-slate-950 shadow-sm transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-45"
    : "inline-flex min-h-10 items-center justify-center rounded-2xl bg-[#16AFF5] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#008DCC] disabled:cursor-not-allowed disabled:opacity-45";
}

function getExchangeResourceLinkClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "inline-flex h-9 min-w-[74px] items-center justify-center gap-1.5 rounded-xl border border-white/[0.075] bg-white/[0.08] px-3 text-xs font-black text-slate-200 transition hover:border-sky-300/25 hover:bg-white/[0.12] hover:text-slate-50"
    : "inline-flex h-9 min-w-[74px] items-center justify-center gap-1.5 rounded-xl border border-[#D5E4EF] bg-[#F8FAFC] px-3 text-xs font-black text-slate-700 shadow-sm transition hover:border-[#BFE7FB] hover:bg-white hover:text-slate-950";
}

function getWhitelistCopyButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/[0.085] bg-white/[0.04] text-slate-300 transition hover:border-sky-300/25 hover:bg-white/[0.08] hover:text-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
    : "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#D5E4EF] bg-white text-slate-500 shadow-sm transition hover:border-[#BFE7FB] hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-45";
}

function getModalSectionClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-[24px] border border-white/[0.075] bg-white/[0.035] p-4"
    : "rounded-[24px] border border-[#E5EAF0] bg-white p-4 shadow-sm";
}

function getErrorPanelClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "whitespace-pre-line break-words rounded-[24px] border border-rose-400/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100"
    : "whitespace-pre-line break-words rounded-[24px] border border-rose-100 bg-rose-50 p-4 text-sm leading-6 text-rose-700";
}

function getInlineErrorClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "mt-3 whitespace-pre-line break-words text-xs leading-5 text-rose-200"
    : "mt-3 whitespace-pre-line break-words text-xs leading-5 text-rose-700";
}

function getExchangeButtonClassName(isDarkTheme: boolean, enabled: boolean, isSelected: boolean): string {
  if (enabled && isSelected) {
    return isDarkTheme
      ? "flex min-w-[220px] items-center gap-3 rounded-2xl lg:w-full border border-sky-400/30 bg-sky-400/10 px-3 py-3 text-left text-sky-100 shadow-[0_0_0_3px_rgba(56,189,248,0.10)]"
      : "flex min-w-[220px] items-center gap-3 rounded-2xl lg:w-full border border-[#B7E8FC] bg-[#EAF8FE] px-3 py-3 text-left text-[#007DB8] shadow-[0_0_0_3px_rgba(22,175,245,0.10)]";
  }

  if (enabled) {
    return isDarkTheme
      ? "flex min-w-[220px] items-center gap-3 rounded-2xl lg:w-full border border-transparent px-3 py-3 text-left text-slate-300 transition hover:border-white/[0.075] hover:bg-white/[0.055]"
      : "flex min-w-[220px] items-center gap-3 rounded-2xl lg:w-full border border-transparent px-3 py-3 text-left text-slate-700 transition hover:border-[#E5EAF0] hover:bg-white";
  }

  return isDarkTheme
    ? "flex min-w-[220px] cursor-not-allowed items-center gap-3 rounded-2xl lg:w-full border border-transparent px-3 py-3 text-left text-slate-500 opacity-55"
    : "flex min-w-[220px] cursor-not-allowed items-center gap-3 rounded-2xl lg:w-full border border-transparent px-3 py-3 text-left text-slate-500 opacity-60";
}

function getSoftButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "inline-flex min-h-9 items-center justify-center rounded-xl border border-white/[0.075] bg-white/[0.04] px-3 text-xs font-black text-slate-200 transition hover:bg-white/[0.08]"
    : "inline-flex min-h-9 items-center justify-center rounded-xl border border-[#D5E4EF] bg-white px-3 text-xs font-black text-slate-700 transition hover:border-[#BFE7FB] hover:bg-[#F4FBFF] hover:text-slate-950";
}

function getDangerButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "inline-flex min-h-9 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 text-xs font-black text-rose-200 transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-45"
    : "inline-flex min-h-9 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 px-3 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-45";
}

function getIconButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.075] bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-slate-50"
    : "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#E5EAF0] bg-white text-slate-500 transition hover:border-[#BFE7FB] hover:text-slate-900";
}

function getLabelClassName(isDarkTheme: boolean): string {
  return isDarkTheme ? "text-xs font-black text-slate-300" : "text-xs font-black text-slate-700";
}

function getPrototypeStrategyType(strategy: PrototypeStrategy): PrototypeStrategyType {
  return strategy.strategyType ?? "copyTrading";
}

function getStrategyTypeOptionClassName(isDarkTheme: boolean, isSelected: boolean): string {
  if (isSelected) {
    return isDarkTheme
      ? "rounded-2xl border border-sky-400/30 bg-sky-400/10 px-3 py-3 text-left text-sky-100 shadow-[0_0_0_3px_rgba(56,189,248,0.10)]"
      : "rounded-2xl border border-[#B7E8FC] bg-[#EAF8FE] px-3 py-3 text-left text-[#007DB8] shadow-[0_0_0_3px_rgba(22,175,245,0.10)]";
  }

  return isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-3 text-left text-slate-200 transition hover:bg-white/[0.055]"
    : "rounded-2xl border border-[#E5EAF0] bg-white px-3 py-3 text-left text-slate-900 transition hover:border-[#BFE7FB] hover:bg-[#F4FBFF]";
}

function getStrategyStatusLabel(strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"], status: PrototypeStrategyStatus): string {
  if (status === "paused") {
    return strategyCopy.paused;
  }
  if (status === "stopped") {
    return strategyCopy.stopped;
  }
  return strategyCopy.running;
}

function getStrategyStatusClassName(isDarkTheme: boolean, status: PrototypeStrategyStatus): string {
  if (status === "running") {
    return isDarkTheme ? "shrink-0 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-black text-emerald-300" : "shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700";
  }
  if (status === "paused") {
    return isDarkTheme ? "shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-black text-amber-300" : "shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700";
  }
  return isDarkTheme ? "shrink-0 rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-black text-slate-300" : "shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600";
}
