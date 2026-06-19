"use client";

import type { ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { MarketSymbol } from "@/types/market";
import type { StructuredSignal } from "@/types/signal";
import { SymbolIcon } from "../card-ui";
import { ALL_DIRECTION_FILTER, ALL_KOL_FILTER, ALL_STATUS_FILTER, ALL_SYMBOL_FILTER, type StatusFilterOption } from "./shared";
import { formatSymbolLabel } from "./styles";

export function KolPanelFilters({
  copy,
  directionFilter,
  directionOptions,
  isDarkTheme,
  kolFilter,
  kolOptions,
  statusFilter,
  statusOptions,
  symbolFilter,
  symbolOptions,
  onDirectionFilterChange,
  onKolFilterChange,
  onStatusFilterChange,
  onSymbolFilterChange,
}: {
  copy: WorkspaceCopy;
  directionFilter: string;
  directionOptions: readonly StructuredSignal["direction"][];
  isDarkTheme: boolean;
  kolFilter: string;
  kolOptions: readonly string[];
  statusFilter: string;
  statusOptions: readonly StatusFilterOption[];
  symbolFilter: string;
  symbolOptions: readonly MarketSymbol[];
  onDirectionFilterChange: (value: string) => void;
  onKolFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSymbolFilterChange: (value: string) => void;
}) {
  const containerClassName = isDarkTheme
    ? "bg-[#12161D] px-3 pb-2 pt-3"
    : "bg-[#FAFAFA] px-3 pb-2 pt-3";
  return (
    <div className={containerClassName}>
      <div className="grid grid-cols-2 gap-2">
        <FilterDropdown
          id="kol-source-filter"
          allLabel={ALL_KOL_FILTER}
          allText={copy.common.all}
          isDarkTheme={isDarkTheme}
          label={copy.kol.filters.kol}
          options={kolOptions}
          value={kolFilter}
          onChange={onKolFilterChange}
        />
        <FilterDropdown
          id="kol-direction-filter"
          allLabel={ALL_DIRECTION_FILTER}
          allText={copy.common.all}
          isDarkTheme={isDarkTheme}
          label={copy.kol.direction}
          options={directionOptions}
          value={directionFilter}
          optionLabel={(direction) => formatDirectionLabel(direction, copy)}
          renderIcon={(option) =>
            option === ALL_DIRECTION_FILTER ? null : (
              <DirectionFilterDot
                direction={option as StructuredSignal["direction"]}
              />
            )
          }
          onChange={onDirectionFilterChange}
        />
        <FilterDropdown
          id="kol-status-filter"
          allLabel={ALL_STATUS_FILTER}
          allText={copy.common.all}
          isDarkTheme={isDarkTheme}
          label={copy.kol.filters.status}
          options={statusOptions}
          value={statusFilter}
          optionLabel={(status) => formatStatusFilterLabel(status, copy)}
          renderIcon={(option) =>
            option === ALL_STATUS_FILTER ? null : (
              <StatusFilterDot status={option as StatusFilterOption} />
            )
          }
          onChange={onStatusFilterChange}
        />
        <FilterDropdown
          id="kol-symbol-filter"
          allLabel={ALL_SYMBOL_FILTER}
          allText={copy.common.all}
          isDarkTheme={isDarkTheme}
          label={copy.kol.filters.symbol}
          options={symbolOptions}
          value={symbolFilter}
          optionLabel={formatSymbolFilterLabel}
          renderIcon={(option) =>
            option === ALL_SYMBOL_FILTER ? null : (
              <SymbolIcon size="md" symbol={option} />
            )
          }
          onChange={onSymbolFilterChange}
        />
      </div>
    </div>
  );
}

export function FilterDropdown<T extends string>({
  allLabel,
  allText,
  id,
  isDarkTheme,
  label,
  optionLabel = (value) => value,
  options,
  renderIcon,
  value,
  onChange,
}: {
  allLabel: string;
  allText: string;
  id: string;
  isDarkTheme: boolean;
  label: string;
  optionLabel?: (value: T) => string;
  options: readonly T[];
  renderIcon?: (value: string) => ReactNode;
  value: string;
  onChange: (value: string) => void;
}) {
  const triggerClassName = isDarkTheme
    ? "inline-flex h-7 w-full min-w-0 items-center gap-1 rounded-full border border-white/[0.075] bg-white/[0.035] px-2 text-xs font-medium text-slate-200 outline-none transition hover:border-indigo-500/40 hover:bg-white/[0.08] focus-visible:border-[#6366F1]"
    : "inline-flex h-7 w-full min-w-0 items-center gap-1 rounded-full border border-[#E8E8EC] bg-white px-2 text-xs font-medium text-slate-700 outline-none transition hover:border-[#C7D2FE] hover:bg-[#EEF2FF] focus-visible:border-[#6366F1]";
  const contentClassName = isDarkTheme
    ? "z-[130] min-w-[150px] max-w-[260px] rounded-2xl border border-white/[0.075] bg-[#181A20] p-1.5 text-slate-200 shadow-[0_18px_48px_rgba(0,0,0,0.28)]"
    : "z-[130] min-w-[150px] max-w-[260px] rounded-2xl border border-[#E8E8EC] bg-white p-1.5 text-slate-700 shadow-[0_18px_48px_rgba(15,23,42,0.12)]";
  const itemClassName = isDarkTheme
    ? "flex h-8 items-center gap-2 rounded-xl px-2 text-[11px] font-medium data-[highlighted]:bg-white/[0.08] data-[state=checked]:bg-[#6366F1]/15 data-[state=checked]:font-semibold data-[state=checked]:text-indigo-200"
    : "flex h-8 items-center gap-2 rounded-xl px-2 text-[11px] font-medium data-[highlighted]:bg-slate-50 data-[state=checked]:bg-[#EEF2FF] data-[state=checked]:font-semibold data-[state=checked]:text-[#4F46E5]";
  const allOptions = [allLabel, ...options];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={triggerClassName} id={id}>
        <span
          className={
            isDarkTheme ? "shrink-0 text-slate-500" : "shrink-0 text-slate-400"
          }
        >
          {label}
        </span>
        {renderIcon?.(value)}
        <SelectValue className="min-w-0 flex-1 truncate text-left whitespace-nowrap" />
      </SelectTrigger>
      <SelectContent className={contentClassName} position="popper" sideOffset={6}>
        {allOptions.map((option) => (
          <SelectItem key={option} className={itemClassName} value={option}>
            <span className="flex min-w-0 items-center gap-2">
              {renderIcon?.(option)}
              <span className="min-w-0 truncate">
                {option === allLabel ? allText : optionLabel(option as T)}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DirectionFilterDot({
  direction,
}: {
  direction: StructuredSignal["direction"];
}) {
  return (
    <span
      className={
        direction === "long"
          ? "h-2 w-2 shrink-0 rounded-full bg-[#72D4B0]"
          : "h-2 w-2 shrink-0 rounded-full bg-[#F08A92]"
      }
    />
  );
}

export function StatusFilterDot({ status }: { status: StatusFilterOption }) {
  const colorClassName =
    status === "entered"
      ? "bg-[#6366F1]"
      : status === "not-entered"
        ? "bg-[#FFD978]"
        : status === "stop-loss"
          ? "bg-[#F08A92]"
          : status === "take-profit"
            ? "bg-[#72D4B0]"
            : "bg-slate-400";

  return <span className={`h-2 w-2 shrink-0 rounded-full ${colorClassName}`} />;
}
export function formatSymbolFilterLabel(symbol: MarketSymbol): string {
  return formatSymbolLabel(symbol);
}
export function formatDirectionLabel(
  direction: StructuredSignal["direction"],
  copy: WorkspaceCopy,
): string {
  return copy.kol.directionFull[direction];
}

export function formatStatusFilterLabel(
  status: StatusFilterOption,
  copy: WorkspaceCopy,
): string {
  if (status === "closed") {
    return copy.kol.statusFilters.closed;
  }

  if (status === "entered") {
    return copy.paper.statusEntered;
  }

  if (status === "not-entered") {
    return copy.kol.statusFilters.notOpened;
  }

  if (status === "take-profit") {
    return copy.paper.statusExitedTakeProfit;
  }

  return copy.paper.statusExitedStopLoss;
}
