"use client";

import Image from "next/image";
import { flushSync } from "react-dom";

import type { TelegramAuthMeResponse } from "@/app/_lib/auth/telegram-auth";
import type { WorkspaceCopy, WorkspaceLanguage } from "@/app/_lib/i18n";
import { AccountEntryButton } from "./account-entry-button";
import { WorkspaceProductTabs, type WorkspaceProductTab } from "./product-tabs";
import {
  ChevronLeftIcon,
  GuideSparkIcon,
  LanguagesIcon,
  MoonIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  SunIcon,
  TelegramIcon,
} from "./signal-workspace-helpers-icons";
import { WorkspaceNotificationBanner } from "./signal-workspace-helpers-notifications";
import type { WorkspaceNotification } from "./signal-workspace-helpers-constants";
import type { PnlColorMode } from "./top-signals-panel";

export function WorkspaceTopNavigation({
  activeProductTab,
  copy,
  isDarkTheme,
  language,
  notification,
  pnlColorMode,
  telegramUser,
  isAuthLoading,
  onCommunityOpen,
  onGuideOpen,
  onLanguageToggle,
  onNotificationDismiss,
  onAccountOpen,
  onProductTabChange,
  onPnlColorModeToggle,
  onThemeToggle,
}: {
  activeProductTab: WorkspaceProductTab;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  notification: WorkspaceNotification | null;
  pnlColorMode: PnlColorMode;
  telegramUser: TelegramAuthMeResponse["telegramUser"];
  isAuthLoading: boolean;
  onAccountOpen: () => void;
  onCommunityOpen: () => void;
  onGuideOpen: () => void;
  onLanguageToggle: () => void;
  onNotificationDismiss: () => void;
  onProductTabChange: (tab: WorkspaceProductTab) => void;
  onPnlColorModeToggle: () => void;
  onThemeToggle: () => void;
}) {
  const headerClassName = isDarkTheme
    ? "relative z-50 flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-white/[0.075] bg-[#0B0E11]/95 px-3 py-2 backdrop-blur-xl sm:px-5 lg:flex-nowrap lg:gap-6"
    : "relative z-50 flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[#E5EAF0] bg-white/95 px-3 py-2 backdrop-blur-xl sm:px-5 lg:flex-nowrap lg:gap-6";
  const actionRailClassName = isDarkTheme
    ? "relative flex shrink-0 items-center justify-end gap-1 rounded-full border border-white/[0.075] bg-white/[0.035] p-1 sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0"
    : "relative flex shrink-0 items-center justify-end gap-1 rounded-full border border-[#E5EAF0] bg-[#F8FAFC] p-1 shadow-sm sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none";

  return (
    <header className={headerClassName}>
      <div className="flex min-w-0 flex-1 items-center gap-8 lg:flex-none">
        <BrandLogo copy={copy} isDarkTheme={isDarkTheme} language={language} />
      </div>
      <div className="order-3 flex w-full min-w-0 items-center gap-7 overflow-x-auto lg:order-none lg:w-auto lg:flex-1">
        <WorkspaceProductTabs
          activeTab={activeProductTab}
          copy={copy}
          isDarkTheme={isDarkTheme}
          variant="topbar"
          onTabChange={onProductTabChange}
        />
        <nav
          aria-label={copy.workspace.navAria}
          className="flex shrink-0 items-center gap-4"
        >
          <TelegramCommunityButton
            copy={copy}
            isDarkTheme={isDarkTheme}
            onCommunityOpen={onCommunityOpen}
          />
        </nav>
      </div>
      <div className={actionRailClassName}>
        <GuideIconButton
          copy={copy}
          isDarkTheme={isDarkTheme}
          onGuideOpen={onGuideOpen}
        />
        <AnimatedThemeToggler
          copy={copy}
          isCollapsed
          isDarkTheme={isDarkTheme}
          onThemeToggle={onThemeToggle}
        />
        <PnlColorModeToggleButton
          copy={copy}
          isDarkTheme={isDarkTheme}
          pnlColorMode={pnlColorMode}
          onToggle={onPnlColorModeToggle}
        />
        <LanguageToggleButton
          copy={copy}
          isDarkTheme={isDarkTheme}
          language={language}
          onLanguageToggle={onLanguageToggle}
        />
        <AccountEntryButton
          copy={copy}
          isAuthLoading={isAuthLoading}
          isDarkTheme={isDarkTheme}
          telegramUser={telegramUser}
          onOpen={onAccountOpen}
        />
        {notification ? (
          <div className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4.75rem)] z-[95] mx-auto w-auto max-w-[440px] sm:inset-x-auto sm:right-5 sm:top-20 sm:mx-0 sm:w-[min(440px,calc(100vw-2rem))]">
            <WorkspaceNotificationBanner
              copy={copy}
              isDarkTheme={isDarkTheme}
              notification={notification}
              onDismiss={onNotificationDismiss}
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function BrandLogo({
  copy,
  isDarkTheme,
  language,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
}) {
  const wrapperClassName =
    "motion-fx-1-brand flex h-[42px] max-w-[min(46vw,156px)] shrink-0 items-center gap-[6px] overflow-hidden rounded-xl px-0 py-1 sm:h-[54px] sm:max-w-none sm:gap-[7px]";
  const isEnglish = language === "en-US";
  const logoAlt = copy.workspace.brandAlt;
  const wordmarkSrc = isEnglish
    ? isDarkTheme
      ? "/logo-wordmark-en-dark.svg"
      : "/logo-wordmark-en-light.svg"
    : isDarkTheme
      ? "/logo-wordmark-zh-dark.svg"
      : "/logo-wordmark-zh-light.svg";

  return (
    <div aria-label={logoAlt} className={wrapperClassName}>
      <Image
        priority
        unoptimized
        alt=""
        aria-hidden="true"
        className="h-8 w-8 shrink-0 object-contain sm:h-[39.6px] sm:w-[39.6px]"
        height={64}
        src="/logo-mark.svg"
        width={64}
      />
      <Image
        priority
        unoptimized
        alt={logoAlt}
        className="h-8 w-auto object-contain object-left sm:h-[39.6px]"
        height={64}
        src={wordmarkSrc}
        width={isEnglish ? 240 : 160}
      />
    </div>
  );
}

export function TelegramCommunityButton({
  copy,
  isDarkTheme,
  onCommunityOpen,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  onCommunityOpen: () => void;
}) {
  const className = isDarkTheme
    ? "group motion-fx-1-nav-button flex h-10 items-center gap-2 overflow-visible rounded-full border border-sky-300/24 bg-[#00A6F4] px-3 text-sm font-semibold text-white transition-none hover:bg-[#00A6F4] hover:shadow-none active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
    : "group motion-fx-1-nav-button flex h-10 items-center gap-2 overflow-visible rounded-full border border-[#00A6F4]/20 bg-[#00A6F4] px-3 text-sm font-semibold text-white transition-none hover:bg-[#00A6F4] hover:shadow-none active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#229ED9]";
  const slugClassName = "max-w-0 overflow-hidden whitespace-nowrap text-xs font-normal text-white/86 opacity-0 transition-[max-width,opacity,margin] duration-200 ease-out group-hover:ml-1 group-hover:max-w-28 group-hover:opacity-100 group-focus-visible:ml-1 group-focus-visible:max-w-28 group-focus-visible:opacity-100";

  return (
    <button
      aria-label={`${copy.workspace.community} - ${copy.workspace.communitySlug}`}
      className={className}
      title={`${copy.workspace.community} - ${copy.workspace.communitySlug}`}
      type="button"
      onClick={onCommunityOpen}
    >
      <TelegramIcon className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">{copy.workspace.community}</span>
      <span aria-hidden="true" className={slugClassName}>
        {copy.workspace.communitySlug}
      </span>
    </button>
  );
}

export function GuideIconButton({
  copy,
  isDarkTheme,
  onGuideOpen,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  onGuideOpen: () => void;
}) {
  const className = isDarkTheme
    ? "group motion-fx-1-nav-button flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/[0.075] bg-white/[0.035] px-0 text-sm font-medium text-slate-300 transition-[width,transform,background-color,border-color,color,padding] duration-200 ease-out active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 sm:h-10 sm:w-10 sm:hover:w-[104px] sm:hover:border-white/[0.11] sm:hover:bg-white/[0.08] sm:hover:px-3 sm:hover:text-slate-50 sm:focus-visible:w-[104px] sm:focus-visible:px-3"
    : "group motion-fx-1-nav-button flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[#E5EAF0] bg-white px-0 text-sm font-medium text-slate-500 transition-[width,transform,background-color,border-color,color,padding] duration-200 ease-out active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#229ED9] sm:h-10 sm:w-10 sm:hover:w-[104px] sm:hover:border-[#B7E8FC] sm:hover:bg-[#EAF8FE]/70 sm:hover:px-3 sm:hover:text-slate-950 sm:focus-visible:w-[104px] sm:focus-visible:px-3";

  return (
    <button
      aria-label={copy.workspace.guide}
      className={className}
      title={copy.workspace.guide}
      type="button"
      onClick={onGuideOpen}
    >
      <GuideSparkIcon className="h-4 w-4 shrink-0" />
      <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap text-xs font-normal opacity-0 transition-[max-width,opacity,margin] duration-200 ease-out sm:group-hover:ml-2 sm:group-hover:max-w-16 sm:group-hover:opacity-100 sm:group-focus-visible:ml-2 sm:group-focus-visible:max-w-16 sm:group-focus-visible:opacity-100">
        {copy.workspace.guide}
      </span>
    </button>
  );
}

export function LanguageToggleButton({
  copy,
  isDarkTheme,
  language,
  onLanguageToggle,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  onLanguageToggle: () => void;
}) {
  const className = isDarkTheme
    ? "motion-fx-1-nav-button flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/[0.075] bg-white/[0.035] text-slate-300 transition hover:bg-white/[0.08] hover:text-slate-50 sm:h-10 sm:w-10"
    : "motion-fx-1-nav-button flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[#E5EAF0] bg-white text-slate-600 transition hover:border-[#B7E8FC] hover:bg-[#EAF8FE]/70 hover:text-[#007DB8] sm:h-10 sm:w-10";

  return (
    <button
      aria-label={copy.workspace.languageTitle[language === "zh-CN" ? "en-US" : "zh-CN"]}
      className={className}
      title={copy.workspace.languageTitle[language === "zh-CN" ? "en-US" : "zh-CN"]}
      type="button"
      onClick={onLanguageToggle}
    >
      <LanguagesIcon className="h-4 w-4" />
    </button>
  );
}

export function AnimatedThemeToggler({
  copy,
  isCollapsed,
  isDarkTheme,
  onThemeToggle,
}: {
  copy: WorkspaceCopy;
  isCollapsed: boolean;
  isDarkTheme: boolean;
  onThemeToggle: () => void;
}) {
  const className = isDarkTheme
    ? `motion-fx-1-nav-button ${isCollapsed ? "grid h-8 w-8 place-items-center sm:h-10 sm:w-10" : "flex h-10 w-full items-center gap-3 px-2.5"} rounded-full border border-white/[0.075] bg-white/[0.035] text-sm font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-slate-50`
    : `motion-fx-1-nav-button ${isCollapsed ? "grid h-8 w-8 place-items-center sm:h-10 sm:w-10" : "flex h-10 w-full items-center gap-3 px-2.5"} rounded-full border border-[#E5EAF0] bg-white text-sm font-medium text-slate-500 transition hover:border-[#B7E8FC] hover:bg-[#EAF8FE]/70 hover:text-slate-950`;

  return (
    <button
      aria-label={isDarkTheme ? copy.workspace.themeSwitchToLight : copy.workspace.themeSwitchToDark}
      className={className}
      type="button"
      onClick={(event) => {
        const originX = event.clientX;
        const originY = event.clientY;

        if (!document.startViewTransition) {
          onThemeToggle();
          return;
        }

        const transition = document.startViewTransition(() => {
          flushSync(onThemeToggle);
        });

        void transition.ready.then(() => {
          const endRadius = Math.hypot(
            Math.max(originX, window.innerWidth - originX),
            Math.max(originY, window.innerHeight - originY),
          );

          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${originX}px ${originY}px)`,
                `circle(${endRadius}px at ${originX}px ${originY}px)`,
              ],
            },
            {
              duration: 820,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-new(root)",
            },
          );

          document.documentElement.animate(
            { opacity: [1, 0.82, 0] },
            {
              duration: 820,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-old(root)",
            },
          );
        });
      }}
    >
      <ThemeToggleIcon isDarkTheme={isDarkTheme} />
      {!isCollapsed ? (
        <span>{isDarkTheme ? copy.workspace.themeLight : copy.workspace.themeDark}</span>
      ) : null}
    </button>
  );
}

export function ThemeToggleIcon({ isDarkTheme }: { isDarkTheme: boolean }) {
  return isDarkTheme ? (
    <SunIcon className="h-4 w-4" />
  ) : (
    <MoonIcon className="h-4 w-4" />
  );
}

export function isPnlColorMode(value: unknown): value is PnlColorMode {
  return value === "positiveGreen" || value === "positiveRed";
}

export function PnlColorModeToggleButton({
  copy,
  isDarkTheme,
  pnlColorMode,
  onToggle,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  pnlColorMode: PnlColorMode;
  onToggle: () => void;
}) {
  const className = isDarkTheme
    ? "motion-fx-1-nav-button grid h-8 w-8 place-items-center rounded-full border border-white/[0.075] bg-white/[0.035] text-xs font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-slate-50 sm:h-10 sm:w-10"
    : "motion-fx-1-nav-button grid h-8 w-8 place-items-center rounded-full border border-[#E5EAF0] bg-white text-xs font-black text-slate-500 transition hover:border-[#B7E8FC] hover:bg-[#EAF8FE]/70 hover:text-slate-950 sm:h-10 sm:w-10";
  const title = pnlColorMode === "positiveGreen"
    ? copy.workspace.pnlColorSwitchToPositiveRed
    : copy.workspace.pnlColorSwitchToPositiveGreen;
  const leadingClassName = pnlColorMode === "positiveGreen" ? "text-emerald-500" : "text-rose-500";
  const trailingClassName = pnlColorMode === "positiveGreen" ? "text-rose-500" : "text-emerald-500";

  return (
    <button
      aria-label={title}
      className={className}
      title={title}
      type="button"
      onClick={onToggle}
    >
      <span aria-hidden="true" className="flex items-center gap-0.5">
        <span className={leadingClassName}>+</span>
        <span className="text-slate-400">/</span>
        <span className={trailingClassName}>−</span>
      </span>
    </button>
  );
}

export function SidebarCollapseButton({
  copy,
  isCollapsed,
  isDarkTheme,
  panelLabel,
  variant = "header",
  onToggle,
}: {
  copy: WorkspaceCopy;
  isCollapsed: boolean;
  isDarkTheme: boolean;
  panelLabel?: string;
  variant?: "header" | "edge-tab";
  onToggle: () => void;
}) {
  const resolvedPanelLabel = panelLabel ?? copy.kol.title;
  const label = isCollapsed ? resolvedPanelLabel : copy.workspace.collapse;
  const edgeLabel = isCollapsed ? resolvedPanelLabel : copy.workspace.edgePanel;

  if (variant === "edge-tab") {
    const className = isDarkTheme
      ? "kol-edge-tab group fixed right-0 top-1/2 z-[60] hidden h-14 w-8 -translate-y-1/2 overflow-hidden rounded-l-2xl border border-r-0 border-white/[0.075] bg-[#181A20]/96 text-slate-200 backdrop-blur-xl transition-[width,transform,background-color,border-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:w-[116px] hover:-translate-x-0.5 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-slate-50 active:scale-[0.98] lg:flex"
      : "kol-edge-tab group fixed right-0 top-1/2 z-[60] hidden h-14 w-8 -translate-y-1/2 overflow-hidden rounded-l-2xl border border-r-0 border-[#BFE7FB] bg-[#F4FBFF] text-slate-700 backdrop-blur-xl transition-[width,transform,background-color,border-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:w-[116px] hover:-translate-x-0.5 hover:border-[#A7DDF7] hover:bg-[#ECF8FE] hover:text-slate-900 active:scale-[0.98] lg:flex";

    return (
      <button
        aria-label={edgeLabel}
        className={className}
        type="button"
        onClick={onToggle}
      >
        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-full items-center justify-center transition-all duration-200 ease-out group-hover:w-8 group-hover:justify-start group-hover:px-2.5">
          <ChevronLeftIcon className="motion-fx-7-collapse-icon h-4 w-4" />
        </span>
        <span className="pointer-events-none absolute left-8 top-1/2 max-w-0 -translate-y-1/2 overflow-hidden whitespace-nowrap text-[13px] font-normal leading-none opacity-0 transition-[max-width,opacity] duration-200 ease-out group-hover:max-w-20 group-hover:opacity-100">
          {resolvedPanelLabel}
        </span>
      </button>
    );
  }

  const className = isDarkTheme
    ? "group hidden h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/[0.075] bg-white/[0.035] px-0 text-slate-300 transition-[width,transform,background-color,border-color,color,padding] duration-200 ease-out hover:w-[74px] hover:border-white/[0.11] hover:bg-white/[0.08] hover:px-3 hover:text-slate-50 active:scale-[0.98] focus-visible:w-[74px] focus-visible:px-3 lg:flex"
    : "group hidden h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#BFE7FB] bg-[#F4FBFF] px-0 text-slate-700 transition-[width,transform,background-color,border-color,color,padding] duration-200 ease-out hover:w-[74px] hover:border-[#A7DDF7] hover:bg-[#ECF8FE] hover:px-3 hover:text-slate-900 active:scale-[0.98] focus-visible:w-[74px] focus-visible:px-3 lg:flex";

  return (
    <button
      aria-label={label}
      className={className}
      title={label}
      type="button"
      onClick={onToggle}
    >
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-normal opacity-0 transition-[max-width,opacity,margin] duration-200 ease-out group-hover:mr-2 group-hover:max-w-10 group-hover:opacity-100 group-focus-visible:mr-2 group-focus-visible:max-w-10 group-focus-visible:opacity-100">
        {label}
      </span>
      <span className="grid h-4 w-4 shrink-0 place-items-center">
        {isCollapsed ? (
          <PanelRightOpenIcon className="motion-fx-7-collapse-icon h-4 w-4 is-collapsed" />
        ) : (
          <PanelRightCloseIcon className="motion-fx-7-collapse-icon h-4 w-4" />
        )}
      </span>
    </button>
  );
}
