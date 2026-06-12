"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type { TelegramSessionUser } from "@/app/_lib/auth/telegram-auth";
import type { TradingFoxStrategyDetail } from "@/app/_lib/tradingfox-control-plane";
import type { CopyTradingTrader } from "@/app/_types/copy-trading";
import { SourceAvatar } from "./card-ui";

export type CopyTradingPrototypeTarget = {
  eventsCount: number;
  positionsCount: number;
  trader: CopyTradingTrader;
};

export type PrototypeApiConnection = {
  accountName: string;
  connectedAtLabel: string;
  status: "empty" | "connected";
};

export type PrototypeStrategyStatus = "running" | "paused" | "stopped";

export type PrototypeStrategy = {
  apiAccountName: string;
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
};

type AccountCenterPrototypeProps = {
  apiConnection: PrototypeApiConnection;
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
  onConnectionSave: (accountName: string) => void;
  onLogin: () => void;
  onLogout: () => void;
  onStrategyStatusChange: (strategyId: string, status: PrototypeStrategyStatus) => void;
};

type CopyTradingPrototypeModalProps = {
  apiConnection: PrototypeApiConnection;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  target: CopyTradingPrototypeTarget | null;
  onClose: () => void;
  onStart: (input: {
    stopLossPercent: number;
    takeProfitPercent: number;
    target: CopyTradingPrototypeTarget;
  }) => void;
};

const WHITELIST_IP = "192.0.0.1";

const EXCHANGES = [
  { id: "binance", defaultAccountName: "Binance #1", enabled: false, fallback: "BN", logoPath: "/exchanges/binance/brand/icon.png", mode: "api" },
  { id: "mockExchange", defaultAccountName: "Mock Exchange #1", enabled: true, fallback: "MX", logoPath: "/exchanges/binance/brand/icon.png", mode: "demo" },
  { id: "binanceDemo", defaultAccountName: "Binance Demo #1", enabled: true, fallback: "BD", logoPath: "/exchanges/binance/brand/icon.png", mode: "demo" },
  { id: "okx", defaultAccountName: "OKX #1", enabled: false, fallback: "OK", logoPath: "/exchanges/okx/brand/icon.png", mode: "api" },
  { id: "hyperliquid", defaultAccountName: "Hyperliquid #1", enabled: false, fallback: "HL", logoPath: "/exchanges/hyperliquid/brand/icon.png", mode: "api" },
  { id: "aster", defaultAccountName: "Aster #1", enabled: false, fallback: "AS", logoPath: "/exchanges/aster/brand/icon.png", mode: "api" },
  { id: "bitget", defaultAccountName: "Bitget #1", enabled: false, fallback: "BG", logoPath: "/exchanges/bitget/brand/icon.png", mode: "api" },
  { id: "bybit", defaultAccountName: "Bybit #1", enabled: false, fallback: "BY", logoPath: "/exchanges/bybit/brand/icon.png", mode: "api" },
  { id: "gate", defaultAccountName: "Gate #1", enabled: false, fallback: "GT", logoPath: "/exchanges/gate/brand/icon.png", mode: "api" },
] as const;
type PrototypeExchange = typeof EXCHANGES[number];
type PrototypeExchangeId = PrototypeExchange["id"];

