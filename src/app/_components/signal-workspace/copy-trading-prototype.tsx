"use client";

import Image from "next/image";
import * as SelectPrimitive from "@radix-ui/react-select";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type { TelegramSessionUser } from "@/app/_lib/auth/telegram-auth";
import type { TradingFoxPosition, TradingFoxStrategyDetail } from "@/app/_lib/tradingfox-control-plane";
import type { CopyTradingTrader } from "@/app/_types/copy-trading";
import { SourceAvatar } from "./card-ui";

export type CopyTradingPrototypeTarget = {
  eventsCount: number;
  positionsCount: number;
  trader: CopyTradingTrader;
};

export type PrototypeApiConnection = {
  accountName: string;
  accountBalance: number | null;
  id: number;
  connectedAtLabel: string;
  exchangePlatform: string;
  isMock: boolean;
  mockMarginBalance: number | null;
  status: "empty" | "connected";
};

export type PrototypeStrategyStatus = "running" | "paused" | "stopped";

export type PrototypeStrategy = {
  apiAccountName: string;
  accountEquity?: number;
  exchangeConnectorId: number;
  avatarUrl: string;
  createdAtLabel: string;
  eventsCount: number;
  id: string;
  platform: string;
  positionsCount: number;
  status: PrototypeStrategyStatus;
  stopLossPercent: number;
  takeProfitPercent: number;
  traderId: string;
  traderName: string;
  unrealizedPnl?: number;
};

