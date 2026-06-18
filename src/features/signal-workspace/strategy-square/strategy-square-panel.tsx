import { useMemo, useState } from "react";

import type { WorkspaceCopy, WorkspaceLanguage } from "@/i18n/workspace";
import type { PnlColorMode } from "../top-signals-panel";
import {
  ALL_PROJECTS_PAGE_SIZE,
  ALL_TYPE_FILTER,
  MOCK_STRATEGIES,
  SORT_KEYS,
  STRATEGY_CARD_GRID_STYLE,
  STRATEGY_TYPE_FILTERS,
  STRATEGY_WINDOWS,
  type StrategySquareItem,
  type StrategySquareSortKey,
  type StrategySquareStoreTab,
  type StrategySquareTypeFilter,
  type StrategySquareWindow,
} from "./strategy-square-data";
import {
  createRecommendationSections,
  compareStrategies,
  getMockBadgeClassName,
  getStrategyContent,
} from "./strategy-square-logic";
import {
  RecommendedStrategySection,
  StrategyFilterSelect,
  StrategyMarketplaceCard,
  StrategyPagination,
  StrategyParameterModal,
  StrategyStoreTabs,
} from "./strategy-square-ui";

export function StrategySquareProductTab({
  copy,
  isDarkTheme,
  language,
  pnlColorMode,
  onMockCopy,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  pnlColorMode: PnlColorMode;
  onMockCopy?: (strategyName: string) => void;
}) {
  const panelCopy = copy.workspace.strategySquare;
  const [activeStoreTab, setActiveStoreTab] = useState<StrategySquareStoreTab>("recommended");
  const [activeType, setActiveType] = useState<StrategySquareTypeFilter>(ALL_TYPE_FILTER);
  const [activeWindow, setActiveWindow] = useState<StrategySquareWindow>("30d");
  const [allProjectsPage, setAllProjectsPage] = useState(1);
  const [copiedStrategyId, setCopiedStrategyId] = useState("");
  const [detailStrategyId, setDetailStrategyId] = useState("");
  const [sortKey, setSortKey] = useState<StrategySquareSortKey>("profit");
  const visibleStrategies = useMemo(
    () => MOCK_STRATEGIES
      .filter((strategy) => activeType === ALL_TYPE_FILTER || strategy.type === activeType)
      .slice()
      .sort((left, right) => compareStrategies(left, right, sortKey, activeWindow)),
    [activeType, activeWindow, sortKey],
  );
  const recommendationSections = useMemo(
    () => createRecommendationSections(MOCK_STRATEGIES, panelCopy),
    [panelCopy],
  );
  const allProjectsPageCount = Math.max(1, Math.ceil(visibleStrategies.length / ALL_PROJECTS_PAGE_SIZE));
  const safeAllProjectsPage = Math.min(allProjectsPage, allProjectsPageCount);
  const paginatedStrategies = useMemo(() => {
    const startIndex = (safeAllProjectsPage - 1) * ALL_PROJECTS_PAGE_SIZE;
    return visibleStrategies.slice(startIndex, startIndex + ALL_PROJECTS_PAGE_SIZE);
  }, [safeAllProjectsPage, visibleStrategies]);
  const detailStrategy = MOCK_STRATEGIES.find((strategy) => strategy.id === detailStrategyId) ?? null;
  const shellClassName = "h-full min-h-0 p-3 pb-28 lg:p-4 lg:pb-4";
  const panelClassName = isDarkTheme
    ? "flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/[0.075] bg-[#181A20]"
    : "flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-[#E5EAF0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.035)]";
  const heroClassName = isDarkTheme
    ? "relative overflow-hidden border-b border-white/[0.075] bg-[#181A20] p-4 sm:p-5"
    : "relative overflow-hidden border-b border-[#E5EAF0] bg-white p-4 sm:p-5";
  const scrollClassName = isDarkTheme
    ? "kol-scroll-area kol-scroll-area-dark min-h-0 flex-1 overflow-y-auto bg-[#12161D] p-3 sm:p-4"
    : "kol-scroll-area min-h-0 flex-1 overflow-y-auto bg-[#FAFBFD] p-3 sm:p-4";

  const handleCopy = (strategy: StrategySquareItem) => {
    const content = getStrategyContent(strategy, language);
    setCopiedStrategyId(strategy.id);
    onMockCopy?.(content.name);
  };
  const handleTypeChange = (value: string) => {
    setActiveType(value as StrategySquareTypeFilter);
    setAllProjectsPage(1);
  };
  const handleWindowChange = (value: string) => {
    setActiveWindow(value as StrategySquareWindow);
    setAllProjectsPage(1);
  };
  const handleSortChange = (value: string) => {
    setSortKey(value as StrategySquareSortKey);
    setAllProjectsPage(1);
  };
  const handleAllProjectsPageChange = (page: number) => {
    setAllProjectsPage(Math.min(Math.max(1, page), allProjectsPageCount));
  };

  return (
    <section className={shellClassName}>
      <div className={panelClassName}>
        <div className={heroClassName}>
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#00A6F4]/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-20 w-40 rounded-full bg-[#00A6F4]/10 blur-3xl" />
          <div className="relative flex flex-col items-start gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className={isDarkTheme ? "text-2xl font-black tracking-tight text-slate-50 sm:text-3xl" : "text-2xl font-black tracking-tight text-slate-950 sm:text-3xl"}>
                  {panelCopy.heroTitle}
                </h1>
                <span className={getMockBadgeClassName(isDarkTheme)}>{panelCopy.mockBadge}</span>
              </div>
            </div>
            <div className="w-full sm:w-[340px]">
              <StrategyStoreTabs
                activeTab={activeStoreTab}
                copy={copy}
                isDarkTheme={isDarkTheme}
                onTabChange={setActiveStoreTab}
              />
            </div>
          </div>
        </div>

        <div className={scrollClassName}>
          {activeStoreTab === "recommended" ? (
            <div className="grid gap-7">
              {recommendationSections.map((section) => (
                <RecommendedStrategySection
                  key={section.key}
                  copiedStrategyId={copiedStrategyId}
                  copy={copy}
                  isDarkTheme={isDarkTheme}
                  language={language}
                  pnlColorMode={pnlColorMode}
                  section={section}
                  onCopy={handleCopy}
                  onDetailsOpen={setDetailStrategyId}
                  onMore={() => {
                    setSortKey(section.sortKey);
                    setAllProjectsPage(1);
                    setActiveStoreTab("allProjects");
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
                <StrategyFilterSelect
                  isDarkTheme={isDarkTheme}
                  label={panelCopy.strategyTypeFilter}
                  options={STRATEGY_TYPE_FILTERS.map((typeFilter) => ({
                    label: typeFilter === "all" ? panelCopy.allTypes : panelCopy.strategyTypes[typeFilter],
                    value: typeFilter,
                  }))}
                  value={activeType}
                  onChange={handleTypeChange}
                />
                <StrategyFilterSelect
                  isDarkTheme={isDarkTheme}
                  label={panelCopy.windowFilter}
                  options={STRATEGY_WINDOWS.map((window) => ({
                    label: panelCopy.windows[window],
                    value: window,
                  }))}
                  value={activeWindow}
                  onChange={handleWindowChange}
                />
                <StrategyFilterSelect
                  isDarkTheme={isDarkTheme}
                  label={panelCopy.sortBy}
                  options={SORT_KEYS.map((nextSortKey) => ({
                    label: panelCopy.sortOptions[nextSortKey],
                    value: nextSortKey,
                  }))}
                  value={sortKey}
                  onChange={handleSortChange}
                />
              </div>
              <div className="grid justify-start gap-3" style={STRATEGY_CARD_GRID_STYLE}>
                {paginatedStrategies.map((strategy) => (
                  <StrategyMarketplaceCard
                    key={strategy.id}
                    copiedStrategyId={copiedStrategyId}
                    copy={copy}
                    isDarkTheme={isDarkTheme}
                    language={language}
                    pnlColorMode={pnlColorMode}
                    strategy={strategy}
                    variant="grid"
                    window={activeWindow}
                    onCopy={handleCopy}
                    onDetailsOpen={setDetailStrategyId}
                  />
                ))}
              </div>
              <StrategyPagination
                currentPage={safeAllProjectsPage}
                isDarkTheme={isDarkTheme}
                pageSize={ALL_PROJECTS_PAGE_SIZE}
                totalPages={allProjectsPageCount}
                copy={copy}
                onPageChange={handleAllProjectsPageChange}
              />
            </div>
          )}
        </div>
      </div>

      {detailStrategy ? (
        <StrategyParameterModal
          copiedStrategyId={copiedStrategyId}
          copy={copy}
          isDarkTheme={isDarkTheme}
          language={language}
          pnlColorMode={pnlColorMode}
          strategy={detailStrategy}
          window={activeWindow}
          onClose={() => setDetailStrategyId("")}
          onCopy={handleCopy}
        />
      ) : null}
    </section>
  );
}