export function AccountCenterPrototype({
  apiConnection,
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
  onStrategyStatusChange,
}: AccountCenterPrototypeProps) {
  const accountCopy = copy.workspace.accountCenter;
  const isDrawerModal = !isApiSetupOpen && !isCoveredByModal;
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
                  onStrategyStatusChange={onStrategyStatusChange}
                />
              ) : (
                <>
              <section className={isDarkTheme ? "rounded-[24px] border border-white/[0.075] bg-white/[0.035] p-4" : "rounded-[24px] border border-[#E5EAF0] bg-white p-4 shadow-sm"}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black">{accountCopy.api.title}</h3>
                    <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-600"}>
                      {apiConnection.status === "connected" ? accountCopy.api.connectedDescription : accountCopy.api.emptyDescription}
                    </p>
                  </div>
                  <span className={apiConnection.status === "connected"
                    ? isDarkTheme ? "rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-black text-emerald-300" : "rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700"
                    : isDarkTheme ? "rounded-full bg-slate-700 px-2.5 py-1 text-[11px] font-black text-slate-300" : "rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600"}
                  >
                    {apiConnection.status === "connected" ? accountCopy.api.connected : accountCopy.api.empty}
                  </span>
                </div>
                {apiConnection.status === "connected" ? (
                  <div className={isDarkTheme ? "mt-4 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.06] p-3" : "mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3"}>
                    <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-black">{apiConnection.accountName}</div>
                        <div className={isDarkTheme ? "mt-1 text-xs text-emerald-200/75" : "mt-1 text-xs text-emerald-700/75"}>{apiConnection.connectedAtLabel}</div>
                      </div>
                      <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={onApiSetupOpen}>
                        {accountCopy.api.bindAction}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className={getPrimaryButtonClassName(isDarkTheme)} type="button" onClick={onApiSetupOpen}>
                    {accountCopy.api.bindAction}
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
          isDarkTheme={isDarkTheme}
          onClose={() => onApiSetupOpenChange(false)}
          onSave={(accountName) => {
            onConnectionSave(accountName);
            onApiSetupOpenChange(false);
          }}
        />
      ) : null}
    </>
  );
}

