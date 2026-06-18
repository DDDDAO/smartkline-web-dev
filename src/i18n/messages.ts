import type { Metadata } from "next";

import type { AppLocale } from "./locales";
import { getWorkspaceCopy, getWorkspaceLanguageFromAppLocale } from "./workspace";

const SITE_METADATA: Record<AppLocale, Metadata> = {
  en: {
    title: "K-Line Intelligence Hub",
    description: "KOL signal intelligence tool for Crypto trading communities",
  },
  zh: {
    title: "K线情报局",
    description: "面向 Crypto 交易社群的 KOL 信号情报工具",
  },
};

export function getSiteMetadata(locale: AppLocale): Metadata {
  return SITE_METADATA[locale];
}

export function getAppMessages(locale: AppLocale) {
  const copy = getWorkspaceCopy(getWorkspaceLanguageFromAppLocale(locale));

  return {
    site: SITE_METADATA[locale],
    workspace: {
      languageTitle: copy.workspace.languageTitle,
      navAria: copy.workspace.navAria,
      productTabs: copy.workspace.productTabs,
      themeDark: copy.workspace.themeDark,
      themeLight: copy.workspace.themeLight,
      topSignals: {
        panelTabs: copy.workspace.topSignals.panelTabs,
        panelTabsAria: copy.workspace.topSignals.panelTabsAria,
      },
    },
  };
}
