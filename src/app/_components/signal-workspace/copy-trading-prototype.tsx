"use client";

import Image from "next/image";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect, useSignTypedData } from "wagmi";
import { useEffect, useMemo, useRef, useState } from "react";
import { getTradingFoxErrorMessage } from "@/app/_lib/tradingfox-errors";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import { isWalletConnectConfigured } from "@/app/_lib/wallet-connect";
import type { TelegramSessionUser } from "@/app/_lib/auth/telegram-auth";
import type {
  TradingFoxAccountResponse,
  TradingFoxHyperliquidAgentBindingStartResponse,
  TradingFoxHyperliquidSigningAction,
} from "@/app/_lib/tradingfox-control-plane";
import { SourceAvatar } from "./card-ui";
import { StrategyDetailView } from "./copy-trading-prototype/strategy-detail-view";
import { StrategySettingsDialog } from "./copy-trading-prototype/strategy-settings-dialog";
import { TelegramUserAvatar, getTelegramUserDisplayName } from "./copy-trading-prototype/telegram-user-avatar";
import {
  EXCHANGES,
  HYPERLIQUID_DEPOSIT_URL,
  MOCK_MARGIN_BALANCE_MAX,
  MOCK_MARGIN_BALANCE_PRESETS,
  NOTIFICATION_CHANNELS,
  type PrototypeExchange,
  type PrototypeExchangeId,
} from "./copy-trading-prototype/constants";
import type {
  AccountCenterPrototypeProps,
  AccountManagementTab,
  CopyTradingPrototypeModalProps,
  CopyTradingPrototypeTarget,
  PrototypeApiConnection,
  PrototypeConnectionSaveInput,
  PrototypeStrategy,
  PrototypeStrategyCreateInput,
  PrototypeStrategySettingsUpdateInput,
  PrototypeStrategyStatus,
  PrototypeStrategyType,
} from "./copy-trading-prototype/types";
import {
  formatAccountBalance,
  formatDetailCurrency,
  formatSignedDetailCurrency,
  getPnlClassName,
  numberOrZero,
} from "./copy-trading-prototype/formatters";
import {
  CheckGlyph,
  CopyGlyph,
  ExternalLinkGlyph,
} from "./copy-trading-prototype/icons";
import { MiniMetric } from "./copy-trading-prototype/mini-metric";
import { getPrototypeStrategyType, getStrategyStatusLabel } from "./copy-trading-prototype/strategy-helpers";
import {
  getAccountCenterTabButtonClassName,
  getDangerButtonClassName,
  getExchangeButtonClassName,
  getExchangeResourceLinkClassName,
  getIconButtonClassName,
  getInlineErrorClassName,
  getLabelClassName,
  getModalSectionClassName,
  getNotificationIconClassName,
  getNotificationUnavailableBadgeClassName,
  getPrimaryButtonClassName,
  getSoftButtonClassName,
  getStrategyStatusClassName,
  getStrategyTypeOptionClassName,
  getWhitelistCopyButtonClassName,
} from "./copy-trading-prototype/styles";
export type {
  AccountCenterPrototypeProps,
  CopyTradingPrototypeModalProps,
  CopyTradingPrototypeTarget,
  PrototypeApiConnection,
  PrototypeConnectionSaveInput,
  PrototypeStrategy,
  PrototypeStrategyCreateInput,
  PrototypeStrategySettingsUpdateInput,
  PrototypeStrategyStatus,
  PrototypeStrategyType,
} from "./copy-trading-prototype/types";

