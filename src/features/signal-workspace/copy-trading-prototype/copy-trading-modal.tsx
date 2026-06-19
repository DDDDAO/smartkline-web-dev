"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SourceAvatar } from "../card-ui";
import type { CopyTradingPrototypeModalProps } from "./types";
import { getIconButtonClassName, getLabelClassName, getPrimaryButtonClassName, getSoftButtonClassName } from "./styles";
import { formatDefaultCopyStrategyName, TradingAccountSelect, PercentInput, PrototypeInput } from "./copy-trading-prototype-helpers";

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
    <Sheet open onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <SheetContent
        aria-label={accountCopy.copyTrading.modalTitle}
        className="inset-x-0 bottom-0 max-h-[92dvh] overflow-hidden rounded-t-[28px] p-0 shadow-[0_-24px_80px_rgba(15,23,42,0.24)] sm:inset-x-3 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:max-h-[min(720px,calc(100dvh-2rem))] sm:max-w-[520px] sm:-translate-y-1/2 sm:rounded-[28px] sm:shadow-[0_28px_90px_rgba(15,23,42,0.24)]"
        side="bottom"
      >
        <div className={isDarkTheme ? "flex max-h-[92dvh] flex-col border border-white/[0.085] bg-[#111820] text-slate-100 sm:max-h-[min(720px,calc(100dvh-2rem))]" : "flex max-h-[92dvh] flex-col border border-[#E8E8EC] bg-white text-slate-950 sm:max-h-[min(720px,calc(100dvh-2rem))]"}>
          <div className={isDarkTheme ? "border-b border-white/[0.075] px-4 py-4 sm:px-5 sm:py-5" : "border-b border-[#E8E8EC] px-4 py-4 sm:px-5 sm:py-5"}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={isDarkTheme ? "text-[11px] font-black uppercase tracking-[0.16em] text-indigo-300" : "text-[11px] font-black uppercase tracking-[0.16em] text-[#4F46E5]"}>{accountCopy.copyTrading.copyMode}</div>
                <SheetTitle className="mt-2 text-xl font-black tracking-tight">{accountCopy.copyTrading.modalTitle}</SheetTitle>
              </div>
              <Button aria-label={copy.common.close} className={getIconButtonClassName(isDarkTheme)} size="icon" type="button" variant="outline" onClick={onClose}>
                <span aria-hidden="true" className="text-lg leading-none">×</span>
              </Button>
            </div>
            <div className={isDarkTheme ? "mt-5 flex items-center gap-3 rounded-3xl border border-white/[0.075] bg-white/[0.035] p-3" : "mt-5 flex items-center gap-3 rounded-3xl border border-[#E8E8EC] bg-[#FAFAFA] p-3"}>
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
            <div className="block">
              <Label className={getLabelClassName(isDarkTheme)}>{accountCopy.copyTrading.apiSelect}</Label>
              {availableApiConnections.length > 0 ? (
                <TradingAccountSelect
                  accountCopy={accountCopy}
                  connections={availableApiConnections}
                  isDarkTheme={isDarkTheme}
                  value={selectedTradingAccountId}
                  onChange={setSelectedConnectorId}
                />
              ) : (
                <div className={isDarkTheme ? "mt-2 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-3 text-sm font-bold" : "mt-2 rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] px-3 py-3 text-sm font-bold"}>
                  {apiConnections.length > 0 ? accountCopy.copyTrading.noAvailableAccount : accountCopy.copyTrading.apiRequired}
                </div>
              )}
            </div>
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

          <div className={isDarkTheme ? "grid grid-cols-2 gap-2 border-t border-white/[0.075] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:items-center sm:justify-end sm:px-5" : "grid grid-cols-2 gap-2 border-t border-[#E8E8EC] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:items-center sm:justify-end sm:px-5"}>
            <Button className={getSoftButtonClassName(isDarkTheme)} type="button" variant="outline" onClick={onClose}>{copy.common.close}</Button>
            <Button
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
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