export function CopyTradingPrototypeModal({
  apiConnection,
  copy,
  isDarkTheme,
  target,
  onClose,
  onStart,
}: CopyTradingPrototypeModalProps) {
  const [takeProfitPercent, setTakeProfitPercent] = useState("20");
  const [stopLossPercent, setStopLossPercent] = useState("10");
  const accountCopy = copy.workspace.accountCenter;

  const parsedTakeProfit = Number(takeProfitPercent);
  const parsedStopLoss = Number(stopLossPercent);
  const canStart = Boolean(target)
    && apiConnection.status === "connected"
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
              <div className={isDarkTheme ? "mt-2 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-3 text-sm font-bold" : "mt-2 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-3 text-sm font-bold"}>
                {apiConnection.status === "connected" ? apiConnection.accountName : accountCopy.copyTrading.apiRequired}
              </div>
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
                onStart({
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
  isDarkTheme,
  onClose,
  onSave,
}: {
  copy: WorkspaceCopy;
  initialAccountName: string;
  isDarkTheme: boolean;
  onClose: () => void;
  onSave: (accountName: string) => void;
}) {
  const [selectedExchangeId, setSelectedExchangeId] = useState<PrototypeExchangeId>("mockExchange");
  const selectedExchange = getExchangeById(selectedExchangeId);
  const [accountName, setAccountName] = useState(initialAccountName || selectedExchange.defaultAccountName);
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [hasTestedConnection, setHasTestedConnection] = useState(false);
  const [hasCopiedIp, setHasCopiedIp] = useState(false);
  const accountCopy = copy.workspace.accountCenter;
  const isDemoExchange = selectedExchange.mode === "demo";

  const canTest = !isDemoExchange && accountName.trim().length > 0 && apiKey.trim().length > 0 && secret.trim().length > 0;
  const canSave = isDemoExchange || hasTestedConnection;
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
                      {exchange.mode === "demo" ? (
                        <span className={isDarkTheme ? "shrink-0 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black text-emerald-300" : "shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700"}>{accountCopy.apiSetup.demoBadge}</span>
                      ) : !exchange.enabled ? (
                        <span className={isDarkTheme ? "shrink-0 text-[10px] font-bold text-slate-500" : "shrink-0 text-[10px] font-bold text-slate-400"}>{accountCopy.apiSetup.comingSoon}</span>
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
                    {isDemoExchange ? (
                      <span className={isDarkTheme ? "rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200" : "rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"}>
                        {accountCopy.apiSetup.noKeysRequired}
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
                    <div className={isDarkTheme ? "mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] px-3 py-3 text-xs leading-5 text-emerald-100/85" : "mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-800"}>
                      {accountCopy.apiSetup.demoRiskNote}
                    </div>
                  </section>
                ) : (
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
                )}

                <section className={getModalSectionClassName(isDarkTheme)}>
                  <h3 className="text-base font-black">{isDemoExchange ? accountCopy.apiSetup.demoAccountTitle : accountCopy.api.title}</h3>
                  <div className="mt-4 grid gap-3">
                    <PrototypeInput autoComplete="off" fieldName="account-name" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.accountName} value={accountName} onChange={setAccountName} />
                    {!isDemoExchange ? (
                      <>
                        <PrototypeInput autoComplete="off" fieldName="api-key" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.apiKey} placeholder={accountCopy.apiSetup.apiKeyPlaceholder} value={apiKey} onChange={setApiKey} />
                        <PrototypeInput autoComplete="new-password" fieldName="secret" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.secret} placeholder={accountCopy.apiSetup.secretPlaceholder} type="password" value={secret} onChange={setSecret} />
                      </>
                    ) : null}
                  </div>
                  <p className={isDarkTheme ? "mt-3 text-xs leading-5 text-slate-500" : "mt-3 text-xs leading-5 text-slate-500"}>{accountCopy.apiSetup.sensitiveNote}</p>
                </section>
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
              onClick={() => onSave(accountName.trim() || selectedExchange.defaultAccountName)}
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
  onStrategyStatusChange,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  strategy: PrototypeStrategy;
  onOpenDetail: (strategyId: string) => void;
  onStrategyStatusChange: (strategyId: string, status: PrototypeStrategyStatus) => void;
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
        <MiniMetric isDarkTheme={isDarkTheme} label={copy.workspace.accountCenter.copyTrading.takeProfit} value={`${strategy.takeProfitPercent}%`} />
        <MiniMetric isDarkTheme={isDarkTheme} label={copy.workspace.accountCenter.copyTrading.stopLoss} value={`${strategy.stopLossPercent}%`} />
      </div>
      <p className={isDarkTheme ? "mt-3 text-[11px] leading-5 text-slate-500" : "mt-3 text-[11px] leading-5 text-slate-500"}>
        {strategyCopy.stopNote}
      </p>
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        {strategy.status === "running" ? (
          <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={() => onStrategyStatusChange(strategy.id, "paused")}>{strategyCopy.pause}</button>
        ) : strategy.status === "paused" ? (
          <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={() => onStrategyStatusChange(strategy.id, "running")}>{strategyCopy.resume}</button>
        ) : null}
        {strategy.status !== "stopped" ? (
          <button className={getDangerButtonClassName(isDarkTheme)} type="button" onClick={() => onStrategyStatusChange(strategy.id, "stopped")}>{strategyCopy.stop}</button>
        ) : null}
      </div>
    </article>
  );
}

