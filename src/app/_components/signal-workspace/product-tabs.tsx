"use client";

import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { StructuredSignal } from "@/app/_types/signal";
import { SourceAvatar, SymbolIcon } from "./card-ui";
import {
  formatSignalPaperPositionStatus,
  getSignalDirectionBadgeClass,
  getSignalPaperPositionBadgeClass,
} from "./paper-position-summary";

export type WorkspaceProductTab = "intel" | "kolFollow";

const WORKSPACE_PRODUCT_TABS: readonly WorkspaceProductTab[] = [
  "intel",
  "kolFollow",
];

type KolFollowModel = {
  activeCount: number;
  avatarUrl: string | null;
  latestSignal: StructuredSignal;
  name: string;
  pnlText: string;
  pnlTone: "default" | "negative" | "positive";
  score: number | null;
  signalCount: number;
  symbols: string[];
};

export function WorkspaceProductTabs({
  activeTab,
  copy,
  isDarkTheme,
  variant = "standalone",
  onTabChange,
}: {
  activeTab: WorkspaceProductTab;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  variant?: "standalone" | "topbar";
  onTabChange: (tab: WorkspaceProductTab) => void;
}) {
  const shellClassName =
    variant === "topbar"
      ? isDarkTheme
        ? "flex w-full min-w-0 gap-1 overflow-x-auto rounded-full border border-white/[0.075] bg-white/[0.035] p-1 lg:w-fit"
        : "flex w-full min-w-0 gap-1 overflow-x-auto rounded-full border border-[#E5EAF0] bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.035)] lg:w-fit"
      : isDarkTheme
        ? "mx-3 mt-3 flex w-fit max-w-[calc(100vw-1.5rem)] gap-1 overflow-x-auto rounded-full border border-white/[0.075] bg-white/[0.035] p-1 lg:mx-4"
        : "mx-3 mt-3 flex w-fit max-w-[calc(100vw-1.5rem)] gap-1 overflow-x-auto rounded-full border border-[#E5EAF0] bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.035)] lg:mx-4";

  return (
    <nav aria-label={copy.workspace.navAria} className={shellClassName}>
      {WORKSPACE_PRODUCT_TABS.map((tab) => {
        const tabCopy = copy.workspace.productTabs[tab];
        const isActive = activeTab === tab;
        const buttonClassName = isActive
          ? "motion-fx-1-nav-button flex h-9 shrink-0 items-center rounded-full bg-[#00A6F4] px-3 text-xs font-semibold text-white sm:px-4 sm:text-sm"
          : isDarkTheme
            ? "motion-fx-1-nav-button flex h-9 shrink-0 items-center rounded-full px-3 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.08] hover:text-sky-300 sm:px-4 sm:text-sm"
            : "motion-fx-1-nav-button flex h-9 shrink-0 items-center rounded-full px-3 text-xs font-semibold text-slate-500 transition hover:bg-[#EAF8FE] hover:text-[#008DCC] sm:px-4 sm:text-sm";

        return (
          <button
            key={tab}
            aria-current={isActive ? "page" : undefined}
            className={buttonClassName}
            title={tabCopy.description}
            type="button"
            onClick={() => onTabChange(tab)}
          >
            <span>{tabCopy.label}</span>
            {tabCopy.stageLabel ? (
              <span
                className={
                  isActive
                    ? "ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                    : isDarkTheme
                      ? "ml-1 rounded-full bg-sky-300/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-200"
                      : "ml-1 rounded-full bg-[#EAF8FE] px-1.5 py-0.5 text-[10px] font-semibold text-[#008DCC]"
                }
              >
                {tabCopy.stageLabel}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

export function KolFollowProductTab({
  copy,
  isDarkTheme,
  paperPositionsBySignalId,
  signals,
  onCommunityConversionOpen,
  onSignalSelect,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>;
  signals: readonly StructuredSignal[];
  onCommunityConversionOpen: (
    sourceName: string,
    signal?: StructuredSignal,
  ) => void;
  onSignalSelect: (signal: StructuredSignal) => void;
}) {
  const models = createKolFollowModels(signals, paperPositionsBySignalId);
  const shellClassName =
    "grid h-full min-h-0 gap-4 p-3 pb-28 lg:grid-cols-[minmax(0,1fr)_330px] lg:p-4 lg:pb-4";
  const panelClassName = getWorkspacePanelClassName(isDarkTheme);
  const topModel = models[0] ?? null;

  return (
    <section className={shellClassName}>
      <div className={`${panelClassName} flex min-h-0 flex-col overflow-hidden`}>
        <div
          className={
            isDarkTheme
              ? "border-b border-white/[0.075] px-4 py-4"
              : "border-b border-[#E5EAF0] px-4 py-4"
          }
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className={getPanelTitleClassName(isDarkTheme)}>
                  {copy.workspace.kolFollow.heroTitle}
                </h2>
                <span className={getInfoPillClassName(isDarkTheme)}>
                  {copy.workspace.kolFollow.heroBadge}
                </span>
              </div>
              <p className={getPanelDescriptionClassName(isDarkTheme)}>
                {copy.workspace.kolFollow.description}
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {copy.workspace.kolFollow.flow.map((item, index) => (
              <div
                key={item}
                className={
                  isDarkTheme
                    ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-3"
                    : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-3"
                }
              >
                <div
                  className={
                    isDarkTheme
                      ? "text-xs font-semibold text-sky-300"
                      : "text-xs font-semibold text-[#008DCC]"
                  }
                >
                  {index + 1}
                </div>
                <div
                  className={
                    isDarkTheme
                      ? "mt-1 text-sm font-semibold text-slate-100"
                      : "mt-1 text-sm font-semibold text-slate-900"
                  }
                >
                  {item}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="kol-scroll-area min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {models.length > 0 ? (
              models.map((model, index) => (
                <KolFollowCard
                  key={model.name}
                  copy={copy}
                  isDarkTheme={isDarkTheme}
                  model={model}
                  paperPositionRecord={
                    paperPositionsBySignalId[model.latestSignal.id] ?? null
                  }
                  rank={index + 1}
                  onCommunityConversionOpen={onCommunityConversionOpen}
                  onSignalSelect={onSignalSelect}
                />
              ))
            ) : (
              <EmptyPanelState
                copy={copy.workspace.kolFollow.empty}
                isDarkTheme={isDarkTheme}
              />
            )}
          </div>
        </div>
      </div>
      <aside className="flex min-h-0 flex-col gap-3">
        <section className={`${panelClassName} p-4`}>
          <h3 className={getPanelSubtitleClassName(isDarkTheme)}>
            {copy.workspace.kolFollow.title}
          </h3>
          <p className={getPanelDescriptionClassName(isDarkTheme)}>
            {copy.workspace.kolFollow.riskNote}
          </p>
          {topModel ? (
            <div className="mt-3 grid gap-2">
              <MetricTile
                isDarkTheme={isDarkTheme}
                label={copy.workspace.kolFollow.stats.rank}
                value={`#1 ${topModel.name}`}
              />
              <MetricTile
                isDarkTheme={isDarkTheme}
                label={copy.workspace.kolFollow.stats.pnl}
                tone={topModel.pnlTone}
                value={topModel.pnlText}
              />
            </div>
          ) : null}
        </section>
        <CommunityConversionCard
          copy={copy}
          isDarkTheme={isDarkTheme}
          onOpen={() =>
            onCommunityConversionOpen(
              topModel?.name ?? copy.workspace.kolFollow.heroTitle,
              topModel?.latestSignal,
            )
          }
        />
      </aside>
    </section>
  );
}

function KolFollowCard({
  copy,
  isDarkTheme,
  model,
  paperPositionRecord,
  rank,
  onCommunityConversionOpen,
  onSignalSelect,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  model: KolFollowModel;
  paperPositionRecord: PaperPositionRecord | null;
  rank: number;
  onCommunityConversionOpen: (
    sourceName: string,
    signal?: StructuredSignal,
  ) => void;
  onSignalSelect: (signal: StructuredSignal) => void;
}) {
  const cardClassName = isDarkTheme
    ? "rounded-[22px] border border-white/[0.075] bg-white/[0.035] p-4 transition hover:border-sky-500/30 hover:bg-white/[0.055]"
    : "rounded-[22px] border border-[#E5EAF0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.025)] transition hover:border-[#D8E0E8] hover:shadow-[0_5px_14px_rgba(15,23,42,0.07)]";

  return (
    <article className={cardClassName}>
      <div className="flex min-w-0 items-start gap-3">
        <span className={getRankBadgeClassName(isDarkTheme, rank)}>
          #{rank}
        </span>
        <SourceAvatar
          isDarkTheme={isDarkTheme}
          name={model.name}
          url={model.avatarUrl}
        />
        <div className="min-w-0 flex-1">
          <h3 className={getPanelSubtitleClassName(isDarkTheme)}>
            {model.name}
          </h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {model.symbols.slice(0, 4).map((symbol) => (
              <span
                key={symbol}
                className={
                  isDarkTheme
                    ? "inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-1 text-xs text-slate-200"
                    : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
                }
              >
                <SymbolIcon symbol={symbol} />
                {formatSymbolLabel(symbol)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MetricTile
          isDarkTheme={isDarkTheme}
          label={copy.workspace.kolFollow.stats.pnl}
          tone={model.pnlTone}
          value={model.pnlText}
        />
        <MetricTile
          isDarkTheme={isDarkTheme}
          label={copy.workspace.kolFollow.stats.signals}
          value={String(model.signalCount)}
        />
        <MetricTile
          isDarkTheme={isDarkTheme}
          label={copy.workspace.kolFollow.stats.active}
          value={String(model.activeCount)}
        />
      </div>
      <div
        className={
          isDarkTheme
            ? "mt-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2"
            : "mt-3 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2"
        }
      >
        <div
          className={
            isDarkTheme
              ? "text-[11px] font-medium text-slate-500"
              : "text-[11px] font-medium text-slate-400"
          }
        >
          {copy.workspace.kolFollow.stats.latest}
        </div>
        <button
          className={
            isDarkTheme
              ? "mt-1 flex w-full min-w-0 items-center gap-2 text-left text-xs font-semibold text-slate-100"
              : "mt-1 flex w-full min-w-0 items-center gap-2 text-left text-xs font-semibold text-slate-800"
          }
          type="button"
          onClick={() => onSignalSelect(model.latestSignal)}
        >
          <span
            className={getSignalDirectionBadgeClass(
              isDarkTheme,
              model.latestSignal.direction,
            )}
          >
            {copy.kol.directionShort[model.latestSignal.direction]}
          </span>
          <span
            className={getSignalPaperPositionBadgeClass(
              isDarkTheme,
              paperPositionRecord,
            )}
          >
            {formatSignalPaperPositionStatus(
              paperPositionRecord,
              null,
              copy.paper,
            )}
          </span>
          <span className="min-w-0 flex-1 truncate">
            {formatSymbolLabel(model.latestSignal.symbol)} · {formatSignalEntryText(model.latestSignal, copy)}
          </span>
        </button>
      </div>
      <button
        className={`${getPrimaryButtonClassName()} mt-3 w-full`}
        type="button"
        onClick={() => {
          onSignalSelect(model.latestSignal);
          onCommunityConversionOpen(model.name, model.latestSignal);
        }}
      >
        {copy.workspace.kolFollow.cardAction}
      </button>
    </article>
  );
}

export function CommunityConversionModal({
  copy,
  isDarkTheme,
  onClose,
  onCommunityOpen,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  onClose: () => void;
  onCommunityOpen: () => void;
}) {
  const modalClassName = isDarkTheme
    ? "w-[min(720px,94vw)] rounded-[28px] border border-white/[0.08] bg-[#181A20] p-5 text-slate-100 shadow-[0_24px_72px_rgba(0,0,0,0.42)]"
    : "w-[min(720px,94vw)] rounded-[28px] border border-[#E5EAF0] bg-white p-5 text-slate-950 shadow-[0_22px_64px_rgba(15,23,42,0.16)]";

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/42 p-4 backdrop-blur-[6px]">
      <div className={modalClassName}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {copy.workspace.communityConversion.title}
            </h2>
            <p className={getPanelDescriptionClassName(isDarkTheme)}>
              {copy.workspace.communityConversion.subtitle}
            </p>
          </div>
          <button
            aria-label={copy.common.close}
            className={getIconButtonClassName(isDarkTheme)}
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <p
          className={
            isDarkTheme
              ? "mt-4 text-sm leading-6 text-slate-300"
              : "mt-4 text-sm leading-6 text-slate-600"
          }
        >
          {copy.workspace.communityConversion.description}
        </p>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {copy.workspace.communityConversion.benefits.map((benefit) => (
            <div key={benefit} className={getInnerPanelClassName(isDarkTheme)}>
              <div
                className={
                  isDarkTheme
                    ? "text-sm font-semibold text-sky-200"
                    : "text-sm font-semibold text-[#087EBB]"
                }
              >
                {benefit}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className={getSecondaryButtonClassName(isDarkTheme)}
            type="button"
            onClick={onClose}
          >
            {copy.workspace.communityConversion.secondaryAction}
          </button>
          <button
            className={getPrimaryButtonClassName()}
            type="button"
            onClick={onCommunityOpen}
          >
            {copy.workspace.communityConversion.primaryAction}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommunityConversionCard({
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
                : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-slate-700"
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

function MetricTile({
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
          : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2"
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

function EmptyPanelState({
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
          : "rounded-[22px] border border-[#E5EAF0] bg-white p-6 text-sm text-slate-500"
      }
    >
      {copy}
    </div>
  );
}

function createKolFollowModels(
  signals: readonly StructuredSignal[],
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>,
): KolFollowModel[] {
  const groups = new Map<string, StructuredSignal[]>();

  for (const signal of signals) {
    const currentGroup = groups.get(signal.source_name) ?? [];
    currentGroup.push(signal);
    groups.set(signal.source_name, currentGroup);
  }

  return Array.from(groups.entries())
    .map(([name, groupSignals]) => {
      const sortedSignals = groupSignals
        .slice()
        .sort(
          (left, right) =>
            Date.parse(right.created_at) - Date.parse(left.created_at),
        );
      const records = sortedSignals
        .map((signal) => paperPositionsBySignalId[signal.id])
        .filter(Boolean);
      const pnlValues = records
        .map((record) => record.pnlPercent)
        .filter((value): value is number => value !== null);
      const totalPnl = pnlValues.reduce((sum, value) => sum + value, 0);
      const activeCount = records.filter(
        (record) => record.status === "entered",
      ).length;
      const latestSignal = sortedSignals[0];
      const score = pnlValues.length > 0 ? totalPnl : null;

      return {
        activeCount,
        avatarUrl: latestSignal.source_avatar_url,
        latestSignal,
        name,
        pnlText: pnlValues.length > 0 ? formatSignedPercent(totalPnl) : "--",
        pnlTone: getTone(totalPnl, pnlValues.length),
        score,
        signalCount: sortedSignals.length,
        symbols: Array.from(
          new Set(sortedSignals.map((signal) => signal.symbol)),
        ),
      };
    })
    .sort((left, right) => {
      if (left.score !== null && right.score !== null && right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.score !== null && right.score === null) {
        return -1;
      }

      if (left.score === null && right.score !== null) {
        return 1;
      }

      return right.signalCount - left.signalCount;
    })
    .slice(0, 8);
}

function getTone(
  value: number | null,
  sampleSize: number,
): "default" | "negative" | "positive" {
  if (sampleSize === 0 || value === null || value === 0) {
    return "default";
  }

  return value > 0 ? "positive" : "negative";
}

function formatSignalEntryText(
  signal: StructuredSignal,
  copy: WorkspaceCopy,
): string {
  if (signal.entry_type === "range") {
    const values = [signal.entry_min, signal.entry_max]
      .filter((value): value is number => value !== null)
      .map((value) => value.toLocaleString("en-US"));
    return values.length > 0 ? values.join("-") : copy.kol.marketPrice;
  }

  return signal.trigger_price?.toLocaleString("en-US") ?? copy.kol.marketPrice;
}

function formatSymbolLabel(symbol: string): string {
  const [marketPair] = symbol.split(":");
  return marketPair.replace("/", "");
}

function formatSignedPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function getWorkspacePanelClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-[24px] border border-white/[0.075] bg-[#181A20]"
    : "rounded-[24px] border border-[#E5EAF0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.035)]";
}

function getInnerPanelClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-[20px] border border-white/[0.075] bg-white/[0.035] p-4"
    : "rounded-[20px] border border-[#E5EAF0] bg-white p-4";
}

function getPanelTitleClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "text-xl font-semibold tracking-tight text-slate-50"
    : "text-xl font-semibold tracking-tight text-slate-950";
}

function getPanelSubtitleClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "text-base font-semibold tracking-tight text-slate-50"
    : "text-base font-semibold tracking-tight text-slate-950";
}

function getPanelDescriptionClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "mt-1 text-sm leading-5 text-slate-400"
    : "mt-1 text-sm leading-5 text-slate-500";
}

function getInfoPillClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "kol-signal-pill kol-signal-pill-dark kol-status-live"
    : "kol-signal-pill kol-status-live";
}

function getRankBadgeClassName(isDarkTheme: boolean, rank: number): string {
  const baseClassName =
    "inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-2 text-xs font-bold";

  if (rank <= 3) {
    return `${baseClassName} ${
      isDarkTheme
        ? "bg-sky-400/20 text-sky-200"
        : "bg-[#EAF8FE] text-[#087EBB]"
    }`;
  }

  return `${baseClassName} ${
    isDarkTheme
      ? "bg-white/[0.06] text-slate-300"
      : "bg-slate-100 text-slate-600"
  }`;
}

function getMetricValueClassName(
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

function getPrimaryButtonClassName(): string {
  return "motion-fx-1-nav-button inline-flex h-10 items-center justify-center rounded-full bg-[#00A6F4] px-4 text-sm font-semibold text-white transition hover:bg-[#0097DD] disabled:cursor-not-allowed";
}

function getSecondaryButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "motion-fx-1-nav-button inline-flex h-10 items-center justify-center rounded-full border border-white/[0.075] bg-white/[0.035] px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-sky-300"
    : "motion-fx-1-nav-button inline-flex h-10 items-center justify-center rounded-full border border-[#E5EAF0] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#B7E8FC] hover:bg-[#EAF8FE] hover:text-[#008DCC]";
}

function getIconButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/[0.075] bg-white/[0.035] text-xl text-slate-300 transition hover:bg-white/[0.08] hover:text-sky-300"
    : "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#E5EAF0] bg-[#F8FAFC] text-xl text-slate-600 transition hover:border-[#B7E8FC] hover:bg-[#EAF8FE] hover:text-[#008DCC]";
}
