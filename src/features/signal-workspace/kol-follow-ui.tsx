import type { WorkspaceCopy } from "@/i18n/workspace";
import pillStyles from "./signal-pill.module.css";

export function CommunityConversionCard({
  copy,
  isDarkTheme,
  onOpen,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  onOpen: () => void;
}) {
  return (
    <section className={`${getWorkspacePanelClassName(isDarkTheme)} p-4`}>
      <span className={getInfoPillClassName(isDarkTheme)}>
        {copy.workspace.communityConversion.badge}
      </span>
      <h3 className={`${getPanelSubtitleClassName(isDarkTheme)} mt-3`}>
        {copy.workspace.communityConversion.sideTitle}
      </h3>
      <p className={getPanelDescriptionClassName(isDarkTheme)}>
        {copy.workspace.communityConversion.sideDescription}
      </p>
      <div className="mt-3 grid gap-2">
        {copy.workspace.communityConversion.benefits.map((benefit) => (
          <div
            key={benefit}
            className={
              isDarkTheme
                ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-sm font-semibold text-slate-200"
                : "rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] px-3 py-2 text-sm font-semibold text-slate-700"
            }
          >
            {benefit}
          </div>
        ))}
      </div>
      <button
        className={`${getPrimaryButtonClassName()} mt-3 w-full`}
        type="button"
        onClick={onOpen}
      >
        {copy.workspace.communityConversion.sideAction}
      </button>
    </section>
  );
}

export function MetricTile({
  isDarkTheme,
  label,
  tone = "default",
  value,
}: {
  isDarkTheme: boolean;
  label: string;
  tone?: "default" | "negative" | "positive";
  value: string;
}) {
  return (
    <div
      className={
        isDarkTheme
          ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2"
          : "rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] px-3 py-2"
      }
    >
      <div
        className={
          isDarkTheme ? "text-[11px] text-slate-500" : "text-[11px] text-slate-400"
        }
      >
        {label}
      </div>
      <div className={getMetricValueClassName(isDarkTheme, tone)}>{value}</div>
    </div>
  );
}

export function EmptyPanelState({
  copy,
  isDarkTheme,
}: {
  copy: string;
  isDarkTheme: boolean;
}) {
  return (
    <div
      className={
        isDarkTheme
          ? "rounded-[22px] border border-white/[0.075] bg-white/[0.035] p-6 text-sm text-slate-400"
          : "rounded-[22px] border border-[#E8E8EC] bg-white p-6 text-sm text-slate-500"
      }
    >
      {copy}
    </div>
  );
}

export function getWorkspacePanelClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-[24px] border border-white/[0.075] bg-[#111113]"
    : "rounded-[24px] border border-[#E8E8EC] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.035)]";
}

export function getPanelTitleClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "text-xl font-semibold tracking-tight text-slate-50"
    : "text-xl font-semibold tracking-tight text-slate-950";
}

export function getPanelSubtitleClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "text-base font-semibold tracking-tight text-slate-50"
    : "text-base font-semibold tracking-tight text-slate-950";
}

export function getPanelDescriptionClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "mt-1 text-sm leading-5 text-slate-400"
    : "mt-1 text-sm leading-5 text-slate-500";
}

export function getInfoPillClassName(isDarkTheme: boolean): string {
  return `${pillStyles.pill} ${pillStyles.statusLive} ${isDarkTheme ? pillStyles.dark : ""}`;
}

export function getRankBadgeClassName(isDarkTheme: boolean, rank: number): string {
  const baseClassName =
    "inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-2 text-xs font-bold";

  if (rank <= 3) {
    return `${baseClassName} ${
      isDarkTheme
        ? "bg-indigo-400/20 text-indigo-200"
        : "bg-[#EEF2FF] text-[#4F46E5]"
    }`;
  }

  return `${baseClassName} ${
    isDarkTheme
      ? "bg-white/[0.06] text-slate-300"
      : "bg-slate-100 text-slate-600"
  }`;
}

export function getMetricValueClassName(
  isDarkTheme: boolean,
  tone: "default" | "negative" | "positive",
): string {
  if (tone === "positive") {
    return isDarkTheme
      ? "mt-1 truncate text-sm font-semibold text-[#45DCA6]"
      : "mt-1 truncate text-sm font-semibold text-[#159B72]";
  }

  if (tone === "negative") {
    return isDarkTheme
      ? "mt-1 truncate text-sm font-semibold text-[#FF7586]"
      : "mt-1 truncate text-sm font-semibold text-[#D9515F]";
  }

  return isDarkTheme
    ? "mt-1 truncate text-sm font-semibold text-slate-100"
    : "mt-1 truncate text-sm font-semibold text-slate-800";
}

export function getPrimaryButtonClassName(): string {
  return "motion-fx-1-nav-button inline-flex h-10 items-center justify-center rounded-full bg-[#6366F1] px-4 text-sm font-semibold text-white transition hover:bg-[#4F46E5] disabled:cursor-not-allowed";
}

export function getIconButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/[0.075] bg-white/[0.035] text-xl text-slate-300 transition hover:bg-white/[0.08] hover:text-indigo-300"
    : "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#E8E8EC] bg-[#FAFAFA] text-xl text-slate-600 transition hover:border-[#C7D2FE] hover:bg-[#EEF2FF] hover:text-[#4F46E5]";
}
