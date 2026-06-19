"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { WorkspaceCopy } from "@/i18n/workspace";
import { SourceAvatar } from "../card-ui";
import {
  addCopyTradingSourceRowsByIds,
  createDefaultCopyTradingSourceRows,
  removeCopyTradingSourceRow,
  updateCopyTradingSourceRow,
  type CopyTradingSignalSourceConfigRow,
} from "./copy-trading-signal-source-config";
import type { CopyTradingPrototypeTarget } from "./types";

export function CopyTradingSignalSourceConfigEditor({
  advancedEnabled,
  availableSignalSources,
  copy,
  errors = [],
  isDarkTheme,
  rows,
  onAdvancedEnabledChange,
  onRowsChange,
}: {
  advancedEnabled: boolean;
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  copy: WorkspaceCopy;
  errors?: readonly string[];
  isDarkTheme: boolean;
  rows: readonly CopyTradingSignalSourceConfigRow[];
  onAdvancedEnabledChange: (value: boolean) => void;
  onRowsChange: (rows: CopyTradingSignalSourceConfigRow[]) => void;
}) {
  const strategyCreateCopy = copy.workspace.accountCenter.strategyCreate;
  const visibleRows = advancedEnabled ? rows : rows.slice(0, 1);
  const cardClassName = isDarkTheme
    ? "border-white/[0.075] bg-white/[0.035] text-slate-100"
    : "border-[#E8E8EC] bg-[#FAFAFA] text-slate-950";

  const setAdvancedEnabled = (nextValue: boolean) => {
    onAdvancedEnabledChange(nextValue);
    if (nextValue && rows.length === 0) {
      onRowsChange(createDefaultCopyTradingSourceRows(availableSignalSources));
    }
  };

  return (
    <Card className={`gap-0 rounded-2xl py-0 shadow-none ${cardClassName}`}>
      <CardHeader className="gap-2 px-3 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-sm font-black">{strategyCreateCopy.copyTradingSignalSourcesTitle}</CardTitle>
            <CardDescription className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-600"}>
              {strategyCreateCopy.copyTradingSignalSourcesDescription}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-indigo-400/15 px-3 py-2">
            <Switch
              checked={advancedEnabled}
              disabled={availableSignalSources.length === 0}
              onCheckedChange={setAdvancedEnabled}
            />
            <span className={isDarkTheme ? "text-xs font-black text-indigo-100" : "text-xs font-black text-indigo-700"}>
              {strategyCreateCopy.copyTradingAdvancedSources}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3">
        <Separator className={isDarkTheme ? "bg-white/[0.075]" : "bg-[#E8E8EC]"} />
        {availableSignalSources.length === 0 ? (
          <p className={isDarkTheme ? "rounded-xl bg-rose-300/[0.08] px-3 py-2 text-xs font-bold text-rose-100" : "rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"}>
            {strategyCreateCopy.copyTradingNoAvailableSignalSource}
          </p>
        ) : null}
        {advancedEnabled ? (
          <SignalSourceSearchPicker
            availableSignalSources={availableSignalSources}
            copy={copy}
            isDarkTheme={isDarkTheme}
            rows={rows}
            onSelect={(sourceIds) => onRowsChange(addCopyTradingSourceRowsByIds(rows, availableSignalSources, sourceIds))}
          />
        ) : null}
        <div className="grid gap-2">
          {visibleRows.map((row, index) => (
            <SignalSourceConfigRowEditor
              key={row.rowKey}
              availableSignalSources={availableSignalSources}
              canRemove={advancedEnabled && visibleRows.length > 1}
              copy={copy}
              index={index}
              isDarkTheme={isDarkTheme}
              rows={rows}
              row={row}
              onRemove={() => onRowsChange(removeCopyTradingSourceRow(rows, row.rowKey))}
              onRowsChange={onRowsChange}
            />
          ))}
        </div>
        {!advancedEnabled ? (
          <p className={isDarkTheme ? "text-xs leading-5 text-slate-500" : "text-xs leading-5 text-slate-500"}>
            {strategyCreateCopy.copyTradingSingleSourceHint}
          </p>
        ) : null}
        {errors.length > 0 ? (
          <ul className={isDarkTheme ? "list-disc space-y-1 rounded-xl bg-rose-300/[0.08] px-5 py-2 text-xs font-bold text-rose-100" : "list-disc space-y-1 rounded-xl bg-rose-50 px-5 py-2 text-xs font-bold text-rose-700"}>
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SignalSourceSearchPicker({
  availableSignalSources,
  copy,
  isDarkTheme,
  rows,
  onSelect,
}: {
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  rows: readonly CopyTradingSignalSourceConfigRow[];
  onSelect: (sourceIds: readonly string[]) => void;
}) {
  const strategyCreateCopy = copy.workspace.accountCenter.strategyCreate;
  const [query, setQuery] = useState("");
  const selectedIds = useMemo(() => new Set(rows.map((row) => row.signalSourceId).filter(Boolean)), [rows]);
  const selectableSources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return availableSignalSources
      .filter((source) => !selectedIds.has(source.trader.trader_id))
      .filter((source) => {
        if (!normalizedQuery) {
          return true;
        }
        return [source.trader.name, source.trader.trader_id, source.trader.platform]
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .slice(0, 8);
  }, [availableSignalSources, query, selectedIds]);
  const hasUnselectedSource = availableSignalSources.some((source) => !selectedIds.has(source.trader.trader_id));
  const pickerClassName = isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-[#0F131A]/70 p-3"
    : "rounded-2xl border border-[#E8E8EC] bg-white p-3";
  const optionClassName = isDarkTheme
    ? "flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-slate-100 transition-colors hover:bg-white/[0.075]"
    : "flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-[#E8E8EC] bg-[#FAFAFA] px-3 py-2 text-slate-950 transition-colors hover:bg-[#F5F5FF]";
  const checkboxClassName = isDarkTheme
    ? "border-white/[0.16] bg-white/[0.035] data-[state=checked]:border-indigo-300 data-[state=checked]:bg-indigo-400 data-[state=checked]:text-slate-950"
    : "border-[#D7D7E0] bg-white data-[state=checked]:border-[#4F46E5] data-[state=checked]:bg-[#4F46E5] data-[state=checked]:text-white";
  const mutedClassName = isDarkTheme ? "text-xs font-bold text-slate-500" : "text-xs font-bold text-slate-500";

  const selectSource = (sourceId: string) => {
    onSelect([sourceId]);
    setQuery("");
  };

  return (
    <div className={pickerClassName}>
      <div className="space-y-2">
        <Label className={isDarkTheme ? "text-[11px] uppercase tracking-[0.13em] text-slate-500" : "text-[11px] uppercase tracking-[0.13em] text-slate-400"}>
          {strategyCreateCopy.copyTradingAddSignalSource}
        </Label>
        <Input
          className={isDarkTheme ? "h-11 rounded-2xl border-white/[0.075] bg-white/[0.035] text-slate-100 placeholder:text-slate-600" : "h-11 rounded-2xl border-[#E8E8EC] bg-white text-slate-950 placeholder:text-slate-400"}
          disabled={!hasUnselectedSource}
          placeholder={strategyCreateCopy.signalSourceSearchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && selectableSources[0]) {
              event.preventDefault();
              selectSource(selectableSources[0].trader.trader_id);
            }
          }}
        />
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {hasUnselectedSource ? (
          selectableSources.length > 0 ? selectableSources.map((source) => (
            <Label
              key={source.trader.trader_id}
              className={optionClassName}
              htmlFor={`copy-trading-source-picker-${source.trader.trader_id}`}
            >
              <Checkbox
                checked={false}
                className={checkboxClassName}
                id={`copy-trading-source-picker-${source.trader.trader_id}`}
                onCheckedChange={(checked) => {
                  if (checked === true) {
                    selectSource(source.trader.trader_id);
                  }
                }}
              />
              <SignalSourceOptionLabel copy={copy} isDarkTheme={isDarkTheme} source={source} />
            </Label>
          )) : (
            <div className={mutedClassName}>{strategyCreateCopy.signalSourceNoMatches}</div>
          )
        ) : (
          <div className={mutedClassName}>{strategyCreateCopy.copyTradingSignalSourceCount(rows.length)}</div>
        )}
      </div>
    </div>
  );
}

function SignalSourceConfigRowEditor({
  availableSignalSources,
  canRemove,
  copy,
  index,
  isDarkTheme,
  row,
  rows,
  onRemove,
  onRowsChange,
}: {
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  canRemove: boolean;
  copy: WorkspaceCopy;
  index: number;
  isDarkTheme: boolean;
  row: CopyTradingSignalSourceConfigRow;
  rows: readonly CopyTradingSignalSourceConfigRow[];
  onRemove: () => void;
  onRowsChange: (rows: CopyTradingSignalSourceConfigRow[]) => void;
}) {
  const strategyCreateCopy = copy.workspace.accountCenter.strategyCreate;
  const selectedByOtherRows = new Set(rows.filter((item) => item.rowKey !== row.rowKey).map((item) => item.signalSourceId));
  const sourceOptions = availableSignalSources.filter((source) => {
    const sourceId = source.trader.trader_id;
    return sourceId === row.signalSourceId || !selectedByOtherRows.has(sourceId);
  });
  const rowClassName = isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-[#0F131A]/70 p-3"
    : "rounded-2xl border border-[#E8E8EC] bg-white p-3";

  return (
    <div className={rowClassName}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className={isDarkTheme ? "text-[10px] font-black uppercase tracking-[0.12em] text-slate-500" : "text-[10px] font-black uppercase tracking-[0.12em] text-slate-400"}>
          {strategyCreateCopy.copyTradingSignalSourceItem(index + 1)}
        </div>
        {canRemove ? (
          <Button size="sm" type="button" variant="ghost" onClick={onRemove}>
            {strategyCreateCopy.copyTradingRemoveSignalSource}
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
        <div className="space-y-2">
          <Label className={isDarkTheme ? "text-[11px] uppercase tracking-[0.13em] text-slate-500" : "text-[11px] uppercase tracking-[0.13em] text-slate-400"}>
            {strategyCreateCopy.signalSourceSelect}
          </Label>
          <Select
            value={row.signalSourceId}
            onValueChange={(value) => onRowsChange(updateCopyTradingSourceRow(rows, row.rowKey, { signalSourceId: value }, availableSignalSources))}
          >
            <SelectTrigger className={isDarkTheme ? "h-12 border-white/[0.075] bg-white/[0.035] text-slate-100" : "h-12 border-[#E8E8EC] bg-white text-slate-950"}>
              <SelectValue placeholder={strategyCreateCopy.signalSourceSelect} />
            </SelectTrigger>
            <SelectContent className={isDarkTheme ? "border-white/[0.075] bg-[#111820] text-slate-100" : "border-[#E8E8EC] bg-white text-slate-950"}>
              {sourceOptions.map((source) => (
                <SelectItem key={source.trader.trader_id} value={source.trader.trader_id}>
                  <SignalSourceOptionLabel copy={copy} isDarkTheme={isDarkTheme} source={source} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className={isDarkTheme ? "text-[11px] uppercase tracking-[0.13em] text-slate-500" : "text-[11px] uppercase tracking-[0.13em] text-slate-400"}>
            {strategyCreateCopy.copyTradingMarginPercent}
          </Label>
          <div className="relative">
            <Input
              className={isDarkTheme ? "h-12 border-white/[0.075] bg-white/[0.035] pr-8 text-slate-100" : "h-12 border-[#E8E8EC] bg-white pr-8 text-slate-950"}
              inputMode="decimal"
              value={row.marginPercent}
              onChange={(event) => onRowsChange(updateCopyTradingSourceRow(rows, row.rowKey, { marginPercent: event.target.value }, availableSignalSources))}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignalSourceOptionLabel({
  copy,
  isDarkTheme,
  source,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  source: CopyTradingPrototypeTarget;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <SourceAvatar isDarkTheme={isDarkTheme} name={source.trader.name} url={source.trader.avatar} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-black">{source.trader.name}</span>
        <span className="block truncate text-xs font-semibold text-slate-500">
          {source.trader.platform} · {copy.workspace.topSignals.currentPositions}: {source.positionsCount}
        </span>
      </span>
    </span>
  );
}