type SignTypedDataAsync = ReturnType<typeof useSignTypedData>["signTypedDataAsync"];
type WagmiSignTypedDataVariables = Parameters<SignTypedDataAsync>[0];


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
  onHyperliquidAgentBound,
  onLogin,
  onLogout,
  onStrategyCreate,
  onStrategyDelete,
  onStrategySettingsUpdate,
  onStrategyStatusChange,
}: AccountCenterPrototypeProps) {
  const accountCopy = copy.workspace.accountCenter;
  const isDrawerModal = !isApiSetupOpen && !isCoveredByModal;
  const hasApiConnections = apiConnections.length > 0;
  const runningStrategyCount = strategies.filter((strategy) => strategy.status === "running").length;
  const [isStrategyCreateOpen, setIsStrategyCreateOpen] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const selectedStrategy = strategies.find((strategy) => strategy.id === selectedStrategyId) ?? null;
  const followedSignalSourceById = useMemo(
    () => createSignalSourceTargetById(availableSignalSources),
    [availableSignalSources],
  );
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
                  onStrategySettingsUpdate={onStrategySettingsUpdate}
                  onStrategyStatusChange={onStrategyStatusChange}
                />
              ) : (
                <>
                  <section className={isDarkTheme ? "rounded-[24px] border border-white/[0.075] bg-white/[0.035] p-4" : "rounded-[24px] border border-[#E5EAF0] bg-white p-4 shadow-sm"}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-black">{accountCopy.api.title}</h3>
                        <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-600"}>
                          {accountCopy.api.connectedCount(apiConnections.length)}
                        </p>
                      </div>
                      <button className={getPrimaryButtonClassName(isDarkTheme)} type="button" onClick={onApiSetupOpen}>
                        {accountCopy.api.addAction}
                      </button>
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
                      </div>
                    ) : (
                      <div className={isDarkTheme ? "mt-4 rounded-2xl border border-white/[0.075] bg-[#181A20] px-3 py-4 text-sm leading-5 text-slate-400" : "mt-4 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-4 text-sm leading-5 text-slate-600"}>
                        {accountCopy.api.emptyDescription}
                      </div>
                    )}
                  </section>

                  <section className={isDarkTheme ? "rounded-[24px] border border-white/[0.075] bg-white/[0.035] p-4" : "rounded-[24px] border border-[#E5EAF0] bg-white p-4 shadow-sm"}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black">{accountCopy.strategy.title}</h3>
                        <div className={isDarkTheme ? "mt-1 text-xs font-bold text-slate-500" : "mt-1 text-xs font-bold text-slate-400"}>{accountCopy.strategyCreate.runningCount(runningStrategyCount, strategies.length)}</div>
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
                          followedSignalSource={followedSignalSourceById.get(strategy.traderId) ?? null}
                          isDarkTheme={isDarkTheme}
                          strategy={strategy}
                          onOpenDetail={openStrategyDetail}
                          onStrategyDelete={onStrategyDelete}
                          onStrategySettingsUpdate={onStrategySettingsUpdate}
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
          onHyperliquidAgentBound={onHyperliquidAgentBound}
          onSave={onConnectionSave}
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
  activeStrategyId,
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
  onHyperliquidAgentBound,
  onLogin,
  onLogout,
  onStrategyCreate,
  onStrategyDelete,
  onStrategyRouteChange,
  onStrategySettingsUpdate,
  onStrategyStatusChange,
}: {
  activeStrategyId: string;
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
  onConnectionSave: (input: PrototypeConnectionSaveInput) => Promise<boolean> | boolean;
  onHyperliquidAgentBound: (account: TradingFoxAccountResponse, accountName: string) => void;
  onLogin: () => void;
  onLogout: () => void;
  onStrategyCreate: (input: PrototypeStrategyCreateInput) => Promise<void> | void;
  onStrategyDelete: (strategyId: string) => Promise<void> | void;
  onStrategyRouteChange: (strategyId: string | null, mode?: "push" | "replace") => void;
  onStrategySettingsUpdate: (input: PrototypeStrategySettingsUpdateInput) => Promise<void> | void;
  onStrategyStatusChange: (strategyId: string, status: PrototypeStrategyStatus) => Promise<void> | void;
}) {
  const accountCopy = copy.workspace.accountCenter;
  const hasApiConnections = apiConnections.length > 0;
  const runningStrategyCount = strategies.filter((strategy) => strategy.status === "running").length;
  const [isStrategyCreateOpen, setIsStrategyCreateOpen] = useState(false);
  const [localSelectedStrategyId, setLocalSelectedStrategyId] = useState<string | null>(null);
  const [activeAccountTab, setActiveAccountTab] = useState<AccountManagementTab>("api");
  const selectedStrategyId = activeStrategyId || localSelectedStrategyId;
  const selectedStrategy = strategies.find((strategy) => strategy.id === selectedStrategyId) ?? null;
  const effectiveActiveAccountTab = activeStrategyId || localSelectedStrategyId ? "strategies" : activeAccountTab;
  const followedSignalSourceById = useMemo(
    () => createSignalSourceTargetById(availableSignalSources),
    [availableSignalSources],
  );
  const accountTabs: readonly {
    key: AccountManagementTab;
    label: string;
    meta: string;
  }[] = [
    {
      key: "api",
      label: accountCopy.tabs.api,
      meta: accountCopy.api.connectedCount(apiConnections.length),
    },
    {
      key: "strategies",
      label: accountCopy.tabs.strategies,
      meta: accountCopy.strategyCreate.runningCount(runningStrategyCount, strategies.length),
    },
    {
      key: "notifications",
      label: accountCopy.tabs.notifications,
      meta: accountCopy.notifications.unavailable,
    },
  ];
  const openStrategyDetail = (strategy: PrototypeStrategy) => {
    if (getPrototypeStrategyType(strategy) === "mario") {
      window.location.assign("/mario-dashboard");
      return;
    }
    setLocalSelectedStrategyId(strategy.id);
    onStrategyRouteChange(strategy.id, "push");
  };
  const closeStrategyDetail = () => {
    setLocalSelectedStrategyId(null);
    onStrategyRouteChange(null, "replace");
  };
  const selectAccountTab = (tab: AccountManagementTab) => {
    setActiveAccountTab(tab);
    if (tab !== "strategies") {
      closeStrategyDetail();
    }
  };

  return (
    <section className="min-h-0 flex-1 px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4 lg:px-6 lg:py-5">
      <div className="mx-auto grid w-full max-w-6xl gap-4 sm:gap-5">
        <header className={isDarkTheme ? "rounded-[28px] border border-white/[0.075] bg-white/[0.035] p-5 text-slate-100" : "rounded-[28px] border border-[#E5EAF0] bg-white p-5 text-slate-950 shadow-sm"}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight">{accountCopy.drawer.title}</h1>
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
            onBack={closeStrategyDetail}
            onStrategyDelete={onStrategyDelete}
            onStrategySettingsUpdate={onStrategySettingsUpdate}
            onStrategyStatusChange={onStrategyStatusChange}
          />
        ) : (
          <>
            <nav
              aria-label={accountCopy.drawer.title}
              className={isDarkTheme ? "grid grid-cols-3 gap-2 rounded-[24px] border border-white/[0.075] bg-white/[0.035] p-2" : "grid grid-cols-3 gap-2 rounded-[24px] border border-[#E5EAF0] bg-[#F8FAFC] p-2"}
            >
              {accountTabs.map((tab) => {
                const isActive = tab.key === effectiveActiveAccountTab;
                return (
                  <button
                    key={tab.key}
                    aria-pressed={isActive}
                    className={getAccountCenterTabButtonClassName(isDarkTheme, isActive)}
                    type="button"
                    onClick={() => selectAccountTab(tab.key)}
                  >
                    <span className="truncate text-sm font-black">{tab.label}</span>
                    <span className={isActive ? "mt-0.5 truncate text-[11px] font-bold opacity-80" : "mt-0.5 truncate text-[11px] font-bold opacity-70"}>{tab.meta}</span>
                  </button>
                );
              })}
            </nav>

            {effectiveActiveAccountTab === "api" ? (
              <section className={isDarkTheme ? "rounded-[28px] border border-white/[0.075] bg-white/[0.035] p-4" : "rounded-[28px] border border-[#E5EAF0] bg-white p-4 shadow-sm"}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-black">{accountCopy.tabs.api}</h2>
                    <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-600"}>
                      {accountCopy.api.connectedCount(apiConnections.length)}
                    </p>
                  </div>
                  <button className={getPrimaryButtonClassName(isDarkTheme)} type="button" onClick={onApiSetupOpen}>
                    {accountCopy.api.addAction}
                  </button>
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
                </div>
              </section>
            ) : effectiveActiveAccountTab === "notifications" ? (
              <NotificationSettingsPlaceholder
                copy={copy}
                isDarkTheme={isDarkTheme}
              />
            ) : (
              <section className={isDarkTheme ? "rounded-[28px] border border-white/[0.075] bg-white/[0.035] p-4" : "rounded-[28px] border border-[#E5EAF0] bg-white p-4 shadow-sm"}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black">{accountCopy.tabs.strategies}</h2>
                    <div className={isDarkTheme ? "mt-1 text-xs font-bold text-slate-500" : "mt-1 text-xs font-bold text-slate-400"}>{accountCopy.strategyCreate.runningCount(runningStrategyCount, strategies.length)}</div>
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
                      followedSignalSource={followedSignalSourceById.get(strategy.traderId) ?? null}
                      isDarkTheme={isDarkTheme}
                      strategy={strategy}
                      onOpenDetail={openStrategyDetail}
                      onStrategyDelete={onStrategyDelete}
                      onStrategySettingsUpdate={onStrategySettingsUpdate}
                      onStrategyStatusChange={onStrategyStatusChange}
                    />
                  )) : (
                    <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-[#181A20] px-3 py-4 text-sm leading-5 text-slate-400" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-4 text-sm leading-5 text-slate-600"}>
                      {accountCopy.strategy.empty}
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
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
          onHyperliquidAgentBound={onHyperliquidAgentBound}
          onSave={onConnectionSave}
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

function createSignalSourceTargetById(
  sources: readonly CopyTradingPrototypeTarget[],
): Map<string, CopyTradingPrototypeTarget> {
  return new Map(sources.map((source) => [source.trader.trader_id, source]));
}

function formatDefaultCopyStrategyName(
  target: CopyTradingPrototypeTarget | null,
  typeLabel: string,
): string {
  const sourceName = target?.trader.name.trim() ?? "";
  if (!sourceName) {
    return "";
  }

  return `${sourceName} ${typeLabel}`.trim();
}

function NotificationSettingsPlaceholder({
  copy,
  isDarkTheme,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
}) {
  const accountCopy = copy.workspace.accountCenter;
  const notificationCopy = accountCopy.notifications;

  return (
    <section className={isDarkTheme ? "rounded-[28px] border border-white/[0.075] bg-white/[0.035] p-4" : "rounded-[28px] border border-[#E5EAF0] bg-white p-4 shadow-sm"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-black">{notificationCopy.title}</h2>
          <p className={isDarkTheme ? "mt-1 max-w-3xl text-xs leading-5 text-slate-400" : "mt-1 max-w-3xl text-xs leading-5 text-slate-600"}>
            {notificationCopy.description}
          </p>
        </div>
        <span className={getNotificationUnavailableBadgeClassName(isDarkTheme)}>
          {notificationCopy.unavailable}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {NOTIFICATION_CHANNELS.map((channel) => (
          <NotificationChannelCard
            key={channel.key}
            channel={channel}
            copy={copy}
            isDarkTheme={isDarkTheme}
          />
        ))}
      </div>
    </section>
  );
}

function NotificationChannelCard({
  channel,
  copy,
  isDarkTheme,
}: {
  channel: typeof NOTIFICATION_CHANNELS[number];
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
}) {
  const notificationCopy = copy.workspace.accountCenter.notifications;
  const channelCopy = notificationCopy.channels[channel.key];
  const cardClassName = isDarkTheme
    ? "overflow-hidden rounded-[24px] border border-white/[0.075] bg-[#111820]"
    : "overflow-hidden rounded-[24px] border border-[#E5EAF0] bg-white shadow-sm";
  const mutedPanelClassName = isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3"
    : "rounded-2xl border border-[#E5EAF0] bg-[#FAFBFD] p-3";
  const inputClassName = isDarkTheme
    ? "mt-2 h-11 w-full cursor-not-allowed rounded-xl border border-white/[0.075] bg-white/[0.025] px-3 text-sm font-semibold text-slate-500 outline-none placeholder:text-slate-700"
    : "mt-2 h-11 w-full cursor-not-allowed rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 text-sm font-semibold text-slate-500 outline-none placeholder:text-slate-400";

  return (
    <article className={cardClassName}>
      <div className={isDarkTheme ? "border-b border-white/[0.075] p-4" : "border-b border-[#EEF2F6] p-4"}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className={getNotificationIconClassName(isDarkTheme)} aria-hidden="true">
              {channel.icon}
            </span>
            <div className="min-w-0">
              <h3 className={isDarkTheme ? "truncate text-sm font-black text-slate-100" : "truncate text-sm font-black text-slate-950"}>
                {channelCopy.title}
              </h3>
              <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-500" : "mt-1 text-xs leading-5 text-slate-600"}>
                {channelCopy.description}
              </p>
            </div>
          </div>
          <span className={getNotificationUnavailableBadgeClassName(isDarkTheme)}>
            {notificationCopy.unavailable}
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-4">
        <div className={mutedPanelClassName}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className={isDarkTheme ? "text-sm font-black text-slate-200" : "text-sm font-black text-slate-800"}>
                {notificationCopy.enableChannel}
              </div>
              <div className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-500" : "mt-1 text-xs leading-5 text-slate-500"}>
                {notificationCopy.enableDescription}
              </div>
            </div>
            <button
              aria-label={notificationCopy.enableChannel}
              className={isDarkTheme ? "relative h-6 w-11 cursor-not-allowed rounded-full bg-white/[0.06] opacity-60" : "relative h-6 w-11 cursor-not-allowed rounded-full bg-slate-200 opacity-70"}
              disabled
              type="button"
            >
              <span className={isDarkTheme ? "absolute left-1 top-1 h-4 w-4 rounded-full bg-slate-600" : "absolute left-1 top-1 h-4 w-4 rounded-full bg-white"} />
            </button>
          </div>
        </div>

        <label className="block">
          <span className={getLabelClassName(isDarkTheme)}>{notificationCopy.displayName}</span>
          <input
            className={inputClassName}
            disabled
            readOnly
            value={channelCopy.defaultName}
          />
        </label>

        {channel.requiresWebhookUrl ? (
          <label className="block">
            <span className={getLabelClassName(isDarkTheme)}>{notificationCopy.webhookUrl}</span>
            <input
              className={inputClassName}
              disabled
              placeholder={notificationCopy.webhookPlaceholder}
              readOnly
              value=""
            />
            <div className={isDarkTheme ? "mt-2 text-xs font-bold text-amber-300" : "mt-2 text-xs font-bold text-amber-600"}>
              {notificationCopy.unavailableHint}
            </div>
          </label>
        ) : (
          <div className={mutedPanelClassName}>
            <div className={isDarkTheme ? "text-xs leading-5 text-slate-400" : "text-xs leading-5 text-slate-600"}>
              {notificationCopy.telegramHint}
            </div>
          </div>
        )}
      </div>

      <div className={isDarkTheme ? "flex items-center justify-between gap-3 border-t border-white/[0.075] px-4 py-3" : "flex items-center justify-between gap-3 border-t border-[#EEF2F6] px-4 py-3"}>
        <span className={isDarkTheme ? "text-xs text-slate-500" : "text-xs text-slate-500"}>
          {notificationCopy.placeholderStatus}
        </span>
        <button className={getPrimaryButtonClassName(isDarkTheme)} disabled type="button">
          {notificationCopy.save}
        </button>
      </div>
    </article>
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
  const accountCopy = copy.workspace.accountCenter;
  const defaultStrategyName = formatDefaultCopyStrategyName(target, accountCopy.strategyCreate.copyTradingTitle);
  const [strategyName, setStrategyName] = useState(defaultStrategyName);
  const [hasEditedStrategyName, setHasEditedStrategyName] = useState(false);
  const [takeProfitPercent, setTakeProfitPercent] = useState("20");
  const [selectedConnectorId, setSelectedConnectorId] = useState(String(apiConnection.id));
  const [stopLossPercent, setStopLossPercent] = useState("10");

  const effectiveStrategyName = hasEditedStrategyName ? strategyName : defaultStrategyName;
  const normalizedStrategyName = effectiveStrategyName.trim();
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
    && normalizedStrategyName.length > 0
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
            <PrototypeInput
              fieldName="quick-strategy-name"
              isDarkTheme={isDarkTheme}
              label={accountCopy.strategyCreate.strategyName}
              placeholder={accountCopy.strategyCreate.strategyNamePlaceholder}
              value={effectiveStrategyName}
              onChange={(value) => {
                setHasEditedStrategyName(true);
                setStrategyName(value);
              }}
            />
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
                  strategyName: normalizedStrategyName,
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
  const [strategyName, setStrategyName] = useState("");
  const [hasEditedStrategyName, setHasEditedStrategyName] = useState(false);
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
  const defaultStrategyName = strategyType === "mario"
    ? strategyCreateCopy.marioStrategyName
    : formatDefaultCopyStrategyName(selectedSignalSource, strategyCreateCopy.copyTradingTitle);
  const effectiveStrategyName = hasEditedStrategyName ? strategyName : defaultStrategyName;
  const normalizedStrategyName = effectiveStrategyName.trim();
  const parsedTakeProfit = Number(takeProfitPercent);
  const parsedStopLoss = Number(stopLossPercent);
  const canCreate = selectedApiConnection !== null
    && !isSubmitting
    && normalizedStrategyName.length > 0
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
      if (!normalizedStrategyName) {
        throw new Error(strategyCreateCopy.strategyNameRequired);
      }

      if (strategyType === "mario") {
        await onCreate({
          exchangeConnectorId: selectedApiConnection.id,
          strategyName: normalizedStrategyName,
          strategyType: "mario",
        });
      } else if (selectedSignalSource) {
        await onCreate({
          exchangeConnectorId: selectedApiConnection.id,
          followRatioPercent: 100,
          stopLossPercent: parsedStopLoss,
          strategyName: normalizedStrategyName,
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

            <PrototypeInput
              fieldName="strategy-name"
              isDarkTheme={isDarkTheme}
              label={strategyCreateCopy.strategyName}
              placeholder={strategyCreateCopy.strategyNamePlaceholder}
              value={effectiveStrategyName}
              onChange={(value) => {
                setHasEditedStrategyName(true);
                setStrategyName(value);
              }}
            />

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
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const strategyCreateCopy = copy.workspace.accountCenter.strategyCreate;
  const selectedSource = sources.find((source) => source.trader.trader_id === value) ?? sources[0];
  const filteredSources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return sources;
    }

    return sources.filter((source) => {
      return source.trader.name.toLowerCase().includes(normalizedQuery)
        || source.trader.trader_id.toLowerCase().includes(normalizedQuery)
        || source.trader.platform.toLowerCase().includes(normalizedQuery);
    });
  }, [query, sources]);
  const triggerClassName = isDarkTheme
    ? "mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-left text-sm font-bold text-slate-100 outline-none transition hover:bg-white/[0.055] focus:border-sky-400/45 focus:ring-2 focus:ring-sky-400/10"
    : "mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[#D5E4EF] bg-white px-3 py-2 text-left text-sm font-bold text-slate-950 shadow-sm outline-none transition hover:bg-[#F8FAFC] focus:border-[#7DBEFF] focus:ring-2 focus:ring-[#16AFF5]/10";
  const dropdownClassName = isDarkTheme
    ? "absolute left-0 right-0 top-full z-[130] mt-2 overflow-hidden rounded-2xl border border-white/[0.075] bg-[#111820] p-1 text-slate-100 shadow-[0_18px_44px_rgba(0,0,0,0.38)]"
    : "absolute left-0 right-0 top-full z-[130] mt-2 overflow-hidden rounded-2xl border border-[#D5E4EF] bg-white p-1 text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.14)]";
  const searchClassName = isDarkTheme
    ? "h-10 w-full rounded-xl border border-white/[0.075] bg-[#0F131A] px-3 text-xs font-medium text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400/40"
    : "h-10 w-full rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#B7E8FC]";

  const chooseSource = (sourceId: string) => {
    onChange(sourceId);
    setIsOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    searchInputRef.current?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && containerRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        aria-expanded={isOpen}
        className={triggerClassName}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <SignalSourceOptionContent copy={copy} isDarkTheme={isDarkTheme} target={selectedSource} />
        <span aria-hidden="true" className={isDarkTheme ? "text-xs text-slate-500" : "text-xs text-slate-400"}>⌄</span>
      </button>
      {isOpen ? (
        <div className={dropdownClassName}>
          <div className="p-2">
            <input
              ref={searchInputRef}
              aria-label={strategyCreateCopy.signalSourceSearchPlaceholder}
              className={searchClassName}
              placeholder={strategyCreateCopy.signalSourceSearchPlaceholder}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-y-auto px-2 pb-2">
            {filteredSources.length > 0 ? filteredSources.map((target) => {
              const isSelected = target.trader.trader_id === selectedSource.trader.trader_id;
              return (
                <button
                  key={target.trader.trader_id}
                  className={isDarkTheme
                    ? `flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left outline-none transition hover:bg-white/[0.055] focus:bg-white/[0.055] ${isSelected ? "bg-sky-400/10 text-sky-100" : ""}`
                    : `flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left outline-none transition hover:bg-[#F8FAFC] focus:bg-[#F8FAFC] ${isSelected ? "bg-[#EAF8FE] text-[#007DB8]" : ""}`}
                  type="button"
                  onClick={() => chooseSource(target.trader.trader_id)}
                >
                  <SignalSourceOptionContent copy={copy} isDarkTheme={isDarkTheme} target={target} />
                  {isSelected ? <span className="text-xs font-black">✓</span> : null}
                </button>
              );
            }) : (
              <div className={isDarkTheme ? "rounded-xl px-3 py-4 text-center text-xs font-bold text-slate-500" : "rounded-xl px-3 py-4 text-center text-xs font-bold text-slate-500"}>
                {strategyCreateCopy.signalSourceNoMatches}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
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
    <div className={isDarkTheme ? "rounded-3xl border border-white/[0.075] bg-white/[0.035] p-3" : "rounded-3xl border border-[#E5EAF0] bg-white p-3 shadow-sm"}>
      <div className="flex items-start gap-3">
        <AccountConnectionExchangeIcon
          exchange={exchange}
          fallback={getConnectionFallback(apiConnection)}
          isDarkTheme={isDarkTheme}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black">{apiConnection.accountName}</div>
              <div className={isDarkTheme ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-slate-500"}>
                #{apiConnection.id} · {accountCopy.api.updatedAt}: {apiConnection.connectedAtLabel || "--"}
              </div>
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                {apiConnection.isMock ? (
                  <span className={isDarkTheme ? "rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black text-emerald-200" : "rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700"}>
                    {accountCopy.api.mockBadge}
                  </span>
                ) : null}
                {apiConnection.recommended ? (
                  <span className={isDarkTheme ? "rounded-full bg-sky-300/15 px-2 py-0.5 text-[10px] font-black text-sky-100" : "rounded-full bg-[#DDF5FF] px-2 py-0.5 text-[10px] font-black text-[#007DB8]"}>
                    {accountCopy.apiSetup.recommendedBadge}
                  </span>
                ) : null}
                {apiConnection.bindingLabel && !apiConnection.isMock ? (
                  <span className={isDarkTheme ? "rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-black text-slate-300" : "rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-black text-slate-600"}>
                    {apiConnection.bindingLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <button
              className={getDangerButtonClassName(isDarkTheme)}
              disabled={isDisabled}
              type="button"
              onClick={() => void onDelete(apiConnection.id)}
            >
              {accountCopy.api.deleteAction}
            </button>
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
      {connection.recommended ? (
        <span className={isDarkTheme ? "shrink-0 rounded-full bg-sky-300/15 px-2 py-0.5 text-[10px] font-black text-sky-100" : "shrink-0 rounded-full bg-[#DDF5FF] px-2 py-0.5 text-[10px] font-black text-[#007DB8]"}>
          {accountCopy.apiSetup.recommendedBadge}
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

function ExchangeApiSetupLayer({
  copy,
  initialAccountName,
  initialMockMarginBalance,
  isDarkTheme,
  onClose,
  onHyperliquidAgentBound,
  onSave,
}: {
  copy: WorkspaceCopy;
  initialAccountName: string;
  initialMockMarginBalance: number | null;
  isDarkTheme: boolean;
  onClose: () => void;
  onHyperliquidAgentBound: (account: TradingFoxAccountResponse, accountName: string) => void;
  onSave: (input: PrototypeConnectionSaveInput) => Promise<boolean> | boolean;
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
  const [isWhitelistIpOptional, setIsWhitelistIpOptional] = useState(false);
  const [isWhitelistIpLoading, setIsWhitelistIpLoading] = useState(false);
  const [agentWalletAddress, setAgentWalletAddress] = useState("");
  const [agentBindingError, setAgentBindingError] = useState("");
  const [agentBindingStep, setAgentBindingStep] = useState("");
  const [isAgentBinding, setIsAgentBinding] = useState(false);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const { address: connectedWalletAddress } = useAccount();
  const { disconnect } = useDisconnect();
  const { signTypedDataAsync } = useSignTypedData();
  const accountCopy = copy.workspace.accountCenter;
  const isDemoExchange = selectedExchange.mode === "demo";
  const isBuiltInMockExchange = selectedExchange.id === "mockExchange";
  const isBinanceDemoExchange = selectedExchange.id === "binanceDemo";
  const isHyperliquidExchange = selectedExchange.id === "hyperliquid";
  const isLiveExchange = !isDemoExchange && !isHyperliquidExchange;
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
  const hasWhitelistRequirement = !isLiveExchange || hasWhitelistIp || isWhitelistIpOptional;
  const agentWalletDisplayAddress = agentWalletAddress;
  const walletAddressLabel = isHyperliquidExchange ? accountCopy.apiSetup.mainWalletAddress : accountCopy.apiSetup.walletAddress;
  const walletAddressPlaceholder = isHyperliquidExchange ? accountCopy.apiSetup.mainWalletAddressPlaceholder : accountCopy.apiSetup.walletAddressPlaceholder;

  const canSave = isBuiltInMockExchange
    ? accountName.trim().length > 0 && hasValidMockMarginBalance
    : isBinanceDemoExchange
      ? accountName.trim().length > 0 && hasApiCredentials
      : accountName.trim().length > 0 && hasApiCredentials && hasApiPassword && hasWalletAddress && hasPrivateKey && hasWhitelistRequirement && !isWhitelistIpLoading && !isSavingManual && !isAgentBinding;

  useEffect(() => {
    let isMounted = true;

    async function loadWhitelistIp() {
      if (!isLiveExchange) {
        if (!isMounted) {
          return;
        }
        setWhitelistIp("");
        setWhitelistIpError("");
        setIsWhitelistIpOptional(false);
        setIsWhitelistIpLoading(false);
        return;
      }

      setWhitelistIp("");
      setWhitelistIpError("");
      setIsWhitelistIpOptional(false);
      setHasCopiedIp(false);
      setIsWhitelistIpLoading(true);
      try {
        const whitelistAssignment = await requestTradingFoxConnectorWhitelistIP(selectedExchange.connectorExchangePlatform);
        if (!isMounted) {
          return;
        }
        const nextWhitelistIp = whitelistAssignment.whitelistIp;
        const isUnassigned = whitelistAssignment.assignmentStatus === "unassigned";
        setWhitelistIp(nextWhitelistIp);
        setIsWhitelistIpOptional(isUnassigned);
        setWhitelistIpError(nextWhitelistIp ? "" : isUnassigned ? accountCopy.apiSetup.whitelistIpUnassignedFallback : accountCopy.apiSetup.whitelistIpUnavailable);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setWhitelistIp("");
        setIsWhitelistIpOptional(false);
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
  }, [accountCopy.apiSetup.whitelistIpUnavailable, accountCopy.apiSetup.whitelistIpUnassignedFallback, isLiveExchange, selectedExchange.connectorExchangePlatform]);

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
    setAgentWalletAddress("");
    setAgentBindingError("");
    setAgentBindingStep("");
    setAccountName((currentAccountName) => {
      const trimmedAccountName = currentAccountName.trim();
      if (trimmedAccountName.length > 0 && trimmedAccountName !== previousDefaultAccountName) {
        return currentAccountName;
      }

      return exchange.defaultAccountName;
    });
  };
  const resetHyperliquidAgentBinding = () => {
    if (isAgentBinding) {
      return;
    }

    setAgentWalletAddress("");
    setWalletAddress("");
    setAgentBindingError("");
    setAgentBindingStep("");
    disconnect();
  };
  const handleHyperliquidAgentBind = async () => {
    if (!isHyperliquidExchange || isAgentBinding) {
      return;
    }

    setAgentBindingError("");
    setAgentBindingStep(accountCopy.apiSetup.hyperliquidAgentStepConnect);
    const selectedWalletAddress = connectedWalletAddress?.trim() ?? "";
    if (!selectedWalletAddress) {
      setAgentBindingError(accountCopy.apiSetup.hyperliquidAgentWalletMissing);
      return;
    }

    setIsAgentBinding(true);
    try {
      setAgentWalletAddress(selectedWalletAddress);
      setWalletAddress(selectedWalletAddress);
      setAgentBindingStep(accountCopy.apiSetup.hyperliquidAgentStepCreate);
      const bindingStart = await requestHyperliquidAgentBindingStart({
        accountName: accountName.trim() || selectedExchange.defaultAccountName,
        walletAddress: selectedWalletAddress,
      });
      const approveAgentAction = findHyperliquidSigningAction(bindingStart.actions, "approveAgent");
      const approveBuilderFeeAction = findHyperliquidSigningAction(bindingStart.actions, "approveBuilderFee");
      if (!approveAgentAction || !approveBuilderFeeAction) {
        throw new Error(accountCopy.apiSetup.hyperliquidAgentActionMissing);
      }

      setAgentBindingStep(accountCopy.apiSetup.hyperliquidAgentStepApproveAgent);
      const approveAgentSignature = await signHyperliquidTypedData(signTypedDataAsync, selectedWalletAddress, approveAgentAction);
      setAgentBindingStep(accountCopy.apiSetup.hyperliquidAgentStepApproveBuilderFee);
      const approveBuilderFeeSignature = await signHyperliquidTypedData(signTypedDataAsync, selectedWalletAddress, approveBuilderFeeAction);
      setAgentBindingStep(accountCopy.apiSetup.hyperliquidAgentStepComplete);
      const account = await requestHyperliquidAgentBindingComplete(bindingStart.binding.id, {
        approveAgentSignature,
        approveBuilderFeeSignature,
      });
      onHyperliquidAgentBound(account, bindingStart.binding.connectorName || accountName.trim() || selectedExchange.defaultAccountName);
      onClose();
    } catch (error) {
      // A failed or rejected signature leaves the generated binding payload incomplete,
      // so the next attempt must start from a fresh wallet confirmation.
      setAgentWalletAddress("");
      setWalletAddress("");
      setAgentBindingStep("");
      setAgentBindingError(getTradingFoxErrorMessage(error, copy));
    } finally {
      setIsAgentBinding(false);
    }
  };
  const handleManualSave = async () => {
    if (!canSave || isSavingManual) {
      return;
    }

    setIsSavingManual(true);
    try {
      const isSaved = await onSave({
        accountName: accountName.trim() || selectedExchange.defaultAccountName,
        apiKey: requiresApiCredentials ? apiKey.trim() : undefined,
        exchangePlatform: selectedExchange.connectorExchangePlatform,
        ipAddress: isLiveExchange && hasWhitelistIp ? whitelistIp.trim() : undefined,
        isMock: isDemoExchange,
        mockMarginBalance: isBuiltInMockExchange && hasValidMockMarginBalance ? parsedMockMarginBalance : undefined,
        password: requiresApiPassword ? apiPassword.trim() : undefined,
        privateKey: requiresPrivateKey ? privateKey.trim() : undefined,
        secret: requiresApiCredentials ? secret.trim() : undefined,
        walletAddress: requiresWalletAddress ? walletAddress.trim() : undefined,
      });
      if (isSaved) {
        onClose();
      }
    } finally {
      setIsSavingManual(false);
    }
  };
  const exchangeSetupGridClassName = "grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]";
  const exchangeSelectorClassName = [
    isDarkTheme
      ? "flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/[0.075] bg-white/[0.035] p-3"
      : "flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-[#E5EAF0] bg-[#FAFBFD] p-3",
    "self-start",
  ].join(" ");
  const exchangeSelectorListClassName = "kol-scroll-area flex gap-2 overflow-x-auto pb-1 lg:grid lg:content-start lg:overflow-visible lg:pb-0";
  const exchangeContentClassName = isHyperliquidExchange
    ? "grid min-w-0 content-start gap-3 self-start"
    : "grid min-w-0 gap-4";

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
        className="fixed inset-x-0 bottom-0 z-[115] h-[96dvh] overflow-hidden rounded-t-[30px] shadow-[0_-26px_88px_rgba(15,23,42,0.26)] sm:inset-x-3 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:h-[min(920px,calc(100dvh-1rem))] sm:max-w-[920px] sm:-translate-y-1/2 sm:rounded-[30px] sm:shadow-[0_30px_90px_rgba(15,23,42,0.26)]"
        role="dialog"
      >
        <form
          className={isDarkTheme ? "flex h-full flex-col border border-white/[0.085] bg-[#111820] text-slate-100" : "flex h-full flex-col border border-[#D5E4EF] bg-white text-slate-950"}
          onSubmit={(event) => event.preventDefault()}
        >
          <header className={isDarkTheme ? "border-b border-white/[0.075] px-4 py-4 sm:px-5 sm:py-5" : "border-b border-[#E5EAF0] px-4 py-4 sm:px-5 sm:py-5"}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className={isDarkTheme ? "text-[11px] font-black uppercase tracking-[0.16em] text-sky-300" : "text-[11px] font-black uppercase tracking-[0.16em] text-[#008DCC]"}>
                  {accountCopy.apiSetup.selectExchange}
                </div>
                <h2 className="mt-2 text-xl font-black tracking-tight">{accountCopy.apiSetup.title}</h2>
              </div>
              <button aria-label={copy.common.close} className={getIconButtonClassName(isDarkTheme)} type="button" onClick={onClose}>
                <span aria-hidden="true" className="text-lg leading-none">×</span>
              </button>
            </div>
          </header>

          <div className="kol-scroll-area min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            <div className={exchangeSetupGridClassName}>
              <aside className={exchangeSelectorClassName}>
                <div className={isDarkTheme ? "px-1 pb-2 text-xs font-black text-slate-300" : "px-1 pb-2 text-xs font-black text-slate-700"}>
                  {accountCopy.apiSetup.selectExchange}
                </div>
                <div className={exchangeSelectorListClassName}>
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

              <main className={exchangeContentClassName}>
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
                    {isHyperliquidExchange ? (
                      <HyperliquidAgentWalletPanel
                        accountCopy={accountCopy}
                        agentBindingError={agentBindingError}
                        agentBindingStep={agentBindingStep}
                        agentWalletAddress={agentWalletDisplayAddress}
                        isBinding={isAgentBinding}
                        isDarkTheme={isDarkTheme}
                        onBind={handleHyperliquidAgentBind}
                        onReset={resetHyperliquidAgentBinding}
                      />
                    ) : (
                      <WhitelistIpCopyPanel
                        accountCopy={accountCopy}
                        description={accountCopy.apiSetup.whitelistIpDescription}
                        hasCopiedIp={hasCopiedIp}
                        hasWhitelistIp={hasWhitelistIp}
                        isDarkTheme={isDarkTheme}
                        isLoading={isWhitelistIpLoading}
                        whitelistIp={whitelistIp}
                        whitelistIpError={whitelistIpError}
                        onCopy={() => {
                          setHasCopiedIp(true);
                          void navigator.clipboard?.writeText(whitelistIp);
                        }}
                      />
                    )}

                    {!isHyperliquidExchange ? (
                    <section className={getModalSectionClassName(isDarkTheme)}>
                      <h3 className="text-base font-black">
                        {accountCopy.api.title}
                      </h3>
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
                    ) : null}
                  </>
                )}

              </main>
            </div>
          </div>

          <footer className={isDarkTheme ? "grid grid-cols-2 gap-2 border-t border-white/[0.075] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:px-5" : "grid grid-cols-2 gap-2 border-t border-[#E5EAF0] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:px-5"}>
            <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={onClose}>{copy.common.close}</button>
            {!isHyperliquidExchange ? (
              <button
                className={getPrimaryButtonClassName(isDarkTheme)}
                disabled={!canSave}
                type="button"
                onClick={() => void handleManualSave()}
              >
                {isSavingManual ? accountCopy.apiSetup.saving : accountCopy.apiSetup.save}
              </button>
            ) : null}
          </footer>
        </form>
      </section>
    </>
  );
}

function HyperliquidAgentWalletPanel({
  accountCopy,
  agentBindingError,
  agentBindingStep,
  agentWalletAddress,
  isBinding,
  isDarkTheme,
  onBind,
  onReset,
}: {
  accountCopy: WorkspaceCopy["workspace"]["accountCenter"];
  agentBindingError: string;
  agentBindingStep: string;
  agentWalletAddress: string;
  isBinding: boolean;
  isDarkTheme: boolean;
  onBind: () => void;
  onReset: () => void;
}) {
  const bindingActionLabel = agentBindingStep || accountCopy.apiSetup.hyperliquidAgentBinding;
  const connectActionLabel = isBinding ? bindingActionLabel : accountCopy.apiSetup.hyperliquidAgentConnectAuthorize;
  const authorizeActionLabel = isBinding ? bindingActionLabel : accountCopy.apiSetup.hyperliquidAgentContinueAuthorize;
  const renderConnectButton = (openConnectModal: (() => void) | undefined) => (
    <button
      className={getPrimaryButtonClassName(isDarkTheme)}
      disabled={isBinding || !openConnectModal}
      type="button"
      onClick={() => openConnectModal?.()}
    >
      {connectActionLabel}
    </button>
  );

  return (
    <section className={isDarkTheme ? "rounded-[24px] border border-sky-300/20 bg-sky-300/[0.07] p-3 sm:p-4" : "rounded-[24px] border border-[#BFE7FB] bg-[#F1FBFF] p-3 sm:p-4"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={isDarkTheme ? "rounded-full bg-sky-300/15 px-2.5 py-1 text-[11px] font-black text-sky-100" : "rounded-full bg-[#DDF5FF] px-2.5 py-1 text-[11px] font-black text-[#007DB8]"}>
              {accountCopy.apiSetup.recommendedBadge}
            </span>
            <span className={isDarkTheme ? "text-[11px] font-black uppercase tracking-[0.14em] text-sky-200/70" : "text-[11px] font-black uppercase tracking-[0.14em] text-[#007DB8]/70"}>
              {accountCopy.apiSetup.hyperliquidAgentMode}
            </span>
          </div>
          <h3 className="mt-3 text-base font-black">{accountCopy.apiSetup.hyperliquidAgentTitle}</h3>
          <p className={isDarkTheme ? "mt-2 max-w-2xl text-sm leading-6 text-slate-300" : "mt-2 max-w-2xl text-sm leading-6 text-slate-700"}>
            {accountCopy.apiSetup.hyperliquidAgentDescription}
          </p>
          {!isWalletConnectConfigured ? (
            <div className={isDarkTheme ? "mt-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.08] px-3 py-2 text-xs leading-5 text-amber-100" : "mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800"}>
              {accountCopy.apiSetup.hyperliquidWalletConnectMissing}
            </div>
          ) : null}
        </div>
        <ConnectButton.Custom>
          {({ account, mounted, openConnectModal }) => (
            mounted && account ? (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button
                  className={getPrimaryButtonClassName(isDarkTheme)}
                  disabled={isBinding}
                  type="button"
                  onClick={() => onBind()}
                >
                  {authorizeActionLabel}
                </button>
                <button
                  className={getSoftButtonClassName(isDarkTheme)}
                  disabled={isBinding}
                  type="button"
                  onClick={() => onReset()}
                >
                  {accountCopy.apiSetup.hyperliquidAgentReconnect}
                </button>
              </div>
            ) : renderConnectButton(openConnectModal)
          )}
        </ConnectButton.Custom>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {accountCopy.apiSetup.hyperliquidAgentSteps.map((step, index) => (
          <div
            key={step}
            className={isDarkTheme ? "rounded-2xl border border-sky-200/10 bg-[#0F141B]/70 px-3 py-2.5" : "rounded-2xl border border-[#BFE7FB] bg-white/80 px-3 py-2.5"}
          >
            <div className={isDarkTheme ? "text-[10px] font-black uppercase tracking-[0.14em] text-sky-200/60" : "text-[10px] font-black uppercase tracking-[0.14em] text-[#007DB8]/60"}>
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className={isDarkTheme ? "mt-1 text-xs font-black text-sky-50" : "mt-1 text-xs font-black text-slate-900"}>
              {step}
            </div>
          </div>
        ))}
      </div>

      <div className={isDarkTheme ? "mt-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.08] px-3 py-2.5" : "mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2.5"}>
        <div className={isDarkTheme ? "text-xs font-black text-amber-100" : "text-xs font-black text-amber-800"}>
          {accountCopy.apiSetup.hyperliquidDepositRequired}
        </div>
        <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-amber-100/80" : "mt-1 text-xs leading-5 text-amber-800/85"}>
          {accountCopy.apiSetup.hyperliquidDepositDescription}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-black">
          <span className={isDarkTheme ? "text-amber-100/80" : "text-amber-800/80"}>{accountCopy.apiSetup.hyperliquidCurrentBalance}</span>
          <span className={isDarkTheme ? "rounded-full bg-[#0F141B]/70 px-2.5 py-1 text-amber-100" : "rounded-full bg-white px-2.5 py-1 text-amber-800"}>5 USDC</span>
          <a
            className={isDarkTheme ? "text-sky-200 underline decoration-sky-200/40 underline-offset-4 hover:text-sky-100" : "text-[#007DB8] underline decoration-[#007DB8]/35 underline-offset-4 hover:text-[#005F8C]"}
            href={HYPERLIQUID_DEPOSIT_URL}
            rel="noreferrer"
            target="_blank"
          >
            {accountCopy.apiSetup.hyperliquidDepositAction}
          </a>
        </div>
      </div>

      {agentWalletAddress ? (
        <div className={isDarkTheme ? "mt-3 break-all rounded-2xl border border-sky-200/10 bg-[#0F141B]/70 px-3 py-2 font-mono text-xs font-black text-sky-100" : "mt-3 break-all rounded-2xl border border-[#BFE7FB] bg-white/80 px-3 py-2 font-mono text-xs font-black text-[#007DB8]"}>
          {agentWalletAddress}
        </div>
      ) : null}
      {agentBindingError ? (
        <div className={isDarkTheme ? "mt-3 rounded-2xl border border-rose-300/15 bg-rose-400/[0.08] px-3 py-2 text-xs leading-5 text-rose-100" : "mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700"}>
          {agentBindingError}
        </div>
      ) : null}
    </section>
  );
}

function WhitelistIpCopyPanel({
  accountCopy,
  description,
  hasCopiedIp,
  hasWhitelistIp,
  isDarkTheme,
  isLoading,
  whitelistIp,
  whitelistIpError,
  onCopy,
}: {
  accountCopy: WorkspaceCopy["workspace"]["accountCenter"];
  description: string;
  hasCopiedIp: boolean;
  hasWhitelistIp: boolean;
  isDarkTheme: boolean;
  isLoading: boolean;
  whitelistIp: string;
  whitelistIpError: string;
  onCopy: () => void;
}) {
  return (
    <section className={getModalSectionClassName(isDarkTheme)}>
      <div className={getLabelClassName(isDarkTheme)}>{accountCopy.apiSetup.whitelistIp}</div>
      <div className="mt-2 flex items-stretch gap-2">
        <div className={isDarkTheme ? "flex min-h-11 min-w-0 flex-1 items-center break-all rounded-[18px] border border-white/[0.085] bg-[#0F141B] px-3 font-mono text-sm font-black tracking-[0.045em] text-slate-100" : "flex min-h-11 min-w-0 flex-1 items-center break-all rounded-[18px] border border-[#D5E4EF] bg-[#F8FAFC] px-3 font-mono text-sm font-black tracking-[0.045em] text-slate-900"}>
          {isLoading ? accountCopy.apiSetup.whitelistIpLoading : (whitelistIp || accountCopy.apiSetup.whitelistIpUnavailable)}
        </div>
        <button
          aria-label={accountCopy.apiSetup.copyWhitelistIp}
          className={getWhitelistCopyButtonClassName(isDarkTheme)}
          disabled={!hasWhitelistIp}
          title={accountCopy.apiSetup.copyWhitelistIp}
          type="button"
          onClick={onCopy}
        >
          {hasCopiedIp ? <CheckGlyph /> : <CopyGlyph />}
        </button>
      </div>
      <p className={whitelistIpError
        ? isDarkTheme ? "mt-3 text-xs leading-5 text-amber-200" : "mt-3 text-xs leading-5 text-amber-700"
        : isDarkTheme ? "mt-3 text-xs leading-5 text-slate-500" : "mt-3 text-xs leading-5 text-slate-500"}
      >
        {whitelistIpError || description}
      </p>
    </section>
  );
}

type FollowedSignalSourceDisplay = {
  avatarUrl: string | null;
  id: string;
  name: string;
  platform: string;
};

function resolveFollowedSignalSourceDisplay(
  strategy: PrototypeStrategy,
  followedSignalSource: CopyTradingPrototypeTarget | null | undefined,
  unknownLabel: string,
): FollowedSignalSourceDisplay {
  if (followedSignalSource) {
    return {
      avatarUrl: followedSignalSource.trader.avatar || null,
      id: followedSignalSource.trader.trader_id,
      name: followedSignalSource.trader.name || followedSignalSource.trader.trader_id || unknownLabel,
      platform: followedSignalSource.trader.platform,
    };
  }

  const id = strategy.traderId.trim();
  const fallbackPlatform = strategy.platform === "Copy Trading" ? "" : strategy.platform;

  return {
    avatarUrl: strategy.signalSourceAvatarUrl || strategy.avatarUrl || null,
    id,
    name: strategy.signalSourceName?.trim() || id || unknownLabel,
    platform: strategy.signalSourcePlatform?.trim() || fallbackPlatform,
  };
}

function PrototypeStrategyCard({
  copy,
  followedSignalSource,
  isDarkTheme,
  strategy,
  onOpenDetail,
  onStrategyDelete,
  onStrategySettingsUpdate,
  onStrategyStatusChange,
}: {
  copy: WorkspaceCopy;
  followedSignalSource?: CopyTradingPrototypeTarget | null;
  isDarkTheme: boolean;
  strategy: PrototypeStrategy;
  onOpenDetail: (strategy: PrototypeStrategy) => void;
  onStrategyDelete: (strategyId: string) => Promise<void> | void;
  onStrategySettingsUpdate: (input: PrototypeStrategySettingsUpdateInput) => Promise<void> | void;
  onStrategyStatusChange: (strategyId: string, status: PrototypeStrategyStatus) => Promise<void> | void;
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const accountCopy = copy.workspace.accountCenter;
  const strategyCopy = accountCopy.strategy;
  const strategyType = getPrototypeStrategyType(strategy);
  const statusLabel = getStrategyStatusLabel(strategyCopy, strategy.status);
  const typeLabel = strategyType === "mario" ? accountCopy.strategyCreate.marioTypeChip : accountCopy.strategyCreate.copyTradingTypeChip;
  const followedSource = resolveFollowedSignalSourceDisplay(strategy, followedSignalSource, strategyCopy.followingSignalSourceUnknown);
  const followedSourceMeta = [followedSource.platform, followedSource.id].filter(Boolean).join(" · ");

  return (
    <>
      <article className={isDarkTheme ? "relative rounded-2xl border border-white/[0.075] bg-[#181A20] p-3" : "relative rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3"}>
        <button
          className="block w-full text-left"
          type="button"
          onClick={() => onOpenDetail(strategy)}
        >
        <div className="flex items-start gap-3 pr-0 sm:pr-56">
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
        {strategyType === "copyTrading" ? (
          <div className={isDarkTheme ? "mt-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3" : "mt-3 rounded-2xl border border-[#E5EAF0] bg-white p-3"}>
            <div className={isDarkTheme ? "text-[10px] font-black uppercase tracking-[0.14em] text-slate-500" : "text-[10px] font-black uppercase tracking-[0.14em] text-slate-400"}>
              {strategyCopy.followingSignalSource}
            </div>
            <div className="mt-2 flex min-w-0 items-center gap-2">
              <SourceAvatar isDarkTheme={isDarkTheme} name={followedSource.name} url={followedSource.avatarUrl} />
              <div className="min-w-0">
                <div className={isDarkTheme ? "truncate text-sm font-black text-slate-100" : "truncate text-sm font-black text-slate-950"}>{followedSource.name}</div>
                {followedSourceMeta ? (
                  <div className={isDarkTheme ? "mt-0.5 truncate text-xs font-bold text-slate-500" : "mt-0.5 truncate text-xs font-bold text-slate-500"}>
                    {followedSourceMeta}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.positionCount} value={String(strategy.positionsCount)} />
          <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.tradeHistoryCount} value={String(strategy.eventsCount)} />
          <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.accountEquity} value={formatDetailCurrency(strategy.accountEquity)} />
          <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.unrealizedPnl} value={formatSignedDetailCurrency(strategy.unrealizedPnl)} valueClassName={getPnlClassName(isDarkTheme, numberOrZero(strategy.unrealizedPnl))} />
        </div>
        <p className={isDarkTheme ? "mt-3 text-[11px] leading-5 text-slate-500" : "mt-3 text-[11px] leading-5 text-slate-500"}>
          {strategyType === "mario" ? accountCopy.strategyCreate.marioCardHint : strategyCopy.stopNote}
        </p>
        </button>
        <div className="mt-3 flex flex-wrap justify-end gap-2 sm:absolute sm:right-3 sm:top-3 sm:mt-0">
          <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={() => setIsSettingsOpen(true)}>{strategyCopy.edit}</button>
          {strategy.status === "running" ? (
            <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={() => onStrategyStatusChange(strategy.id, "paused")}>{strategyCopy.pause}</button>
          ) : (
            <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={() => onStrategyStatusChange(strategy.id, "running")}>{strategyCopy.resume}</button>
          )}
          <button className={getDangerButtonClassName(isDarkTheme)} type="button" onClick={() => onStrategyDelete(strategy.id)}>{strategyCopy.delete}</button>
        </div>
      </article>
      {isSettingsOpen ? (
        <StrategySettingsDialog
          copy={copy}
          isDarkTheme={isDarkTheme}
          strategy={strategy}
          onClose={() => setIsSettingsOpen(false)}
          onSave={onStrategySettingsUpdate}
        />
      ) : null}
    </>
  );
}

type TradingFoxWhitelistIPAssignment = {
  assignmentStatus?: "assigned" | "unassigned";
  whitelistIp: string;
};

async function requestTradingFoxConnectorWhitelistIP(exchangePlatform: string): Promise<TradingFoxWhitelistIPAssignment> {
  const query = new URLSearchParams({ exchangePlatform });
  const response = await fetch(`/api/tradingfox/connectors/whitelist-ip?${query.toString()}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await response.json() as {
    assignmentStatus?: "assigned" | "unassigned";
    error?: string;
    ipAddress?: { address?: string } | null;
    whitelistIp?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error || `Whitelist IP request failed with status ${response.status}.`);
  }
  const ipAddress = typeof payload.ipAddress?.address === "string" ? payload.ipAddress.address.trim() : "";
  return {
    assignmentStatus: payload.assignmentStatus,
    whitelistIp: ipAddress || (typeof payload.whitelistIp === "string" ? payload.whitelistIp.trim() : ""),
  };
}

async function requestHyperliquidAgentBindingStart(input: {
  accountName: string;
  walletAddress: string;
}): Promise<TradingFoxHyperliquidAgentBindingStartResponse> {
  const response = await fetch("/api/tradingfox/connectors/hyperliquid-agent", {
    body: JSON.stringify(input),
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = await response.json().catch(() => null) as TradingFoxHyperliquidAgentBindingStartResponse & { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || `HyperLiquid agent binding request failed with status ${response.status}.`);
  }
  if (!payload) {
    throw new Error("HyperLiquid agent binding response is empty.");
  }
  return payload;
}

async function requestHyperliquidAgentBindingComplete(
  bindingId: number,
  input: {
    approveAgentSignature: string;
    approveBuilderFeeSignature: string;
  },
): Promise<TradingFoxAccountResponse> {
  const response = await fetch(`/api/tradingfox/connectors/hyperliquid-agent/${encodeURIComponent(String(bindingId))}/complete`, {
    body: JSON.stringify(input),
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = await response.json().catch(() => null) as TradingFoxAccountResponse & { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || `HyperLiquid agent binding completion failed with status ${response.status}.`);
  }
  if (!payload) {
    throw new Error("HyperLiquid agent binding completion response is empty.");
  }
  return payload;
}

function findHyperliquidSigningAction(
  actions: readonly TradingFoxHyperliquidSigningAction[],
  kind: TradingFoxHyperliquidSigningAction["kind"],
): TradingFoxHyperliquidSigningAction | null {
  return actions.find((action) => action.kind === kind) ?? null;
}

async function signHyperliquidTypedData(
  signTypedDataAsync: SignTypedDataAsync,
  walletAddress: string,
  action: TradingFoxHyperliquidSigningAction,
): Promise<string> {
  const signature = await signTypedDataAsync({
    account: walletAddress as `0x${string}`,
    domain: action.typedData.domain,
    message: action.typedData.message,
    primaryType: action.typedData.primaryType,
    types: action.typedData.types,
  } as unknown as WagmiSignTypedDataVariables);
  if (typeof signature !== "string" || !signature.trim()) {
    throw new Error("Wallet did not return a typed-data signature.");
  }
  return signature;
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

function getExchangeById(exchangeId: PrototypeExchangeId): PrototypeExchange {
  return EXCHANGES.find((exchange) => exchange.id === exchangeId) ?? EXCHANGES[0];
}

function getExchangeName(accountCopy: WorkspaceCopy["workspace"]["accountCenter"], id: PrototypeExchangeId): string {
  return accountCopy.exchanges[id];
}
