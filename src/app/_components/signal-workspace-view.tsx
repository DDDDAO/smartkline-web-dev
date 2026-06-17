"use client";

import { SignalWorkspaceRuntime } from "./signal-workspace-runtime";
import {
  AccountManagementPanelWithWallet,
  CommunityConversionModal,
  CopyTradingPrototypeModalWithWallet,
  KolPanel,
  KolFollowProductTab,
  MobileKolBottomSheet,
  MobileTopSignalsBottomSheet,
  OnboardingGuide,
  RealtimeKlinePanel,
  SidebarCollapseButton,
  StrategySquareProductTab,
  TopSignalsPanel,
  WorkspaceTopNavigation,
} from "./signal-workspace/signal-workspace-helpers";

export function SignalWorkspaceView(runtime: SignalWorkspaceRuntime) {
  const {
    symbol,
    setSymbol,
    interval,
    setInterval,
    activeSignalId,
    setActiveSignalId,
    chartFocusSignalRequestKey,
    setChartFocusSignalRequestKey,
    chartFocusTimeRequest,
    setChartFocusTimeRequest,
    theme,
    setTheme,
    pnlColorMode,
    setPnlColorMode,
    isPnlColorModeHydrated,
    setIsPnlColorModeHydrated,
    language,
    setLanguage,
    isOnboardingOpen,
    setIsOnboardingOpen,
    isMobileKolSheetOpen,
    setIsMobileKolSheetOpen,
    isMobileTopSignalsSheetOpen,
    setIsMobileTopSignalsSheetOpen,
    isRightPanelCollapsed,
    setIsRightPanelCollapsed,
    isRightPanelExiting,
    setIsRightPanelExiting,
    activeProductTab,
    setActiveProductTab,
    isProductTabHydrated,
    setIsProductTabHydrated,
    isCommunityConversionOpen,
    setIsCommunityConversionOpen,
    isWorkspaceMotionVisible,
    setIsWorkspaceMotionVisible,
    marketOptions,
    setMarketOptions,
    signals,
    setSignals,
    watchlist,
    setWatchlist,
    isWatchlistHydrated,
    setIsWatchlistHydrated,
    topSignalsSnapshot,
    setTopSignalsSnapshot,
    activeTopSignalSourceId,
    setActiveTopSignalSourceId,
    activeTopSignalTradeEventId,
    setActiveTopSignalTradeEventId,
    topSignalsSourceFilterId,
    setTopSignalsSourceFilterId,
    topSignalPerformanceWindow,
    setTopSignalPerformanceWindow,
    topSignalSortKey,
    setTopSignalSortKey,
    explicitTopSignalSourceId,
    setExplicitTopSignalSourceId,
    topSignalsSourceStatus,
    setTopSignalsSourceStatus,
    latestMarketCandleUpdate,
    setLatestMarketCandleUpdate,
    workspaceNotification,
    setWorkspaceNotification,
    authMe,
    setAuthMe,
    isAuthLoading,
    setIsAuthLoading,
    isTradingFoxLoading,
    setIsTradingFoxLoading,
    isTradingFoxAccountLoaded,
    setIsTradingFoxAccountLoaded,
    isApiSetupOpen,
    setIsApiSetupOpen,
    prototypeApiConnections,
    setPrototypeApiConnections,
    prototypeStrategies,
    setPrototypeStrategies,
    prototypeMarioStrategies,
    setPrototypeMarioStrategies,
    activeAccountStrategyId,
    setActiveAccountStrategyId,
    isMarioStrategiesHydrated,
    setIsMarioStrategiesHydrated,
    copyTradingTarget,
    setCopyTradingTarget,
    pendingCopyTradingTarget,
    setPendingCopyTradingTarget,
    kolSignalSourceStatus,
    setKolSignalSourceStatus,
    topSignalMiniTickerPricesBySymbol,
    paperPositionCandlesBySymbol,
    paperPositionErrorsBySymbol,
    paperPositionLatestPricesBySymbol,
    paperPositionMiniTickerPricesBySymbol,
    startOnboardingGuide,
    handleTelegramDiscussionJoin,
    startTelegramLogin,
    handleLogout,
    applyTradingFoxAccount,
    handleCommunityModalJoin,
    toggleTheme,
    togglePnlColorMode,
    setWorkspaceLanguage,
    toggleLanguage,
    applyWorkspaceRouteState,
    updateWorkspaceRouteUrl,
    toggleRightPanel,
    handleSignalSelect,
    handleSymbolChange,
    handleProductTabChange,
    handleAccountEntry,
    handleAccountStrategyRouteChange,
    handleTopSignalSourceSelect,
    handleTopSignalSourceFilterChange,
    handleTopSignalPositionSelect,
    handleTopSignalTradeSelect,
    handleTopSignalTradeMarkerSelect,
    handleKolSourceWatchToggle,
    handleTopSignalSourceWatchToggle,
    handleCopyTradingRequest,
    handleMockStrategyCopy,
    handleTradingFoxConnectorBound,
    handlePrototypeConnectionSave,
    handlePrototypeConnectionDelete,
    handleApiSetupOpenChange,
    requestPrototypeCopyStrategyStart,
    handlePrototypeStrategyStart,
    handlePrototypeStrategyCreate,
    handlePrototypeStrategyStatusChange,
    handlePrototypeStrategyDelete,
    handlePrototypeStrategySettingsUpdate,
    openCommunityConversion,
    handleKolCommunityConversionOpen,
    isChartSplitProductTab,
    chartActiveSignal,
    chartActivePaperPosition,
    chartSignals,
    chartTopSignalsTradeMarkers,
    chartTradeMarkers,
    chartFocusTime,
    handleIntervalChange,
    handleFocusSignalRequestHandled,
    handleFocusTimeRequestHandled,
    pageClassName,
    workspaceBodyClassName,
    workspaceGridClassName,
    isCompactLayout,
    isTopSignalsTab,
    isAccountManagementTab,
    isStrategySquareTab,
    isIntelTab,
    copy,
    isDarkTheme,
    topSignalsSignalBiasSummary,
    topSignalsDisplaySnapshot,
    effectiveTopSignalsSourceFilterId,
    kolSignals,
    watchlistedKolSourceKeys,
    watchlistedTopSignalSourceIds,
    copyTradingSignalSourceTargets,
    prototypeApiConnection,
    prototypeStrategyList,
    isActiveChartPaperPositionReady,
    activeSignal,
    paperPositionsBySignalId,
  } = runtime;

  return (
    <main className={pageClassName} data-compact-ui>
      <div
        className={`motion-fx-10-delay-0 motion-fx-10-reveal ${isWorkspaceMotionVisible ? "is-visible" : ""}`}
      >
        <WorkspaceTopNavigation
          activeProductTab={activeProductTab}
          copy={copy}
          isDarkTheme={isDarkTheme}
          language={language}
          notification={workspaceNotification}
          pnlColorMode={pnlColorMode}
          telegramUser={authMe.telegramUser}
          isAuthLoading={isAuthLoading || isTradingFoxLoading}
          onAccountOpen={handleAccountEntry}
          onCommunityOpen={handleTelegramDiscussionJoin}
          onGuideOpen={startOnboardingGuide}
          onLanguageToggle={toggleLanguage}
          onNotificationDismiss={() => setWorkspaceNotification(null)}
          onProductTabChange={handleProductTabChange}
          onPnlColorModeToggle={togglePnlColorMode}
          onThemeToggle={toggleTheme}
        />
      </div>
      <div className={workspaceBodyClassName}>
        {isChartSplitProductTab ? (
          <section
            className={workspaceGridClassName}
            data-right-panel-collapsed={String(isRightPanelCollapsed)}
          >
            <div
              className={`motion-fx-10-delay-1 motion-fx-10-reveal motion-fx-7-primary-panel flex min-w-0 w-full lg:h-full lg:min-h-0 ${isWorkspaceMotionVisible ? "is-visible" : ""}`}
            >
              <RealtimeKlinePanel
                key={`${symbol}-${interval}`}
                activePaperPosition={chartActivePaperPosition}
                isActivePaperPositionReady={isIntelTab && isActiveChartPaperPositionReady}
                activeSignal={chartActiveSignal}
                focusSignalRequestKey={chartFocusSignalRequestKey}
                focusTimeRequest={chartFocusTime}
                interval={interval}
                language={language}
                isCompactLayout={isCompactLayout}
                marketOptions={marketOptions}
                priceColorMode={pnlColorMode}
                signalBiasSummary={isTopSignalsTab ? topSignalsSignalBiasSummary : null}
                symbol={symbol}
                signals={chartSignals}
                theme={theme}
                tradeMarkers={chartTradeMarkers}
                onIntervalChange={handleIntervalChange}
                onSymbolChange={handleSymbolChange}
                onSignalSelect={handleSignalSelect}
                onFocusSignalRequestHandled={handleFocusSignalRequestHandled}
                onFocusTimeRequestHandled={handleFocusTimeRequestHandled}
                onMarketCandleUpdate={isIntelTab ? setLatestMarketCandleUpdate : undefined}
                onTradeMarkerSelect={isTopSignalsTab ? handleTopSignalTradeMarkerSelect : undefined}
              />
            </div>

            {!isRightPanelCollapsed || isRightPanelExiting ? (
              <div
                className={`kol-panel-shell motion-fx-10-delay-2 motion-fx-10-reveal motion-fx-7-secondary-panel relative hidden min-h-0 min-w-0 flex-col gap-3 lg:flex ${isWorkspaceMotionVisible ? "is-visible" : ""} ${isRightPanelExiting ? "is-exiting" : ""}`}
              >
                {isIntelTab ? (
                  <KolPanel
                    activeSignal={activeSignal}
                    headerAction={
                      <SidebarCollapseButton
                        copy={copy}
                        isCollapsed={isRightPanelCollapsed}
                        isDarkTheme={isDarkTheme}
                        panelLabel={copy.kol.title}
                        variant="header"
                        onToggle={toggleRightPanel}
                      />
                    }
                    copy={copy}
                    isDarkTheme={isDarkTheme}
                    paperPositionErrorsBySymbol={paperPositionErrorsBySymbol}
                    paperPositionsBySignalId={paperPositionsBySignalId}
                    sourceStatus={kolSignalSourceStatus}
                    signals={kolSignals}
                    watchlistedSourceKeys={watchlistedKolSourceKeys}
                    onFollowRequest={openCommunityConversion}
                    onSourceWatchToggle={handleKolSourceWatchToggle}
                    onSignalSelect={handleSignalSelect}
                  />
                ) : (
                  <TopSignalsPanel
                    activeSourceId={activeTopSignalSourceId}
                    copy={copy}
                    headerAction={
                      <SidebarCollapseButton
                        copy={copy}
                        isCollapsed={isRightPanelCollapsed}
                        isDarkTheme={isDarkTheme}
                        panelLabel={copy.workspace.topSignals.title}
                        variant="header"
                        onToggle={toggleRightPanel}
                      />
                    }
                    isDarkTheme={isDarkTheme}
                    performanceWindow={topSignalPerformanceWindow}
                    pnlColorMode={pnlColorMode}
                    snapshot={topSignalsDisplaySnapshot}
                    sortKey={topSignalSortKey}
                    sourceFilterId={effectiveTopSignalsSourceFilterId}
                    sourceStatus={topSignalsSourceStatus}
                    watchlistedSourceIds={watchlistedTopSignalSourceIds}
                    onPositionSelect={handleTopSignalPositionSelect}
                    onSourceFilterChange={handleTopSignalSourceFilterChange}
                    onSourceSelect={handleTopSignalSourceSelect}
                    onSourceWatchToggle={handleTopSignalSourceWatchToggle}
                    onCopyTradingRequest={handleCopyTradingRequest}
                    onPerformanceWindowChange={setTopSignalPerformanceWindow}
                    onSortKeyChange={setTopSignalSortKey}
                  />
                )}
              </div>
            ) : (
              <SidebarCollapseButton
                copy={copy}
                isCollapsed={isRightPanelCollapsed}
                isDarkTheme={isDarkTheme}
                panelLabel={isTopSignalsTab ? copy.workspace.topSignals.title : copy.kol.title}
                variant="edge-tab"
                onToggle={toggleRightPanel}
              />
            )}
          </section>
        ) : isAccountManagementTab ? (
          <AccountManagementPanelWithWallet
            activeStrategyId={activeAccountStrategyId}
            apiConnection={prototypeApiConnection}
            apiConnections={prototypeApiConnections}
            availableSignalSources={copyTradingSignalSourceTargets}
            copy={copy}
            isApiSetupOpen={isApiSetupOpen}
            isAuthLoading={isAuthLoading || isTradingFoxLoading}
            isDarkTheme={isDarkTheme}
            telegramUser={authMe.telegramUser}
            strategies={prototypeStrategyList}
            onApiSetupOpen={() => setIsApiSetupOpen(true)}
            onApiSetupOpenChange={handleApiSetupOpenChange}
            onConnectionDelete={handlePrototypeConnectionDelete}
            onConnectionSave={handlePrototypeConnectionSave}
            onHyperliquidAgentBound={handleTradingFoxConnectorBound}
            onLogin={startTelegramLogin}
            onLogout={handleLogout}
            onStrategyCreate={handlePrototypeStrategyCreate}
            onStrategyDelete={handlePrototypeStrategyDelete}
            onStrategyRouteChange={handleAccountStrategyRouteChange}
            onStrategySettingsUpdate={handlePrototypeStrategySettingsUpdate}
            onStrategyStatusChange={handlePrototypeStrategyStatusChange}
          />
        ) : isStrategySquareTab ? (
          <StrategySquareProductTab
            copy={copy}
            isDarkTheme={isDarkTheme}
            language={language}
            pnlColorMode={pnlColorMode}
            onMockCopy={handleMockStrategyCopy}
          />
        ) : (
          <KolFollowProductTab
            copy={copy}
            isDarkTheme={isDarkTheme}
            paperPositionsBySignalId={paperPositionsBySignalId}
            signals={kolSignals}
            watchlistedSourceKeys={watchlistedKolSourceKeys}
            onCommunityConversionOpen={handleKolCommunityConversionOpen}
            onKolSourceWatchToggle={handleKolSourceWatchToggle}
            onSignalSelect={handleSignalSelect}
          />
        )}
      </div>
      {isCompactLayout && isIntelTab ? (
        <MobileKolBottomSheet
          activeSignal={activeSignal}
          copy={copy}
          isCompactLayout={isCompactLayout}
          isDarkTheme={isDarkTheme}
          isOpen={isMobileKolSheetOpen}
          paperPositionErrorsBySymbol={paperPositionErrorsBySymbol}
          paperPositionsBySignalId={paperPositionsBySignalId}
          signals={kolSignals}
          sourceStatus={kolSignalSourceStatus}
          watchlistedSourceKeys={watchlistedKolSourceKeys}
          onFollowRequest={openCommunityConversion}
          onOpenChange={setIsMobileKolSheetOpen}
          onSourceWatchToggle={handleKolSourceWatchToggle}
          onSignalSelect={handleSignalSelect}
        />
      ) : null}
      {isCompactLayout && isTopSignalsTab ? (
        <MobileTopSignalsBottomSheet
          activeSourceId={activeTopSignalSourceId}
          copy={copy}
          isCompactLayout={isCompactLayout}
          isDarkTheme={isDarkTheme}
          isOpen={isMobileTopSignalsSheetOpen}
          performanceWindow={topSignalPerformanceWindow}
          pnlColorMode={pnlColorMode}
          snapshot={topSignalsDisplaySnapshot}
          sortKey={topSignalSortKey}
          sourceFilterId={effectiveTopSignalsSourceFilterId}
          sourceStatus={topSignalsSourceStatus}
          watchlistedSourceIds={watchlistedTopSignalSourceIds}
          onOpenChange={setIsMobileTopSignalsSheetOpen}
          onPositionSelect={handleTopSignalPositionSelect}
          onSourceFilterChange={handleTopSignalSourceFilterChange}
          onSourceSelect={handleTopSignalSourceSelect}
          onSourceWatchToggle={handleTopSignalSourceWatchToggle}
          onCopyTradingRequest={handleCopyTradingRequest}
          onPerformanceWindowChange={setTopSignalPerformanceWindow}
          onSortKeyChange={setTopSignalSortKey}
        />
      ) : null}
      {copyTradingTarget ? (
        <CopyTradingPrototypeModalWithWallet
          key={copyTradingTarget.trader.trader_id}
          apiConnection={prototypeApiConnection}
          apiConnections={prototypeApiConnections}
          copy={copy}
          isDarkTheme={isDarkTheme}
          strategies={prototypeStrategyList}
          target={copyTradingTarget}
          onClose={() => setCopyTradingTarget(null)}
          onStart={handlePrototypeStrategyStart}
        />
      ) : null}
      <OnboardingGuide
        copy={copy.onboarding}
        isCompactLayout={isCompactLayout}
        isDarkTheme={isDarkTheme}
        isOpen={isOnboardingOpen}
        onMobileKolSheetOpenChange={setIsMobileKolSheetOpen}
        onComplete={() => {
          setIsOnboardingOpen(false);
          if (isCompactLayout) {
            setIsMobileKolSheetOpen(false);
          }
        }}
      />
      {isCommunityConversionOpen ? (
        <CommunityConversionModal
          copy={copy}
          isDarkTheme={isDarkTheme}
          onClose={() => setIsCommunityConversionOpen(false)}
          onCommunityOpen={handleCommunityModalJoin}
        />
      ) : null}
    </main>
  );
}
