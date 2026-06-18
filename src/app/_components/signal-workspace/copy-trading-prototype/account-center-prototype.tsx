"use client";

import { useMemo, useState } from "react";
import { StrategyDetailView } from "./strategy-detail-view";
import { TelegramUserAvatar, getTelegramUserDisplayName } from "./telegram-user-avatar";
import type { AccountCenterPrototypeProps, PrototypeStrategy } from "./types";
import { getPrototypeStrategyType } from "./strategy-helpers";
import { getPrimaryButtonClassName, getSoftButtonClassName } from "./styles";
import { createSignalSourceTargetById, ApiConnectionCard, StrategyCreateLayer } from "./copy-trading-prototype-helpers";
import { ExchangeApiSetupLayer } from "./exchange-api-setup-layer";
import { PrototypeStrategyCard } from "./prototype-strategy-card";

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
                  availableSignalSources={availableSignalSources}
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
