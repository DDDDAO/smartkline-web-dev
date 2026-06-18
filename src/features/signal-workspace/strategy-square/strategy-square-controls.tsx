import * as SelectPrimitive from "@radix-ui/react-select";

import type { WorkspaceCopy } from "@/i18n/workspace";
import type { StrategySquareStoreTab } from "./strategy-square-data";
import {
  createPaginationItems,
  getPaginationPageButtonClassName,
  getStoreTabButtonClassName,
} from "./strategy-square-logic";

export function StrategyStoreTabs({
  activeTab,
  copy,
  isDarkTheme,
  onTabChange,
}: {
  activeTab: StrategySquareStoreTab;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  onTabChange: (tab: StrategySquareStoreTab) => void;
}) {
  const tabs: readonly StrategySquareStoreTab[] = ["recommended", "allProjects"];
  const tabCopy = copy.workspace.strategySquare.viewTabs;

  return (
    <nav aria-label={copy.workspace.strategySquare.heroTitle} className={isDarkTheme ? "grid grid-cols-2 gap-1 rounded-2xl border border-white/[0.075] bg-white/[0.04] p-1" : "grid grid-cols-2 gap-1 rounded-2xl border border-[#E5EAF0] bg-[#F7FAFD] p-1"}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            aria-current={isActive ? "page" : undefined}
            className={getStoreTabButtonClassName(isDarkTheme, isActive)}
            type="button"
            onClick={() => onTabChange(tab)}
          >
            {tabCopy[tab]}
          </button>
        );
      })}
    </nav>
  );
}

export function StrategyFilterSelect({
  isDarkTheme,
  label,
  options,
  value,
  onChange,
}: {
  isDarkTheme: boolean;
  label: string;
  options: readonly { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="grid gap-1.5">
      <span className={isDarkTheme ? "text-xs font-bold text-slate-500" : "text-xs font-bold text-slate-400"}>{label}</span>
      <SelectPrimitive.Root value={value} onValueChange={onChange}>
        <SelectPrimitive.Trigger
          className={isDarkTheme
            ? "flex h-11 w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 text-left text-sm font-black text-slate-100 outline-none transition hover:bg-white/[0.055] focus:border-sky-400/45 focus:ring-2 focus:ring-sky-400/10"
            : "flex h-11 w-full items-center justify-between gap-3 rounded-2xl border border-[#D5E4EF] bg-white px-3 text-left text-sm font-black text-slate-950 shadow-sm outline-none transition hover:bg-[#F8FAFC] focus:border-[#7DBEFF] focus:ring-2 focus:ring-[#16AFF5]/10"}
        >
          <SelectPrimitive.Value>{selectedOption?.label}</SelectPrimitive.Value>
          <SelectPrimitive.Icon asChild>
            <span aria-hidden="true" className={isDarkTheme ? "text-xs text-slate-500" : "text-xs text-slate-400"}>⌄</span>
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={isDarkTheme
              ? "z-[130] max-h-[300px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-white/[0.075] bg-[#111820] p-1 text-slate-100 shadow-[0_18px_44px_rgba(0,0,0,0.38)]"
              : "z-[130] max-h-[300px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-[#D5E4EF] bg-white p-1 text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.14)]"}
            position="popper"
            sideOffset={8}
          >
            <SelectPrimitive.Viewport className="grid gap-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  className={isDarkTheme
                    ? "flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-bold outline-none transition data-[highlighted]:bg-white/[0.055] data-[state=checked]:bg-sky-400/10 data-[state=checked]:text-sky-100"
                    : "flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-bold outline-none transition data-[highlighted]:bg-[#F8FAFC] data-[state=checked]:bg-[#EAF8FE] data-[state=checked]:text-[#007DB8]"}
                  value={option.value}
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="text-xs font-black">✓</SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}

export function StrategyPagination({
  copy,
  currentPage,
  isDarkTheme,
  pageSize,
  totalPages,
  onPageChange,
}: {
  copy: WorkspaceCopy;
  currentPage: number;
  isDarkTheme: boolean;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const panelCopy = copy.workspace.strategySquare;
  const pageItems = createPaginationItems(currentPage, totalPages);
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const shellClassName = isDarkTheme
    ? "flex flex-col items-start justify-between gap-3 rounded-[24px] border border-white/[0.075] bg-white/[0.025] p-3 sm:flex-row sm:items-center"
    : "flex flex-col items-start justify-between gap-3 rounded-[24px] border border-[#E5EAF0] bg-white p-3 shadow-sm sm:flex-row sm:items-center";
  const pageSizeClassName = isDarkTheme
    ? "text-xs font-bold text-slate-500"
    : "text-xs font-bold text-slate-400";
  const listClassName = "flex flex-wrap items-center gap-1";
  const arrowButtonClassName = isDarkTheme
    ? "motion-fx-3-raw-button inline-flex h-9 items-center justify-center rounded-xl border border-white/[0.075] bg-white/[0.035] px-3 text-xs font-black text-sky-200 transition hover:border-sky-400/25 hover:bg-sky-400/10 disabled:cursor-not-allowed disabled:opacity-40"
    : "motion-fx-3-raw-button inline-flex h-9 items-center justify-center rounded-xl border border-[#B7E8FC] bg-white px-3 text-xs font-black text-[#008DCC] transition hover:bg-[#EAF8FE] disabled:cursor-not-allowed disabled:opacity-40";
  const ellipsisClassName = isDarkTheme
    ? "grid h-9 w-9 place-items-center text-xs font-black text-slate-500"
    : "grid h-9 w-9 place-items-center text-xs font-black text-slate-400";

  return (
    <nav aria-label={panelCopy.pagination.ariaLabel} className={shellClassName}>
      <span className={pageSizeClassName}>{panelCopy.pagination.pageSizeLabel(pageSize)}</span>
      <div className={listClassName}>
        <button
          aria-label={panelCopy.pagination.previous}
          className={arrowButtonClassName}
          disabled={!canGoPrevious}
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
        >
          ‹
          <span className="ml-1 hidden sm:inline">{panelCopy.pagination.previous}</span>
        </button>
        {pageItems.map((item, index) => {
          if (item === "ellipsis") {
            return (
              <span key={`ellipsis-${index}`} aria-hidden="true" className={ellipsisClassName}>
                …
              </span>
            );
          }

          const isActive = item === currentPage;
          return (
            <button
              key={item}
              aria-current={isActive ? "page" : undefined}
              aria-label={panelCopy.pagination.pageLabel(item)}
              className={getPaginationPageButtonClassName(isDarkTheme, isActive)}
              type="button"
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          );
        })}
        <button
          aria-label={panelCopy.pagination.next}
          className={arrowButtonClassName}
          disabled={!canGoNext}
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
        >
          <span className="mr-1 hidden sm:inline">{panelCopy.pagination.next}</span>
          ›
        </button>
      </div>
    </nav>
  );
}
