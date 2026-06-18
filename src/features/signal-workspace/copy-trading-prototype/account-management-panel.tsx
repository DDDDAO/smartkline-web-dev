"use client";

import { useState } from "react";
import type { TelegramSessionUser } from "@/app/_lib/auth/telegram-auth";
import type { TradingFoxAccountResponse } from "@/app/_lib/tradingfox-control-plane";
import type { WorkspaceCopy } from "@/i18n/workspace";
import {
  TelegramUserAvatar,
  getTelegramUserDisplayName,
} from "./telegram-user-avatar";
import type {
  AccountManagementTab,
  PrototypeApiConnection,
  PrototypeConnectionSaveInput,
} from "./types";
import {
  ApiConnectionCard,
  NotificationSettingsPlaceholder,
} from "./copy-trading-prototype-helpers";
import { ExchangeApiSetupLayer } from "./exchange-api-setup-layer";
import {
  getAccountCenterTabButtonClassName,
  getPrimaryButtonClassName,
  getSoftButtonClassName,
} from "./styles";

export function AccountManagementPanel({
  apiConnection,
  apiConnections,
  copy,
  isApiSetupOpen,
  isAuthLoading,
  isDarkTheme,
  telegramUser,
  onApiSetupOpen,
  onApiSetupOpenChange,
  onConnectionDelete,
  onConnectionSave,
  onHyperliquidAgentBound,
  onLogin,
  onLogout,
}: {
  apiConnection: PrototypeApiConnection;
  apiConnections: readonly PrototypeApiConnection[];
  copy: WorkspaceCopy;
  isApiSetupOpen: boolean;
  isAuthLoading: boolean;
  isDarkTheme: boolean;
  telegramUser: TelegramSessionUser | null;
  onApiSetupOpen: () => void;
  onApiSetupOpenChange: (isOpen: boolean) => void;
  onConnectionDelete: (connectionId: number) => Promise<void> | void;
  onConnectionSave: (input: PrototypeConnectionSaveInput) => Promise<boolean> | boolean;
  onHyperliquidAgentBound: (account: TradingFoxAccountResponse, accountName: string) => void;
  onLogin: () => void;
  onLogout: () => void;
}) {
  const accountCopy = copy.workspace.accountCenter;
  const hasApiConnections = apiConnections.length > 0;
  const [activeAccountTab, setActiveAccountTab] =
    useState<AccountManagementTab>("api");
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
      key: "notifications",
      label: accountCopy.tabs.notifications,
      meta: accountCopy.notifications.unavailable,
    },
  ];

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

        <nav
          aria-label={accountCopy.drawer.title}
          className={isDarkTheme ? "grid grid-cols-2 gap-2 rounded-[24px] border border-white/[0.075] bg-white/[0.035] p-2" : "grid grid-cols-2 gap-2 rounded-[24px] border border-[#E5EAF0] bg-[#F8FAFC] p-2"}
        >
          {accountTabs.map((tab) => {
            const isActive = tab.key === activeAccountTab;
            return (
              <button
                key={tab.key}
                aria-pressed={isActive}
                className={getAccountCenterTabButtonClassName(isDarkTheme, isActive)}
                type="button"
                onClick={() => setActiveAccountTab(tab.key)}
              >
                <span className="truncate text-sm font-black">{tab.label}</span>
                <span className={isActive ? "mt-0.5 truncate text-[11px] font-bold opacity-80" : "mt-0.5 truncate text-[11px] font-bold opacity-70"}>{tab.meta}</span>
              </button>
            );
          })}
        </nav>

        {activeAccountTab === "api" ? (
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
        ) : (
          <NotificationSettingsPlaceholder copy={copy} isDarkTheme={isDarkTheme} />
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
    </section>
  );
}
