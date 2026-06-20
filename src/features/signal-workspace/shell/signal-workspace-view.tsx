"use client";

import { SignalWorkspaceRuntime } from "../runtime/signal-workspace-runtime";
import {
  AccountManagementPanelWithWallet,
  CommunityConversionModal,
  CopyTradingPrototypeModalWithWallet,
  KolPanel,
  MobileKolBottomSheet,
  MobileTopSignalsBottomSheet,
  OnboardingGuide,
  RealtimeKlinePanel,
  ReferralDashboardPanel,
  SidebarCollapseButton,
  StrategyManagementPanel,
  StrategySquareProductTab,
  TopSignalsPanel,
  TopSignalsWorkspaceTabs,
  WorkspaceTopNavigation,
} from "../signal-workspace-helpers";

export function SignalWorkspaceView(runtime: SignalWorkspaceRuntime) {
  const {
    symbol,
    interval,
    chartFocusSignalRequestKey,
    theme,
    pnlColorMode,
    language,
    isOnboardingOpen,
    setIsOnboardingOpen,
    isMobileKolSheetOpen,
    setIsMobileKolSheetOpen,
    isMobileTopSignalsSheetOpen,
    setIsMobileTopSignalsSheetOpen,
    isRightPanelCollapsed,
    isRightPanelExiting,
    activeProductTab,
    isCommunityConversionOpen,
    setIsCommunityConversionOpen,
    isWorkspaceMotionVisible,
    marketOptions,
    activeTopSignalSourceId,
    topSignalsPanel,
    topSignalPerformanceWindow,
    setTopSignalPerformanceWindow,
    topSignalSortKey,
    setTopSignalSortKey,
    topSignalsSourceStatus,
    setLatestMarketCandleUpdate,
    workspaceNotification,
    setWorkspaceNotification,
    authMe,
    isAuthLoading,
    isTradingFoxLoading,
    isApiSetupOpen,
    setIsApiSetupOpen,
    prototypeApiConnections,
    activeAccountStrategyId,
    copyTradingTarget,
    setCopyTradingTarget,
    kolSignalSourceStatus,
    paperPositionErrorsBySymbol,
    startOnboardingGuide,
    handleTelegramDiscussionJoin,
    startTelegramLogin,
    handleLogout,
    handleCommunityModalJoin,
    toggleTheme,
    togglePnlColorMode,
    toggleLanguage,
    toggleRightPanel,
    handleSignalSelect,
    handleSymbolChange,
    handleProductTabChange,
    handleAccountEntry,
    handleAccountStrategyRouteChange,
    handleTopSignalSourceSelect,
    handleTopSignalSourceFilterChange,
    handleTopSignalPositionSelect,
    handleTopSignalTradeMarkerSelect,
    handleTopSignalsPanelChange,
    handleKolSourceWatchToggle,
    handleTopSignalSourceWatchToggle,
    handleCopyTradingRequest,
    handleMockStrategyCopy,
    handleTradingFoxConnectorBound,
    handlePrototypeConnectionSave,
    handlePrototypeConnectionDelete,
    handleApiSetupOpenChange,
    handlePrototypeStrategyStart,
    handlePrototypeStrategyCreate,
    handlePrototypeStrategyStatusChange,
    handlePrototypeStrategyDelete,
    handlePrototypeStrategySettingsUpdate,
    openCommunityConversion,
    isChartSplitProductTab,
    chartActiveSignal,
    chartActivePaperPosition,
    chartSignals,
    chartTradeMarkers,
    chartFocusTime,
    handleIntervalChange,
    handleFocusSignalRequestHandled,
    handleFocusTimeRequestHandled,
    pageClassName,
    workspaceBodyClassName,
    workspaceGridClassName,
    isCompactLayout,
    isAccountManagementTab,
    isReferralDashboardTab,
    isStrategyManagementTab,
    isStrategySquareTab,
    isTopSignalsKolPanel,
    isTopSignalsLeadPanel,
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
  const isMobileSignalPanelOpen =
    isMobileKolSheetOpen || isMobileTopSignalsSheetOpen;
  const setMobileSignalPanelOpen = (isOpen: boolean) => {
    setIsMobileKolSheetOpen(isOpen && isTopSignalsKolPanel);
    setIsMobileTopSignalsSheetOpen(isOpen && isTopSignalsLeadPanel);
  };

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
                isActivePaperPositionReady={isTopSignalsKolPanel && isActiveChartPaperPositionReady}
                activeSignal={chartActiveSignal}
                focusSignalRequestKey={chartFocusSignalRequestKey}
                focusTimeRequest={chartFocusTime}
                interval={interval}
                language={language}
                isCompactLayout={isCompactLayout}
                marketOptions={marketOptions}
                priceColorMode={pnlColorMode}
                signalBiasSummary={isTopSignalsLeadPanel ? topSignalsSignalBiasSummary : null}
                symbol={symbol}
                signals={chartSignals}
                theme={theme}
                tradeMarkers={chartTradeMarkers}
                onIntervalChange={handleIntervalChange}
                onSymbolChange={handleSymbolChange}
                onSignalSelect={handleSignalSelect}
                onFocusSignalRequestHandled={handleFocusSignalRequestHandled}
                onFocusTimeRequestHandled={handleFocusTimeRequestHandled}
                onMarketCandleUpdate={isTopSignalsKolPanel ? setLatestMarketCandleUpdate : undefined}
                onTradeMarkerSelect={isTopSignalsLeadPanel ? handleTopSignalTradeMarkerSelect : undefined}
              />
            </div>

            {!isRightPanelCollapsed || isRightPanelExiting ? (
              <div
                className={`kol-panel-shell motion-fx-10-delay-2 motion-fx-10-reveal motion-fx-7-secondary-panel relative hidden min-h-0 min-w-0 flex-col gap-3 lg:flex ${isWorkspaceMotionVisible ? "is-visible" : ""} ${isRightPanelExiting ? "is-exiting" : ""}`}
              >
                <TopSignalsWorkspaceTabs
                  activePanel={topSignalsPanel}
                  copy={copy}
                  isDarkTheme={isDarkTheme}
                  onPanelChange={handleTopSignalsPanelChange}
                />
                {isTopSignalsKolPanel ? (
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
                panelLabel={isTopSignalsKolPanel ? copy.kol.title : copy.workspace.topSignals.title}
                variant="edge-tab"
                onToggle={toggleRightPanel}
              />
            )}
          </section>
        ) : isAccountManagementTab ? (
          <AccountManagementPanelWithWallet
            apiConnection={prototypeApiConnection}
            apiConnections={prototypeApiConnections}
            copy={copy}
            isApiSetupOpen={isApiSetupOpen}
            isAuthLoading={isAuthLoading || isTradingFoxLoading}
            isDarkTheme={isDarkTheme}
            telegramUser={authMe.telegramUser}
            onApiSetupOpen={() => setIsApiSetupOpen(true)}
            onApiSetupOpenChange={handleApiSetupOpenChange}
            onConnectionDelete={handlePrototypeConnectionDelete}
            onConnectionSave={handlePrototypeConnectionSave}
            onHyperliquidAgentBound={handleTradingFoxConnectorBound}
            onLogin={startTelegramLogin}
            onLogout={handleLogout}
          />
        ) : isStrategyManagementTab ? (
          <StrategyManagementPanel
            activeStrategyId={activeAccountStrategyId}
            apiConnections={prototypeApiConnections}
            availableSignalSources={copyTradingSignalSourceTargets}
            copy={copy}
            isDarkTheme={isDarkTheme}
            strategies={prototypeStrategyList}
            telegramUser={authMe.telegramUser}
            onStrategyCreate={handlePrototypeStrategyCreate}
            onStrategyDelete={handlePrototypeStrategyDelete}
            onStrategyRouteChange={handleAccountStrategyRouteChange}
            onStrategySettingsUpdate={handlePrototypeStrategySettingsUpdate}
            onStrategyStatusChange={handlePrototypeStrategyStatusChange}
          />
        ) : isReferralDashboardTab ? (
          <ReferralDashboardPanel
            copy={copy}
            isAuthLoading={isAuthLoading}
            isDarkTheme={isDarkTheme}
            language={language}
            telegramUser={authMe.telegramUser}
            onLogin={startTelegramLogin}
          />
        ) : isStrategySquareTab ? (
          <StrategySquareProductTab
            copy={copy}
            isDarkTheme={isDarkTheme}
            language={language}
            pnlColorMode={pnlColorMode}
            onMockCopy={handleMockStrategyCopy}
          />
        ) : null}
      </div>
      {isCompactLayout && isTopSignalsKolPanel ? (
        <MobileKolBottomSheet
          activeSignal={activeSignal}
          activePanel={topSignalsPanel}
          copy={copy}
          isCompactLayout={isCompactLayout}
          isDarkTheme={isDarkTheme}
          isOpen={isMobileSignalPanelOpen}
          paperPositionErrorsBySymbol={paperPositionErrorsBySymbol}
          paperPositionsBySignalId={paperPositionsBySignalId}
          signals={kolSignals}
          sourceStatus={kolSignalSourceStatus}
          watchlistedSourceKeys={watchlistedKolSourceKeys}
          onFollowRequest={openCommunityConversion}
          onOpenChange={setMobileSignalPanelOpen}
          onPanelChange={handleTopSignalsPanelChange}
          onSourceWatchToggle={handleKolSourceWatchToggle}
          onSignalSelect={handleSignalSelect}
        />
      ) : null}
      {isCompactLayout && isTopSignalsLeadPanel ? (
        <MobileTopSignalsBottomSheet
          activeSourceId={activeTopSignalSourceId}
          activePanel={topSignalsPanel}
          copy={copy}
          isCompactLayout={isCompactLayout}
          isDarkTheme={isDarkTheme}
          isOpen={isMobileSignalPanelOpen}
          performanceWindow={topSignalPerformanceWindow}
          pnlColorMode={pnlColorMode}
          snapshot={topSignalsDisplaySnapshot}
          sortKey={topSignalSortKey}
          sourceFilterId={effectiveTopSignalsSourceFilterId}
          sourceStatus={topSignalsSourceStatus}
          watchlistedSourceIds={watchlistedTopSignalSourceIds}
          onOpenChange={setMobileSignalPanelOpen}
          onPanelChange={handleTopSignalsPanelChange}
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
