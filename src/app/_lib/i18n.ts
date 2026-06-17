import { en } from "./i18n/en";
import { zh } from "./i18n/zh";
import type { Widen } from "./i18n/widen";

export type WorkspaceLanguage = "zh-CN" | "en-US";

export const WORKSPACE_LANGUAGE_STORAGE_KEY = "smartkline:workspace-language";

export type WorkspaceCopy = Widen<typeof zh>;

export const WORKSPACE_COPY: Record<WorkspaceLanguage, WorkspaceCopy> = {
  "en-US": en,
  "zh-CN": zh,
};

export function getWorkspaceCopy(language: WorkspaceLanguage): WorkspaceCopy {
  return WORKSPACE_COPY[language];
}

export function isWorkspaceLanguage(value: string | null | undefined): value is WorkspaceLanguage {
  return value === "zh-CN" || value === "en-US";
}
