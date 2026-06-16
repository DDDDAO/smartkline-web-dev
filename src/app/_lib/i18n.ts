import { en } from "./i18n/en";
import { zh } from "./i18n/zh";

export type WorkspaceLanguage = "zh-CN" | "en-US";

export const WORKSPACE_LANGUAGE_STORAGE_KEY = "smartkline:workspace-language";

type Widen<T> = T extends (...args: infer Args) => infer Return
  ? (...args: Args) => Widen<Return>
  : T extends readonly (infer Item)[]
    ? readonly Widen<Item>[]
    : T extends string
      ? string
      : T extends object
        ? { [Key in keyof T]: Widen<T[Key]> }
        : T;

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