type AccountCenterPrototypeProps = {
  apiConnection: PrototypeApiConnection;
  apiConnections: readonly PrototypeApiConnection[];
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
  onConnectionSave: (input: PrototypeConnectionSaveInput) => void;
  onLogin: () => void;
  onLogout: () => void;
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

const WHITELIST_IP = "192.0.0.1";
const BINANCE_DEMO_API_MANAGEMENT_URL = "https://demo.binance.com/zh-CN/my/settings/api-management";
const MOCK_MARGIN_BALANCE_MAX = 100000;
const MOCK_MARGIN_BALANCE_PRESETS = [1000, 5000, 10000] as const;

export type PrototypeConnectionSaveInput = {
  accountName: string;
  apiKey?: string;
  exchangePlatform: string;
  mockMarginBalance: number;
  secret?: string;
};

const EXCHANGES = [
  { id: "binance", connectorExchangePlatform: "Binance", defaultAccountName: "Binance #1", enabled: false, fallback: "BN", logoPath: "/exchanges/binance/brand/icon.png", mode: "api" },
  { id: "mockExchange", connectorExchangePlatform: "Mock", defaultAccountName: "Mock Exchange #1", enabled: true, fallback: "MX", logoPath: "/exchanges/binance/brand/icon.png", mode: "demo" },
  { id: "binanceDemo", connectorExchangePlatform: "Binance", defaultAccountName: "Binance Demo #1", enabled: true, fallback: "BN", logoPath: "/exchanges/binance/brand/icon.png", mode: "demo" },
  { id: "okx", connectorExchangePlatform: "OKX", defaultAccountName: "OKX #1", enabled: false, fallback: "OK", logoPath: "/exchanges/okx/brand/icon.png", mode: "api" },
  { id: "hyperliquid", connectorExchangePlatform: "Hyperliquid", defaultAccountName: "Hyperliquid #1", enabled: false, fallback: "HL", logoPath: "/exchanges/hyperliquid/brand/icon.png", mode: "api" },
  { id: "aster", connectorExchangePlatform: "Aster", defaultAccountName: "Aster #1", enabled: false, fallback: "AS", logoPath: "/exchanges/aster/brand/icon.png", mode: "api" },
  { id: "bitget", connectorExchangePlatform: "Bitget", defaultAccountName: "Bitget #1", enabled: false, fallback: "BG", logoPath: "/exchanges/bitget/brand/icon.png", mode: "api" },
  { id: "bybit", connectorExchangePlatform: "Bybit", defaultAccountName: "Bybit #1", enabled: false, fallback: "BY", logoPath: "/exchanges/bybit/brand/icon.png", mode: "api" },
  { id: "gate", connectorExchangePlatform: "Gate", defaultAccountName: "Gate #1", enabled: false, fallback: "GT", logoPath: "/exchanges/gate/brand/icon.png", mode: "api" },
] as const;
type PrototypeExchange = typeof EXCHANGES[number];
type PrototypeExchangeId = PrototypeExchange["id"];

export function AccountCenterPrototype({
  apiConnection,
  apiConnections,
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
  onConnectionSave,
  onLogin,
  onLogout,
  onStrategyDelete,
  onStrategyStatusChange,
}: AccountCenterPrototypeProps) {
  const accountCopy = copy.workspace.accountCenter;
  const isDrawerModal = !isApiSetupOpen && !isCoveredByModal;
  const hasApiConnections = apiConnections.length > 0;
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const selectedStrategy = strategies.find((strategy) => strategy.id === selectedStrategyId) ?? null;


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
                            isDarkTheme={isDarkTheme}
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
                      <h3 className="text-sm font-black">{accountCopy.strategy.title}</h3>
                      <span className={isDarkTheme ? "text-xs font-bold text-slate-500" : "text-xs font-bold text-slate-400"}>{strategies.length}</span>
                    </div>
                    <div className="mt-3 grid gap-3">
                      {strategies.length > 0 ? strategies.map((strategy) => (
                        <PrototypeStrategyCard
                          key={strategy.id}
                          copy={copy}
                          isDarkTheme={isDarkTheme}
                          strategy={strategy}
                          onOpenDetail={setSelectedStrategyId}
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
    </>
  );
}

export function AccountManagementPanel({
  apiConnection,
  apiConnections,
  copy,
  isApiSetupOpen,
  isAuthLoading,
  isDarkTheme,
  strategies,
  telegramUser,
  onApiSetupOpen,
  onApiSetupOpenChange,
  onConnectionSave,
  onLogin,
  onLogout,
  onStrategyDelete,
  onStrategyStatusChange,
}: {
  apiConnection: PrototypeApiConnection;
  apiConnections: readonly PrototypeApiConnection[];
  copy: WorkspaceCopy;
  isApiSetupOpen: boolean;
  isAuthLoading: boolean;
  isDarkTheme: boolean;
  strategies: readonly PrototypeStrategy[];
  telegramUser: TelegramSessionUser | null;
  onApiSetupOpen: () => void;
  onApiSetupOpenChange: (isOpen: boolean) => void;
  onConnectionSave: (input: PrototypeConnectionSaveInput) => void;
  onLogin: () => void;
  onLogout: () => void;
  onStrategyDelete: (strategyId: string) => Promise<void> | void;
  onStrategyStatusChange: (strategyId: string, status: PrototypeStrategyStatus) => Promise<void> | void;
}) {
  const accountCopy = copy.workspace.accountCenter;
  const hasApiConnections = apiConnections.length > 0;
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const selectedStrategy = strategies.find((strategy) => strategy.id === selectedStrategyId) ?? null;

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
                    isDarkTheme={isDarkTheme}
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
                <h2 className="text-base font-black">{accountCopy.strategy.title}</h2>
                <span className={isDarkTheme ? "text-xs font-bold text-slate-500" : "text-xs font-bold text-slate-400"}>{strategies.length}</span>
              </div>
              <div className="mt-3 grid gap-3">
                {strategies.length > 0 ? strategies.map((strategy) => (
                  <PrototypeStrategyCard
                    key={strategy.id}
                    copy={copy}
                    isDarkTheme={isDarkTheme}
                    strategy={strategy}
                    onOpenDetail={setSelectedStrategyId}
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

function ApiConnectionCard({
  accountCopy,
  apiConnection,
  isDarkTheme,
}: {
  accountCopy: WorkspaceCopy["workspace"]["accountCenter"];
  apiConnection: PrototypeApiConnection;
  isDarkTheme: boolean;
}) {
  const exchangeLabel = getConnectionExchangeLabel(accountCopy, apiConnection);

  return (
    <div className={isDarkTheme ? "rounded-3xl border border-emerald-400/10 bg-emerald-400/[0.06] p-3" : "rounded-3xl border border-emerald-100 bg-emerald-50/70 p-3"}>
      <div className="flex items-start gap-3">
        <div className={isDarkTheme ? "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-400/10 text-xs font-black text-emerald-200" : "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-xs font-black text-emerald-700 shadow-sm"}>
          {getConnectionFallback(apiConnection)}
        </div>
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
          <div className={isDarkTheme ? "mt-3 text-xs text-emerald-200/70" : "mt-3 text-xs text-emerald-700/75"}>
            #{apiConnection.id} · {accountCopy.api.updatedAt}: {apiConnection.connectedAtLabel || "--"}
          </div>
        </div>
      </div>
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
  size: "compact" | "large";
  user: TelegramSessionUser | null;
}) {
  const baseClassName = size === "large"
    ? "grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-cover bg-center text-sm font-black"
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
  const [selectedExchangeId, setSelectedExchangeId] = useState<PrototypeExchangeId>("binanceDemo");
  const selectedExchange = getExchangeById(selectedExchangeId);
  const [accountName, setAccountName] = useState(initialAccountName || selectedExchange.defaultAccountName);
  const [mockMarginBalance, setMockMarginBalance] = useState(String(initialMockMarginBalance ?? 10000));
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [hasTestedConnection, setHasTestedConnection] = useState(false);
  const [hasCopiedIp, setHasCopiedIp] = useState(false);
  const accountCopy = copy.workspace.accountCenter;
  const isDemoExchange = selectedExchange.mode === "demo";
  const isBuiltInMockExchange = selectedExchange.id === "mockExchange";
  const isBinanceDemoExchange = selectedExchange.id === "binanceDemo";
  const requiresApiCredentials = !isBuiltInMockExchange;
  const parsedMockMarginBalance = Number(mockMarginBalance);
  const hasValidMockMarginBalance = Number.isFinite(parsedMockMarginBalance) && parsedMockMarginBalance > 0 && parsedMockMarginBalance <= MOCK_MARGIN_BALANCE_MAX;
  const hasApiCredentials = apiKey.trim().length > 0 && secret.trim().length > 0;

  const canTest = !isDemoExchange && accountName.trim().length > 0 && hasApiCredentials;
  const canSave = isBuiltInMockExchange
    ? accountName.trim().length > 0 && hasValidMockMarginBalance
    : isBinanceDemoExchange
      ? accountName.trim().length > 0 && hasValidMockMarginBalance && hasApiCredentials
      : hasTestedConnection;
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
    setHasTestedConnection(false);
    setHasCopiedIp(false);
    setApiKey("");
    setSecret("");
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
        className="fixed inset-x-0 bottom-0 z-[115] max-h-[94dvh] overflow-hidden rounded-t-[30px] shadow-[0_-26px_88px_rgba(15,23,42,0.26)] sm:inset-x-3 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:max-h-[min(820px,calc(100dvh-2rem))] sm:max-w-[760px] sm:-translate-y-1/2 sm:rounded-[30px] sm:shadow-[0_30px_90px_rgba(15,23,42,0.26)]"
        role="dialog"
      >
        <form
          className={isDarkTheme ? "flex max-h-[94dvh] flex-col border border-white/[0.085] bg-[#111820] text-slate-100 sm:max-h-[min(820px,calc(100dvh-2rem))]" : "flex max-h-[94dvh] flex-col border border-[#D5E4EF] bg-white text-slate-950 sm:max-h-[min(820px,calc(100dvh-2rem))]"}
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
            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
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
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button className={getSoftButtonClassName(isDarkTheme)} type="button">↗ {accountCopy.apiSetup.register}</button>
                        <button className={getSoftButtonClassName(isDarkTheme)} type="button">▣ {accountCopy.apiSetup.guide}</button>
                      </div>
                    )}
                  </div>
                </section>

                {isDemoExchange ? (
                  <section className={getModalSectionClassName(isDarkTheme)}>
                    <h3 className="text-base font-black">{accountCopy.apiSetup.demoTitle}</h3>
                    <p className={isDarkTheme ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-600"}>
                      {selectedExchange.id === "mockExchange" ? accountCopy.apiSetup.mockExchangeDescription : accountCopy.apiSetup.binanceDemoDescription}
                    </p>
                    {isBinanceDemoExchange ? (
                      <a
                        className={`${getSoftButtonClassName(isDarkTheme)} mt-3 w-fit`}
                        href={BINANCE_DEMO_API_MANAGEMENT_URL}
                        rel="noreferrer"
                        target="_blank"
                      >
                        ↗ {accountCopy.apiSetup.binanceDemoApiManagement}
                      </a>
                    ) : null}
                    <div className={isDarkTheme ? "mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] px-3 py-3 text-xs leading-5 text-emerald-100/85" : "mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-800"}>
                      {accountCopy.apiSetup.demoRiskNote}
                    </div>
                    <div className="mt-4 grid gap-3">
                      <PrototypeInput autoComplete="off" fieldName="account-name" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.accountName} value={accountName} onChange={setAccountName} />
                      {requiresApiCredentials ? (
                        <>
                          <PrototypeInput autoComplete="off" fieldName="api-key" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.apiKey} placeholder={accountCopy.apiSetup.apiKeyPlaceholder} value={apiKey} onChange={setApiKey} />
                          <PrototypeInput autoComplete="new-password" fieldName="secret" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.secret} placeholder={accountCopy.apiSetup.secretPlaceholder} type="password" value={secret} onChange={setSecret} />
                        </>
                      ) : null}
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
                    </div>
                    <p className={isDarkTheme ? "mt-3 text-xs leading-5 text-slate-500" : "mt-3 text-xs leading-5 text-slate-500"}>{accountCopy.apiSetup.sensitiveNote}</p>
                  </section>
                ) : (
                  <>
                    <section className={getModalSectionClassName(isDarkTheme)}>
                      <div className={getLabelClassName(isDarkTheme)}>{accountCopy.apiSetup.whitelistIp}</div>
                      <div className="mt-3 flex gap-2">
                        <div className={isDarkTheme ? "min-w-0 flex-1 rounded-2xl border border-white/[0.075] bg-[#0F141B] px-3 py-3 font-mono text-sm font-black tracking-wide text-slate-100" : "min-w-0 flex-1 rounded-2xl border border-[#D5E4EF] bg-[#F8FAFC] px-3 py-3 font-mono text-sm font-black tracking-wide text-slate-900"}>
                          {WHITELIST_IP}
                        </div>
                        <button
                          aria-label={accountCopy.apiSetup.copyWhitelistIp}
                          className={getIconButtonClassName(isDarkTheme)}
                          title={accountCopy.apiSetup.copyWhitelistIp}
                          type="button"
                          onClick={() => {
                            setHasCopiedIp(true);
                            void navigator.clipboard?.writeText(WHITELIST_IP);
                          }}
                        >
                          {hasCopiedIp ? "✓" : "□"}
                        </button>
                      </div>
                    </section>

                    <section className={getModalSectionClassName(isDarkTheme)}>
                      <h3 className="text-base font-black">{accountCopy.api.title}</h3>
                      <div className="mt-4 grid gap-3">
                        <PrototypeInput autoComplete="off" fieldName="account-name" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.accountName} value={accountName} onChange={setAccountName} />
                        <PrototypeInput autoComplete="off" fieldName="api-key" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.apiKey} placeholder={accountCopy.apiSetup.apiKeyPlaceholder} value={apiKey} onChange={setApiKey} />
                        <PrototypeInput autoComplete="new-password" fieldName="secret" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.secret} placeholder={accountCopy.apiSetup.secretPlaceholder} type="password" value={secret} onChange={setSecret} />
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
            {!isDemoExchange ? (
              <button
                className={hasTestedConnection
                  ? isDarkTheme ? "inline-flex min-h-10 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 text-sm font-black text-emerald-200" : "inline-flex min-h-10 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 px-4 text-sm font-black text-emerald-700"
                  : getSoftButtonClassName(isDarkTheme)}
                disabled={!canTest}
                type="button"
                onClick={() => setHasTestedConnection(true)}
              >
                {hasTestedConnection ? accountCopy.apiSetup.tested : accountCopy.apiSetup.test}
              </button>
            ) : null}
            <button
              className={getPrimaryButtonClassName(isDarkTheme)}
              disabled={!canSave}
              type="button"
              onClick={() => onSave({
                accountName: accountName.trim() || selectedExchange.defaultAccountName,
                apiKey: requiresApiCredentials ? apiKey.trim() : undefined,
                exchangePlatform: selectedExchange.connectorExchangePlatform,
                mockMarginBalance: hasValidMockMarginBalance ? parsedMockMarginBalance : 10000,
                secret: requiresApiCredentials ? secret.trim() : undefined,
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
  onOpenDetail: (strategyId: string) => void;
  onStrategyDelete: (strategyId: string) => Promise<void> | void;
  onStrategyStatusChange: (strategyId: string, status: PrototypeStrategyStatus) => Promise<void> | void;
}) {
  const strategyCopy = copy.workspace.accountCenter.strategy;
  const statusLabel = getStrategyStatusLabel(strategyCopy, strategy.status);

  return (
    <article className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-[#181A20] p-3" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3"}>
      <button
        className="block w-full text-left"
        type="button"
        onClick={() => onOpenDetail(strategy.id)}
      >
      <div className="flex items-start gap-3">
        <SourceAvatar isDarkTheme={isDarkTheme} name={strategy.traderName} url={strategy.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h4 className="truncate text-sm font-black">{strategy.traderName}</h4>
            <span className={getStrategyStatusClassName(isDarkTheme, strategy.status)}>{statusLabel}</span>
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
        {strategyCopy.stopNote}
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
  onBack,
  onStrategyDelete,
  onStrategyStatusChange,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  strategy: PrototypeStrategy;
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
  const strategyCopy = copy.workspace.accountCenter.strategy;

  useEffect(() => {
    let isMounted = true;

    const loadDetail = async () => {
      setIsLoading(true);
      setError("");
      try {
        const nextDetail = await requestStrategyDetail(strategy.id);
        if (isMounted) {
          setDetail(nextDetail);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Strategy detail failed.");
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
  }, [strategy.id]);

  const liveStrategy = detail?.strategy ?? strategy;
  const parsedSyncRatioPercent = Number(syncRatioPercent);
  const canSyncPositions = Boolean(detail?.trader.enabled) && Number.isFinite(parsedSyncRatioPercent) && parsedSyncRatioPercent > 0 && !isSyncingPositions;
  const orderItems = detail?.orderHistory?.items ?? [];

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
      setSyncMessage(strategyCopy.syncPositionsSuccess);
    } catch (syncPositionsError) {
      setSyncError(syncPositionsError instanceof Error ? syncPositionsError.message : "Position sync failed.");
    } finally {
      setIsSyncingPositions(false);
    }
  };

  const updateLifecycle = async (status: PrototypeStrategyStatus) => {
    setIsUpdatingLifecycle(true);
    setSyncError("");
    try {
      await onStrategyStatusChange(liveStrategy.id, status);
      setDetail(await requestStrategyDetail(liveStrategy.id));
    } catch (lifecycleError) {
      setSyncError(lifecycleError instanceof Error ? lifecycleError.message : "Strategy lifecycle update failed.");
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
      setSyncError(deleteError instanceof Error ? deleteError.message : "Strategy delete failed.");
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
          <p className={isDarkTheme ? "mt-3 text-xs leading-5 text-amber-200" : "mt-3 text-xs leading-5 text-amber-700"}>{detail.trader.statusMessage}</p>
        ) : null}
      </div>

      {isLoading ? (
        <div className={getModalSectionClassName(isDarkTheme)}>{strategyCopy.loadingDetail}</div>
      ) : error ? (
        <div className={isDarkTheme ? "rounded-[24px] border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100" : "rounded-[24px] border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700"}>{error}</div>
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
            {syncError ? <p className="mt-3 text-xs text-rose-500">{syncError}</p> : null}
            {!detail.trader.enabled ? <p className={isDarkTheme ? "mt-3 text-xs text-amber-200" : "mt-3 text-xs text-amber-700"}>{strategyCopy.syncPositionsDisabled}</p> : null}
          </section>

          <section className={getModalSectionClassName(isDarkTheme)}>
            <h3 className="text-sm font-black">{strategyCopy.copyPositions}</h3>
            {detail.positionsError ? <p className="mt-2 text-xs text-rose-500">{detail.positionsError}</p> : null}
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
            {detail.signalSourcesError ? <p className="mt-2 text-xs text-rose-500">{detail.signalSourcesError}</p> : null}
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
                    summary={createSignalSourcePositionSummary(source)}
                  />
                  {source.positions.length > 0 ? (
                    <SignalSourcePositionTable isDarkTheme={isDarkTheme} positions={source.positions} strategyCopy={strategyCopy} />
                  ) : <div className={isDarkTheme ? "mt-3 text-xs text-slate-500" : "mt-3 text-xs text-slate-500"}>{strategyCopy.signalSourcePositionsEmpty}</div>}
                </div>
              )) : <div className={isDarkTheme ? "text-sm text-slate-500" : "text-sm text-slate-500"}>{strategyCopy.signalSourcePositionsEmpty}</div>}
            </div>
          </section>

          <section className={getModalSectionClassName(isDarkTheme)}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black">{strategyCopy.tradeHistory}</h3>
              <span className={isDarkTheme ? "text-xs font-bold text-slate-500" : "text-xs font-bold text-slate-400"}>{orderItems.length}</span>
            </div>
            {detail.orderHistoryError ? <p className="mt-2 text-xs text-rose-500">{detail.orderHistoryError}</p> : null}
            {orderItems.length > 0 ? (
              <TradeHistoryTable isDarkTheme={isDarkTheme} orders={orderItems.slice(0, 20)} strategyCopy={strategyCopy} />
            ) : <div className={isDarkTheme ? "mt-3 text-sm text-slate-500" : "mt-3 text-sm text-slate-500"}>{strategyCopy.noTradeHistory}</div>}
          </section>

        </>
      ) : null}
    </section>
  );
}

async function requestStrategyDetail(strategyId: string): Promise<TradingFoxStrategyDetail> {
  const response = await fetch(`/api/tradingfox/copy-strategies/${encodeURIComponent(strategyId)}`, {
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
    ? "mt-3 rounded-2xl border border-white/[0.075] bg-[#111820] p-4"
    : "mt-3 rounded-2xl border border-[#E5EAF0] bg-white p-4";
  const pnlValue = summary.unrealizedPnl ?? 0;
  const pnlRateValue = summary.totalPnlRate ?? 0;

  return (
    <div className={containerClassName}>
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,24rem),1fr))]">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <PositionSummaryMetric isDarkTheme={isDarkTheme} label={strategyCopy.positionCount}>
            {summary.positionCount}
          </PositionSummaryMetric>
          <PositionSummaryMetric isDarkTheme={isDarkTheme} label={strategyCopy.availableTotalMargin}>
            <span className={isDarkTheme ? "text-emerald-300" : "text-emerald-600"}>{formatDetailCurrency(summary.availableMargin)}</span>
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
        </div>
        <div className="flex flex-col justify-between gap-6 text-left sm:flex-row sm:items-end sm:text-right">
          <div className="flex flex-wrap gap-x-5 gap-y-2 sm:justify-end">
            <span className={isDarkTheme ? "text-lg font-black text-emerald-300" : "text-lg font-black text-emerald-600"}>{strategyCopy.longRatio}:</span>
            <span className="text-lg font-black text-[#ff2d3d]">{strategyCopy.shortRatio}:</span>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 sm:justify-end">
            <span className={isDarkTheme ? "text-2xl font-black text-emerald-300" : "text-2xl font-black text-emerald-600"}>{formatUnsignedPercent(summary.longRatio)}</span>
            <span className="text-2xl font-black text-[#ff2d3d]">{formatUnsignedPercent(summary.shortRatio)}</span>
          </div>
        </div>
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
  const labelClassName = isDarkTheme ? "text-sm font-medium text-slate-400" : "text-sm font-medium text-slate-800";
  const defaultValueClassName = isDarkTheme ? "mt-2 flex items-baseline gap-0.5 text-2xl font-black text-slate-50" : "mt-2 flex items-baseline gap-0.5 text-2xl font-black text-slate-950";

  return (
    <div className="min-w-0">
      <div className={labelClassName}>{label}</div>
      <div className={`${defaultValueClassName} ${valueClassName ?? ""}`}>{children}</div>
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

function createSignalSourcePositionSummary(source: TradingFoxStrategyDetail["signalSources"][number]): PositionSummaryModel {
  const totals = summarizePositions(source.positions.map((position) => {
    const notional = getSignalSourcePositionNotional(position);
    const leverage = finiteNumberOrNull(position.leverage);
    return {
      margin: calculatePositionMargin(notional, leverage),
      notional,
      pnl: getSignalSourcePositionPnl(position),
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

function getSignalSourcePositionNotional(position: SignalSourcePosition): number | null {
  const size = finiteNumberOrNull(position.positionSize);
  const price = finiteNumberOrNull(position.markPrice) ?? finiteNumberOrNull(position.entryPrice);
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

function getSignalSourcePositionPnl(position: SignalSourcePosition): number | null {
  return calculatePositionPnl({
    entryPrice: finiteNumberOrNull(position.entryPrice),
    markPrice: finiteNumberOrNull(position.markPrice),
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
  isDarkTheme,
  positions,
  strategyCopy,
}: {
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
            <th className="px-3 py-3">{strategyCopy.tradeStatus}</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position, index) => (
            <tr key={`${position.symbol}-${position.positionSide}-${index}`} className={isDarkTheme ? "border-b border-white/[0.06] last:border-0" : "border-b border-[#DDE8F0] last:border-0"}>
              <td className="px-3 py-4 font-black underline underline-offset-2">{position.symbol}</td>
              <td className={`px-3 py-4 font-black ${getSideClassName(isDarkTheme, position.positionSide)}`}>{formatPositionSide(position.positionSide)}</td>
              <td className="px-3 py-4 font-semibold">{formatDetailNumber(position.positionSize)}</td>
              <td className="px-3 py-4 font-semibold">{formatLeverage(position.leverage)}</td>
              <td className="px-3 py-4 font-semibold">{formatDetailNumber(position.entryPrice)}</td>
              <td className="px-3 py-4 font-semibold">{formatDetailNumber(position.markPrice)}</td>
              <td className={position.skipTrade ? "px-3 py-4 font-black text-amber-500" : isDarkTheme ? "px-3 py-4 font-black text-emerald-300" : "px-3 py-4 font-black text-emerald-700"}>{position.skipTrade ? "skip" : "follow"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TradeHistoryTable({
  isDarkTheme,
  orders,
  strategyCopy,
}: {
  isDarkTheme: boolean;
  orders: NonNullable<TradingFoxStrategyDetail["orderHistory"]>["items"];
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
}) {
  return (
    <div className="kol-scroll-area mt-3 overflow-x-auto">
      <table className="min-w-[980px] w-full border-collapse text-left text-sm">
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
          {orders.map((order) => {
            const price = numberOrZero(order.price);
            const quantity = numberOrZero(order.contractAmount);
            const notional = price * quantity;
            return (
              <tr key={order.clientOrderId} className={isDarkTheme ? "border-b border-white/[0.06] last:border-0" : "border-b border-[#DDE8F0] last:border-0"}>
                <td className="px-3 py-4 font-semibold">{formatDetailDate(order.timestamp)}</td>
                <td className="px-3 py-4 font-semibold">{strategyCopy.orderSourceMe}</td>
                <td className="px-3 py-4 font-black">{order.symbol}</td>
                <td className={`px-3 py-4 font-black ${getSideClassName(isDarkTheme, order.side)}`}>{formatOrderSide(order.side, strategyCopy)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(order.price)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(order.contractAmount)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailCurrency(notional)}</td>
                <td className={isDarkTheme ? "px-3 py-4 font-black text-emerald-300" : "px-3 py-4 font-black text-emerald-600"}>{formatOrderStatus(order.status, strategyCopy)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
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
    ? isDarkTheme ? "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-sky-400/15 text-xs font-black text-sky-200" : "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#EAF8FE] text-xs font-black text-[#008DCC]"
    : isDarkTheme ? "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/[0.06] text-xs font-black text-slate-500" : "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-xs font-black text-slate-400";

  return (
    <span className={shellClassName}>
      <span className="leading-none">{exchange.fallback}</span>
      {canShowLogo ? (
        <Image
          alt=""
          className={`absolute h-7 w-7 object-contain transition-opacity ${enabled ? "" : "opacity-55 grayscale"}`}
          height={28}
          loading="lazy"
          src={exchange.logoPath}
          unoptimized
          width={28}
          onError={() => setFailedLogoPath(exchange.logoPath)}
        />
      ) : null}
    </span>
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

function getModalSectionClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-[24px] border border-white/[0.075] bg-white/[0.035] p-4"
    : "rounded-[24px] border border-[#E5EAF0] bg-white p-4 shadow-sm";
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
