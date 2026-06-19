import { Button } from "@/components/ui/button";
import { createStructuredSignalPositionKey } from "@/lib/kol-signal-api";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { StructuredSignal } from "@/types/signal";
import {
  MAX_VISIBLE_KOL_SIGNAL_HISTORY,
  type WorkspaceNotification,
  type WorkspaceNotificationKind,
} from "./signal-workspace-helpers-constants";

export function WorkspaceNotificationBanner({
  copy,
  isDarkTheme,
  notification,
  onDismiss,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  notification: WorkspaceNotification;
  onDismiss: () => void;
}) {
  const tone = getWorkspaceNotificationTone(notification.kind, isDarkTheme, copy);

  return (
    <div className={tone.shellClassName} role={notification.kind === "error" ? "alert" : "status"}>
      <div className={tone.headerClassName}>
        <div className="flex items-center justify-between gap-3">
          <span className={tone.eyebrowClassName}>
            {tone.eyebrow}
          </span>
          <Button
            aria-label={copy.common.close}
            className={tone.closeClassName}
            size="sm"
            type="button"
            variant="ghost"
            onClick={onDismiss}
          >
            {copy.common.close}
          </Button>
        </div>
      </div>
      <div className="flex gap-3 px-4 py-3">
        <div className={tone.iconClassName}>
          <span aria-hidden="true">{tone.icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className={tone.titleClassName}>
            {notification.title}
          </div>
          <div className={tone.messageClassName}>
            {notification.message}
          </div>
          <div className={tone.metaClassName}>
            {notification.meta}
          </div>
        </div>
      </div>
    </div>
  );
}

export function getWorkspaceNotificationTone(
  kind: WorkspaceNotificationKind,
  isDarkTheme: boolean,
  copy: WorkspaceCopy,
) {
  const common = {
    closeClassName: isDarkTheme
      ? "rounded-full px-2 py-0.5 text-xs text-slate-500 transition hover:bg-white/[0.08] hover:text-slate-200"
      : "rounded-full px-2 py-0.5 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-700",
    messageClassName: isDarkTheme
      ? "mt-1 whitespace-pre-line break-words text-xs leading-5 text-slate-300"
      : "mt-1 whitespace-pre-line break-words text-xs leading-5 text-slate-600",
    metaClassName: isDarkTheme
      ? "mt-2 break-words text-[11px] text-slate-500"
      : "mt-2 break-words text-[11px] text-slate-400",
    titleClassName: isDarkTheme
      ? "break-words text-sm font-bold text-slate-50"
      : "break-words text-sm font-bold text-slate-950",
  };

  if (kind === "error") {
    return {
      ...common,
      eyebrow: copy.workspace.errorNotification,
      eyebrowClassName: isDarkTheme ? "text-[11px] font-bold text-rose-300" : "text-[11px] font-bold text-rose-700",
      headerClassName: isDarkTheme ? "border-b border-rose-300/15 bg-rose-400/[0.08] px-4 py-2" : "border-b border-rose-100 bg-rose-50 px-4 py-2",
      icon: "!",
      iconClassName: isDarkTheme ? "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rose-500/15 text-lg font-black text-rose-300" : "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rose-100 text-lg font-black text-rose-700",
      shellClassName: isDarkTheme ? "pointer-events-auto w-full overflow-hidden rounded-2xl border border-rose-300/20 bg-[#1B1117]/96 shadow-[0_18px_56px_rgba(0,0,0,0.38)] backdrop-blur-xl" : "pointer-events-auto w-full overflow-hidden rounded-2xl border border-rose-100 bg-white/96 shadow-[0_18px_56px_rgba(127,29,29,0.14)] backdrop-blur-xl",
    };
  }

  if (kind === "success") {
    return {
      ...common,
      eyebrow: copy.workspace.successNotification,
      eyebrowClassName: isDarkTheme ? "text-[11px] font-bold text-emerald-300" : "text-[11px] font-bold text-emerald-700",
      headerClassName: isDarkTheme ? "border-b border-emerald-300/15 bg-emerald-400/[0.08] px-4 py-2" : "border-b border-emerald-100 bg-emerald-50 px-4 py-2",
      icon: "✓",
      iconClassName: isDarkTheme ? "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 text-lg font-black text-emerald-300" : "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-lg font-black text-emerald-700",
      shellClassName: isDarkTheme ? "pointer-events-auto w-full overflow-hidden rounded-2xl border border-emerald-300/20 bg-[#111B17]/96 shadow-[0_18px_56px_rgba(0,0,0,0.34)] backdrop-blur-xl" : "pointer-events-auto w-full overflow-hidden rounded-2xl border border-emerald-100 bg-white/96 shadow-[0_18px_56px_rgba(6,95,70,0.12)] backdrop-blur-xl",
    };
  }

  return {
    ...common,
    eyebrow: copy.workspace.browserNotification,
    eyebrowClassName: isDarkTheme ? "text-[11px] font-bold text-indigo-300" : "text-[11px] font-bold text-[#4F46E5]",
    headerClassName: isDarkTheme ? "border-b border-white/[0.075] bg-white/[0.035] px-4 py-2" : "border-b border-[#E8E8EC] bg-[#FAFAFA] px-4 py-2",
    icon: "🔔",
    iconClassName: isDarkTheme ? "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-300" : "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600",
    shellClassName: isDarkTheme ? "pointer-events-auto w-full overflow-hidden rounded-2xl border border-white/[0.075] bg-[#181A20]/96 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl" : "pointer-events-auto w-full overflow-hidden rounded-2xl border border-[#E8E8EC] bg-white/96 shadow-[0_18px_48px_rgba(15,23,42,0.14)] backdrop-blur-xl",
  };
}

export function openExternalTelegramUrl(url: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export function mergeIncomingSignals(
  incomingSignals: readonly StructuredSignal[],
  currentSignals: StructuredSignal[],
): StructuredSignal[] {
  const mergedSignals = dedupeStructuredSignalsByPosition([
    ...currentSignals,
    ...incomingSignals,
  ]);
  return areStructuredSignalListsEqual(currentSignals, mergedSignals)
    ? currentSignals
    : mergedSignals;
}

export function areStructuredSignalListsEqual(
  leftSignals: readonly StructuredSignal[],
  rightSignals: readonly StructuredSignal[],
): boolean {
  if (leftSignals.length !== rightSignals.length) {
    return false;
  }

  return leftSignals.every((leftSignal, index) => {
    const rightSignal = rightSignals[index];
    return Boolean(
      rightSignal &&
        leftSignal.id === rightSignal.id &&
        leftSignal.created_at === rightSignal.created_at &&
        createStructuredSignalPositionKey(leftSignal) ===
          createStructuredSignalPositionKey(rightSignal),
    );
  });
}

export function dedupeStructuredSignalsByPosition(
  signals: readonly StructuredSignal[],
): StructuredSignal[] {
  const signalsByPositionKey = new Map<string, StructuredSignal>();

  for (const signal of signals) {
    const positionKey = createStructuredSignalPositionKey(signal);
    const currentSignal = signalsByPositionKey.get(positionKey);
    if (
      !currentSignal ||
      compareStructuredSignalCreatedAt(signal, currentSignal) < 0
    ) {
      signalsByPositionKey.set(positionKey, signal);
    }
  }

  return sortSignalsForKolPanel(
    Array.from(signalsByPositionKey.values()),
  ).slice(0, MAX_VISIBLE_KOL_SIGNAL_HISTORY);
}

export function compareStructuredSignalCreatedAt(
  left: StructuredSignal,
  right: StructuredSignal,
): number {
  return (
    getStructuredSignalCreatedAtTimestamp(left) -
    getStructuredSignalCreatedAtTimestamp(right)
  );
}

export function getStructuredSignalCreatedAtTimestamp(
  signal: StructuredSignal,
): number {
  const timestamp = Date.parse(signal.created_at);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

export function getLatestStructuredSignalCreatedAt(
  signals: readonly StructuredSignal[],
): string | null {
  let latestSignal: StructuredSignal | null = null;
  let latestTimestamp = Number.NEGATIVE_INFINITY;

  for (const signal of signals) {
    const timestamp = Date.parse(signal.created_at);
    if (Number.isFinite(timestamp) && timestamp > latestTimestamp) {
      latestSignal = signal;
      latestTimestamp = timestamp;
    }
  }

  return latestSignal?.created_at ?? null;
}

export function sortSignalsForKolPanel(
  signals: readonly StructuredSignal[],
): StructuredSignal[] {
  return signals.slice().sort((left, right) => {
    const strongAlertSort =
      Number(right.isStrongAlert) - Number(left.isStrongAlert);
    if (strongAlertSort !== 0) {
      return strongAlertSort;
    }

    const createdAtSort =
      Date.parse(right.created_at) - Date.parse(left.created_at);
    if (Number.isFinite(createdAtSort) && createdAtSort !== 0) {
      return createdAtSort;
    }

    return right.id.localeCompare(left.id);
  });
}
