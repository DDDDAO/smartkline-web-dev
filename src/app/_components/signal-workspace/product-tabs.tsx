"use client";

import type { WorkspaceCopy } from "@/app/_lib/i18n";

export { CommunityConversionModal } from "./community-conversion-modal";
export { KolFollowProductTab } from "./kol-follow-product-tab";

export type WorkspaceProductTab =
  | "intel"
  | "kolFollow"
  | "topSignals"
  | "strategySquare"
  | "accountManagement";

export const WORKSPACE_PRODUCT_TAB_STORAGE_KEY =
  "smartkline:workspace-product-tab:v1";

export const WORKSPACE_PRODUCT_TABS: readonly WorkspaceProductTab[] = [
  "intel",
  "kolFollow",
  "topSignals",
  "strategySquare",
  "accountManagement",
];

export function isWorkspaceProductTab(
  value: string | null | undefined,
): value is WorkspaceProductTab {
  return WORKSPACE_PRODUCT_TABS.includes(value as WorkspaceProductTab);
}

export function WorkspaceProductTabs({
  activeTab,
  copy,
  isDarkTheme,
  variant = "standalone",
  onTabChange,
}: {
  activeTab: WorkspaceProductTab;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  variant?: "standalone" | "topbar";
  onTabChange: (tab: WorkspaceProductTab) => void;
}) {
  const shellClassName =
    variant === "topbar"
      ? "flex w-full min-w-0 gap-7 overflow-x-auto bg-transparent p-0 lg:w-fit"
      : isDarkTheme
        ? "mx-3 mt-3 flex w-fit max-w-[calc(100vw-1.5rem)] gap-1 overflow-x-auto rounded-full border border-white/[0.075] bg-white/[0.035] p-1 lg:mx-4"
        : "mx-3 mt-3 flex w-fit max-w-[calc(100vw-1.5rem)] gap-1 overflow-x-auto rounded-full border border-[#E5EAF0] bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.035)] lg:mx-4";

  return (
    <nav aria-label={copy.workspace.navAria} className={shellClassName}>
      {WORKSPACE_PRODUCT_TABS.map((tab) => {
        const tabCopy = copy.workspace.productTabs[tab];
        const isActive = activeTab === tab;
        const buttonClassName =
          variant === "topbar"
            ? isActive
              ? "motion-fx-1-nav-button flex h-9 shrink-0 items-center bg-transparent px-0 text-xs font-semibold text-[#00A6F4] transition hover:bg-transparent hover:text-[#00A6F4] sm:text-sm"
              : isDarkTheme
                ? "motion-fx-1-nav-button flex h-9 shrink-0 items-center bg-transparent px-0 text-xs font-medium text-slate-400 transition hover:bg-transparent hover:text-sky-300 sm:text-sm"
                : "motion-fx-1-nav-button flex h-9 shrink-0 items-center bg-transparent px-0 text-xs font-medium text-slate-500 transition hover:bg-transparent hover:text-[#008DCC] sm:text-sm"
            : isActive
              ? "motion-fx-1-nav-button flex h-9 shrink-0 items-center rounded-full bg-[#00A6F4] px-3 text-xs font-semibold text-white sm:px-4 sm:text-sm"
              : isDarkTheme
                ? "motion-fx-1-nav-button flex h-9 shrink-0 items-center rounded-full px-3 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.08] hover:text-sky-300 sm:px-4 sm:text-sm"
                : "motion-fx-1-nav-button flex h-9 shrink-0 items-center rounded-full px-3 text-xs font-semibold text-slate-500 transition hover:bg-[#EAF8FE] hover:text-[#008DCC] sm:px-4 sm:text-sm";

        return (
          <button
            key={tab}
            aria-current={isActive ? "page" : undefined}
            className={buttonClassName}
            data-guide-target={
              tab === "kolFollow" ? "workspace-kol-follow-tab" : undefined
            }
            title={tabCopy.description}
            type="button"
            onClick={() => onTabChange(tab)}
          >
            <span>{tabCopy.label}</span>
            {tabCopy.stageLabel ? (
              <span
                className={
                  isActive
                    ? "ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                    : isDarkTheme
                      ? "ml-1 rounded-full bg-sky-300/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-200"
                      : "ml-1 rounded-full bg-[#EAF8FE] px-1.5 py-0.5 text-[10px] font-semibold text-[#008DCC]"
                }
              >
                {tabCopy.stageLabel}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