function StrategyDetailView({
  copy,
  isDarkTheme,
  strategy,
  onBack,
  onStrategyStatusChange,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  strategy: PrototypeStrategy;
  onBack: () => void;
  onStrategyStatusChange: (strategyId: string, status: PrototypeStrategyStatus) => void;
}) {
  const [detail, setDetail] = useState<TradingFoxStrategyDetail | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const strategyCopy = copy.workspace.accountCenter.strategy;

  useEffect(() => {
    let isMounted = true;

    const loadDetail = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/tradingfox/copy-strategies/${encodeURIComponent(strategy.id)}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        const payload = await response.json() as TradingFoxStrategyDetail | { error?: string };
        if (!response.ok) {
          throw new Error("error" in payload && payload.error ? payload.error : `Strategy detail failed with status ${response.status}.`);
        }
        if (isMounted) {
          setDetail(payload as TradingFoxStrategyDetail);
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
  const signalSourceCount = detail?.signalSources.length ?? 0;
  const orderCount = detail?.orderHistory?.items.length ?? 0;
  const sourceOrderCount = detail?.orderHistory?.signalSourceOrders.length ?? 0;

  return (
    <section className="space-y-4">
      <div className={getModalSectionClassName(isDarkTheme)}>
        <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={onBack}>← Back</button>
        <div className="mt-4 flex items-start gap-3">
          <SourceAvatar isDarkTheme={isDarkTheme} name={liveStrategy.traderName} url={liveStrategy.avatarUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate text-lg font-black">{liveStrategy.traderName}</h3>
              <span className={getStrategyStatusClassName(isDarkTheme, liveStrategy.status)}>{getStrategyStatusLabel(strategyCopy, liveStrategy.status)}</span>
            </div>
            <p className={isDarkTheme ? "mt-1 text-xs font-bold text-slate-500" : "mt-1 text-xs font-bold text-slate-500"}>
              Trader #{liveStrategy.id} · {liveStrategy.platform} · {liveStrategy.apiAccountName}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <MiniMetric isDarkTheme={isDarkTheme} label="Equity" value={formatDetailNumber(detail?.account?.equity)} />
          <MiniMetric isDarkTheme={isDarkTheme} label="Signal sources" value={String(signalSourceCount)} />
          <MiniMetric isDarkTheme={isDarkTheme} label="Trader orders" value={String(orderCount)} />
          <MiniMetric isDarkTheme={isDarkTheme} label="Source orders" value={String(sourceOrderCount)} />
          <MiniMetric isDarkTheme={isDarkTheme} label={copy.workspace.accountCenter.copyTrading.takeProfit} value={`${liveStrategy.takeProfitPercent}%`} />
          <MiniMetric isDarkTheme={isDarkTheme} label={copy.workspace.accountCenter.copyTrading.stopLoss} value={`${liveStrategy.stopLossPercent}%`} />
        </div>
      </div>

      {isLoading ? (
        <div className={getModalSectionClassName(isDarkTheme)}>Loading strategy detail…</div>
      ) : error ? (
        <div className={isDarkTheme ? "rounded-[24px] border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100" : "rounded-[24px] border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700"}>{error}</div>
      ) : detail ? (
        <>
          <section className={getModalSectionClassName(isDarkTheme)}>
            <h3 className="text-sm font-black">Runtime</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <MiniMetric isDarkTheme={isDarkTheme} label="Desired" value={detail.trader.desiredState ?? (detail.trader.enabled ? "enabled" : "disabled")} />
              <MiniMetric isDarkTheme={isDarkTheme} label="Runtime" value={detail.trader.runtimeState ?? detail.trader.runtime?.state ?? "no_runtime"} />
              <MiniMetric isDarkTheme={isDarkTheme} label="Config rev" value={String(detail.trader.configRevision)} />
              <MiniMetric isDarkTheme={isDarkTheme} label="Leverage" value={`${formatDetailNumber(detail.trader.config.leverage)}x`} />
            </div>
            {detail.trader.statusMessage ? <p className={isDarkTheme ? "mt-3 text-xs leading-5 text-amber-200" : "mt-3 text-xs leading-5 text-amber-700"}>{detail.trader.statusMessage}</p> : null}
          </section>

          <section className={getModalSectionClassName(isDarkTheme)}>
            <h3 className="text-sm font-black">Signal sources</h3>
            {detail.signalSourcesError ? <p className="mt-2 text-xs text-rose-500">{detail.signalSourcesError}</p> : null}
            <div className="mt-3 grid gap-2">
              {detail.signalSources.length > 0 ? detail.signalSources.map((source) => (
                <div key={source.signalSourceId} className={isDarkTheme ? "rounded-2xl bg-white/[0.035] p-3" : "rounded-2xl bg-[#F8FAFC] p-3"}>
                  <div className="text-sm font-black">{source.name || source.signalSourceId}</div>
                  <div className={isDarkTheme ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-slate-500"}>{source.signalSourceId} · {source.status || "not returned"}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <MiniMetric isDarkTheme={isDarkTheme} label="Margin" value={formatDetailNumber(source.marginBalance)} />
                    <MiniMetric isDarkTheme={isDarkTheme} label="Follow" value={source.followSide || "both"} />
                  </div>
                </div>
              )) : <div className={isDarkTheme ? "text-sm text-slate-500" : "text-sm text-slate-500"}>No runtime signal source positions returned.</div>}
            </div>
          </section>

          <section className={getModalSectionClassName(isDarkTheme)}>
            <h3 className="text-sm font-black">Positions & orders</h3>
            {detail.positionsError ? <p className="mt-2 text-xs text-rose-500">{detail.positionsError}</p> : null}
            {detail.orderHistoryError ? <p className="mt-2 text-xs text-rose-500">{detail.orderHistoryError}</p> : null}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <MiniMetric isDarkTheme={isDarkTheme} label="Trader positions" value={String(detail.positions.length)} />
              <MiniMetric isDarkTheme={isDarkTheme} label="Trade logs" value={String(detail.orderHistory?.tradeLogs.length ?? 0)} />
            </div>
            <div className="mt-3 grid gap-2">
              {(detail.orderHistory?.items ?? []).slice(0, 5).map((order) => (
                <div key={order.clientOrderId} className={isDarkTheme ? "rounded-2xl bg-white/[0.035] px-3 py-2 text-xs" : "rounded-2xl bg-[#F8FAFC] px-3 py-2 text-xs"}>
                  <div className="font-black">{order.symbol} · {order.side.toUpperCase()} · {order.status || "unknown"}</div>
                  <div className={isDarkTheme ? "mt-1 text-slate-500" : "mt-1 text-slate-500"}>{formatDetailNumber(order.price)} · {new Date(order.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            {liveStrategy.status === "running" ? (
              <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={() => onStrategyStatusChange(liveStrategy.id, "paused")}>{strategyCopy.pause}</button>
            ) : liveStrategy.status === "paused" ? (
              <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={() => onStrategyStatusChange(liveStrategy.id, "running")}>{strategyCopy.resume}</button>
            ) : null}
            {liveStrategy.status !== "stopped" ? (
              <button className={getDangerButtonClassName(isDarkTheme)} type="button" onClick={() => onStrategyStatusChange(liveStrategy.id, "stopped")}>{strategyCopy.stop}</button>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

function formatDetailNumber(value: unknown): string {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(number);
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
  isDarkTheme,
  label,
  placeholder,
  type = "text",
  value,
  onChange,
}: {
  autoComplete?: string;
  fieldName: string;
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
        name={id}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function MiniMetric({ isDarkTheme, label, value }: { isDarkTheme: boolean; label: string; value: string }) {
  return (
    <div className={isDarkTheme ? "rounded-xl border border-white/[0.06] bg-white/[0.035] px-2 py-2" : "rounded-xl border border-[#E5EAF0] bg-white px-2 py-2"}>
      <div className={isDarkTheme ? "text-[10px] font-semibold text-slate-500" : "text-[10px] font-semibold text-slate-400"}>{label}</div>
      <div className={isDarkTheme ? "mt-1 truncate text-xs font-black text-slate-100" : "mt-1 truncate text-xs font-black text-slate-900"}>{value}</div>
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
    ? "inline-flex min-h-9 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 text-xs font-black text-rose-200 transition hover:bg-rose-400/15"
    : "inline-flex min-h-9 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 px-3 text-xs font-black text-rose-700 transition hover:bg-rose-100";
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
