"use client";

import { Button } from "@/components/ui/button";
import type { WorkspaceCopy } from "@/i18n/workspace";

export { CommunityConversionModal } from "./community-conversion-modal";

export type WorkspaceProductTab =
  | "strategySquare"
  | "topSignals"
  | "strategyManagement"
  | "referrals"
  | "accountManagement";

export const WORKSPACE_PRODUCT_TAB_STORAGE_KEY =
  "smartkline:workspace-product-tab:v1";

export const WORKSPACE_PRODUCT_TABS: readonly WorkspaceProductTab[] = [
  "strategySquare",
  "topSignals",
  "strategyManagement",
  "referrals",
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
        : "mx-3 mt-3 flex w-fit max-w-[calc(100vw-1.5rem)] gap-1 overflow-x-auto rounded-full border border-[#E8E8EC] bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.035)] lg:mx-4";

  return (
    <nav aria-label={copy.workspace.navAria} className={shellClassName}>
      {WORKSPACE_PRODUCT_TABS.map((tab) => {
        const tabCopy = copy.workspace.productTabs[tab];
        const isActive = activeTab === tab;
        const buttonClassName =
          variant === "topbar"
            ? isActive
              ? "motion-fx-1-nav-button flex h-9 shrink-0 items-center bg-transparent px-0 text-xs font-semibold text-[#6366F1] transition hover:bg-transparent hover:text-[#6366F1] sm:text-sm"
              : isDarkTheme
                ? "motion-fx-1-nav-button flex h-9 shrink-0 items-center bg-transparent px-0 text-xs font-medium text-slate-400 transition hover:bg-transparent hover:text-indigo-300 sm:text-sm"
                : "motion-fx-1-nav-button flex h-9 shrink-0 items-center bg-transparent px-0 text-xs font-medium text-slate-500 transition hover:bg-transparent hover:text-[#4F46E5] sm:text-sm"
            : isActive
              ? "motion-fx-1-nav-button flex h-9 shrink-0 items-center rounded-full bg-[#6366F1] px-3 text-xs font-semibold text-white sm:px-4 sm:text-sm"
              : isDarkTheme
                ? "motion-fx-1-nav-button flex h-9 shrink-0 items-center rounded-full px-3 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.08] hover:text-indigo-300 sm:px-4 sm:text-sm"
                : "motion-fx-1-nav-button flex h-9 shrink-0 items-center rounded-full px-3 text-xs font-semibold text-slate-500 transition hover:bg-[#EEF2FF] hover:text-[#4F46E5] sm:px-4 sm:text-sm";

        return (
          <Button
            key={tab}
            aria-current={isActive ? "page" : undefined}
            className={buttonClassName}
            title={tabCopy.description}
            type="button"
            variant="ghost"
            onClick={() => onTabChange(tab)}
          >
            <span>{tabCopy.label}</span>
            {tabCopy.stageLabel ? (
              <span
                className={
                  isActive
                    ? "ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                    : isDarkTheme
                      ? "ml-1 rounded-full bg-indigo-300/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-200"
                      : "ml-1 rounded-full bg-[#EEF2FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#4F46E5]"
                }
              >
                {tabCopy.stageLabel}
              </span>
            ) : null}
          </Button>
        );
      })}
    </nav>
  );
}
