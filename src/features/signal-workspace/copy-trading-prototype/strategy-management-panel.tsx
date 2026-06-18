"use client";

import { useState } from "react";
import type { TelegramSessionUser } from "@/lib/auth/telegram-auth";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type {
  CopyTradingPrototypeTarget,
  PrototypeApiConnection,
  PrototypeStrategy,
  PrototypeStrategyCreateInput,
  PrototypeStrategySettingsUpdateInput,
  PrototypeStrategyStatus,
} from "./types";
import { StrategyDetailView } from "./strategy-detail-view";
import {
  StrategyCreateLayer,
} from "./copy-trading-prototype-helpers";
import { PrototypeStrategyCard } from "./prototype-strategy-card";
import { getPrimaryButtonClassName } from "./styles";

export function StrategyManagementPanel({
  activeStrategyId,
  apiConnections,
  availableSignalSources,
  copy,
  isDarkTheme,
  strategies,
  telegramUser,
  onStrategyCreate,
  onStrategyDelete,
  onStrategyRouteChange,
  onStrategySettingsUpdate,
  onStrategyStatusChange,
}: {
  activeStrategyId: string;
  apiConnections: readonly PrototypeApiConnection[];
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  strategies: readonly PrototypeStrategy[];
  telegramUser: TelegramSessionUser | null;
  onStrategyCreate: (input: PrototypeStrategyCreateInput) => Promise<void> | void;
  onStrategyDelete: (strategyId: string) => Promise<void> | void;
  onStrategyRouteChange: (strategyId: string | null, mode?: "push" | "replace") => void;
  onStrategySettingsUpdate: (input: PrototypeStrategySettingsUpdateInput) => Promise<void> | void;
  onStrategyStatusChange: (strategyId: string, status: PrototypeStrategyStatus) => Promise<void> | void;
}) {
  const accountCopy = copy.workspace.accountCenter;
  const runningStrategyCount = strategies.filter((strategy) => strategy.status === "running").length;
  const [isStrategyCreateOpen, setIsStrategyCreateOpen] = useState(false);
  const [localSelectedStrategyId, setLocalSelectedStrategyId] = useState<string | null>(null);
  const selectedStrategyId = activeStrategyId || localSelectedStrategyId;
  const selectedStrategy = strategies.find((strategy) => strategy.id === selectedStrategyId) ?? null;
  const openStrategyDetail = (strategy: PrototypeStrategy) => {
    setLocalSelectedStrategyId(strategy.id);
    onStrategyRouteChange(strategy.id, "push");
  };

  const closeStrategyDetail = () => {
    setLocalSelectedStrategyId(null);
    onStrategyRouteChange(null, "replace");
  };

  return (
    <section className="min-h-0 flex-1 px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4 lg:px-6 lg:py-5">
      <div className="mx-auto grid w-full max-w-6xl gap-4 sm:gap-5">
        {selectedStrategy ? (
          <StrategyDetailView
            availableSignalSources={availableSignalSources}
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
            <header className={isDarkTheme ? "rounded-[28px] border border-white/[0.075] bg-white/[0.035] p-5 text-slate-100" : "rounded-[28px] border border-[#E5EAF0] bg-white p-5 text-slate-950 shadow-sm"}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tight">{copy.workspace.productTabs.strategyManagement.label}</h1>
                  <p className={isDarkTheme ? "mt-2 text-sm font-bold text-slate-400" : "mt-2 text-sm font-bold text-slate-500"}>
                    {accountCopy.strategyCreate.runningCount(runningStrategyCount, strategies.length)}
                  </p>
                </div>
                <button className={getPrimaryButtonClassName(isDarkTheme)} type="button" onClick={() => setIsStrategyCreateOpen(true)}>
                  {accountCopy.strategyCreate.action}
                </button>
              </div>
            </header>

            <section className={isDarkTheme ? "rounded-[28px] border border-white/[0.075] bg-white/[0.035] p-4" : "rounded-[28px] border border-[#E5EAF0] bg-white p-4 shadow-sm"}>
              <div className="grid gap-3">
                {strategies.length > 0 ? strategies.map((strategy) => (
                  <PrototypeStrategyCard
                    key={strategy.id}
                    availableSignalSources={availableSignalSources}
                    copy={copy}
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
