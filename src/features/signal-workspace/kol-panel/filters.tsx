"use client";

import { useState, type ReactNode } from "react";
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
    : "bg-[#FAFBFD] px-3 pb-2 pt-3";
  const [openFilter, setOpenFilter] = useState<
    "kol" | "direction" | "status" | "symbol" | null
  >(null);

  return (
    <div className={containerClassName}>
      <div className="grid grid-cols-2 gap-2">
        <FilterDropdown
          id="kol-source-filter"
          allLabel={ALL_KOL_FILTER}
          allText={copy.common.all}
          isOpen={openFilter === "kol"}
          isDarkTheme={isDarkTheme}
          label={copy.kol.filters.kol}
          options={kolOptions}
          value={kolFilter}
          onOpenChange={(isOpen) => setOpenFilter(isOpen ? "kol" : null)}
          onChange={onKolFilterChange}
        />
        <FilterDropdown
          id="kol-direction-filter"
          allLabel={ALL_DIRECTION_FILTER}
          allText={copy.common.all}
          isOpen={openFilter === "direction"}
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
          onOpenChange={(isOpen) => setOpenFilter(isOpen ? "direction" : null)}
          onChange={onDirectionFilterChange}
        />
        <FilterDropdown
          id="kol-status-filter"
          allLabel={ALL_STATUS_FILTER}
          allText={copy.common.all}
          isOpen={openFilter === "status"}
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
          onOpenChange={(isOpen) => setOpenFilter(isOpen ? "status" : null)}
          onChange={onStatusFilterChange}
        />
        <FilterDropdown
          id="kol-symbol-filter"
          allLabel={ALL_SYMBOL_FILTER}
          allText={copy.common.all}
          isOpen={openFilter === "symbol"}
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
          onOpenChange={(isOpen) => setOpenFilter(isOpen ? "symbol" : null)}
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
  isOpen,
  isDarkTheme,
  label,
  optionLabel = (value) => value,
  options,
  renderIcon,
  value,
  onOpenChange,
  onChange,
}: {
  allLabel: string;
  allText: string;
  id: string;
  isOpen: boolean;
  isDarkTheme: boolean;
  label: string;
  optionLabel?: (value: T) => string;
  options: readonly T[];
  renderIcon?: (value: string) => ReactNode;
  value: string;
  onOpenChange: (isOpen: boolean) => void;
  onChange: (value: string) => void;
}) {
  const buttonClassName = isDarkTheme
    ? "inline-flex h-7 w-full min-w-0 items-center gap-1 rounded-full border border-white/[0.075] bg-white/[0.035] px-2 text-xs font-medium text-slate-200 outline-none transition hover:border-sky-500/40 hover:bg-white/[0.08] focus-visible:border-[#00A6F4]"
    : "inline-flex h-7 w-full min-w-0 items-center gap-1 rounded-full border border-[#E5EAF0] bg-white px-2 text-xs font-medium text-slate-700 outline-none transition hover:border-[#B7E8FC] hover:bg-[#EAF8FE] focus-visible:border-[#00A6F4]";
  const menuClassName = isDarkTheme
    ? "motion-fx-9-surface absolute left-0 top-9 z-50 min-w-[150px] max-w-[260px] overflow-hidden rounded-2xl border border-white/[0.075] bg-[#181A20] p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.28)]"
    : "motion-fx-9-surface absolute left-0 top-9 z-50 min-w-[150px] max-w-[260px] overflow-hidden rounded-2xl border border-[#E5EAF0] bg-white p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.12)]";
  const optionClassName = (isSelected: boolean) =>
    isSelected
      ? isDarkTheme
        ? "flex h-8 w-full items-center gap-2 rounded-xl bg-[#00A6F4]/15 px-2 text-left text-[11px] font-semibold text-sky-200"
        : "flex h-8 w-full items-center gap-2 rounded-xl bg-[#EAF8FE] px-2 text-left text-[11px] font-semibold text-[#007DB8]"
      : isDarkTheme
        ? "flex h-8 w-full items-center gap-2 rounded-xl px-2 text-left text-[11px] font-medium text-slate-300 transition hover:bg-white/[0.08]"
        : "flex h-8 w-full items-center gap-2 rounded-xl px-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50";
  const selectedText = value === allLabel ? allText : optionLabel(value as T);
  const allOptions = [allLabel, ...options];

  return (
    <div
      className="relative min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onOpenChange(false);
        }
      }}
    >
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={buttonClassName}
        id={id}
        type="button"
        onClick={() => onOpenChange(!isOpen)}
      >
        <span
          className={
            isDarkTheme ? "shrink-0 text-slate-500" : "shrink-0 text-slate-400"
          }
        >
          {label}
        </span>
        {renderIcon?.(value)}
        <span className="min-w-0 flex-1 truncate text-left whitespace-nowrap">
          {selectedText}
        </span>
        <svg
          aria-hidden="true"
          className={`h-3 w-3 shrink-0 transition ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="m7 10 5 5 5-5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </button>
      {isOpen ? (
        <div
          aria-labelledby={id}
          className={menuClassName}
          role="listbox"
          tabIndex={-1}
        >
          {allOptions.map((option) => {
            const isSelected = option === value;
            return (
              <button
                key={option}
                aria-selected={isSelected}
                className={optionClassName(isSelected)}
                role="option"
                type="button"
                onClick={() => {
                  onChange(option);
                  onOpenChange(false);
                }}
              >
                {renderIcon?.(option)}
                <span className="min-w-0 truncate">
                  {option === allLabel ? allText : optionLabel(option as T)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
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
      ? "bg-[#16AFF5]"
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
