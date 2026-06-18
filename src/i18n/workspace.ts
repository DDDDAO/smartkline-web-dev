import { isAppLocale, type AppLocale } from "@/i18n/locales";
import { en } from "./workspace/en";
import { zh } from "./workspace/zh";
import type { Widen } from "./workspace/widen";

export type WorkspaceLanguage = "zh-CN" | "en-US";

export type WorkspaceCopy = Widen<typeof zh>;

export const WORKSPACE_COPY: Record<WorkspaceLanguage, WorkspaceCopy> = {
  "en-US": en,
  "zh-CN": zh,
};

export function getWorkspaceCopy(language: WorkspaceLanguage): WorkspaceCopy {
  return WORKSPACE_COPY[language];
}

export function getWorkspaceLanguageFromAppLocale(locale: AppLocale): WorkspaceLanguage {
  return locale === "en" ? "en-US" : "zh-CN";
}

export function getWorkspaceLanguageFromLocale(locale: string): WorkspaceLanguage {
  if (!isAppLocale(locale)) {
    throw new Error(`Unsupported app locale: ${locale}`);
  }
  return getWorkspaceLanguageFromAppLocale(locale);
}

export function getAppLocaleFromWorkspaceLanguage(language: WorkspaceLanguage): AppLocale {
  return language === "en-US" ? "en" : "zh";
}

export function getHtmlLanguage(language: WorkspaceLanguage): string {
  return language;
}
