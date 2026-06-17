"use client";

import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import { createKolSourceWatchKey } from "@/app/_lib/workspace-watchlist";
import type { StructuredSignal } from "@/app/_types/signal";
import { FavoriteStarButton, SourceAvatar, SymbolIcon } from "./card-ui";
import {
  createKolFollowModels,
  formatSignalEntryText,
  formatSymbolLabel,
  type KolFollowModel,
} from "./kol-follow-models";
import {
  CommunityConversionCard,
  EmptyPanelState,
  getInfoPillClassName,
  getPanelDescriptionClassName,
  getPanelSubtitleClassName,
  getPanelTitleClassName,
  getPrimaryButtonClassName,
  getRankBadgeClassName,
  getWorkspacePanelClassName,
  MetricTile,
} from "./kol-follow-ui";
import {
  formatSignalPaperPositionStatus,
  getSignalDirectionBadgeClass,
  getSignalPaperPositionBadgeClass,
} from "./paper-position-summary";

export function KolFollowProductTab({
  copy,
  isDarkTheme,
  paperPositionsBySignalId,
  signals,
  watchlistedSourceKeys,
  onCommunityConversionOpen,
  onKolSourceWatchToggle,
  onSignalSelect,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>;
  signals: readonly StructuredSignal[];
  watchlistedSourceKeys?: ReadonlySet<string>;
  onCommunityConversionOpen: (
    sourceName: string,
    signal?: StructuredSignal,
  ) => void;
  onKolSourceWatchToggle?: (signal: StructuredSignal) => void;
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
        </div>
        <div
          className={
            isDarkTheme
              ? "kol-scroll-area kol-scroll-area-dark mr-2 min-h-0 flex-1 overflow-y-auto bg-[#12161D] pb-3 pl-3 pr-1 pt-3"
              : "kol-scroll-area mr-2 min-h-0 flex-1 overflow-y-auto bg-[#FAFBFD] pb-3 pl-3 pr-1 pt-3"
          }
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {models.length > 0 ? (
              models.map((model, index) => (
                <KolFollowCard
                  key={model.name}
                  copy={copy}
                  isDarkTheme={isDarkTheme}
                  isWatchlisted={watchlistedSourceKeys?.has(createKolSourceWatchKey(model.name)) ?? false}
                  model={model}
                  paperPositionRecord={
                    paperPositionsBySignalId[model.latestSignal.id] ?? null
                  }
                  rank={index + 1}
                  onCommunityConversionOpen={onCommunityConversionOpen}
                  onSignalSelect={onSignalSelect}
                  onWatchToggle={onKolSourceWatchToggle ? () => onKolSourceWatchToggle(model.latestSignal) : undefined}
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

export function KolFollowCard({
  copy,
  isDarkTheme,
  isWatchlisted,
  model,
  paperPositionRecord,
  rank,
  onCommunityConversionOpen,
  onSignalSelect,
  onWatchToggle,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  isWatchlisted: boolean;
  model: KolFollowModel;
  paperPositionRecord: PaperPositionRecord | null;
  rank: number;
  onCommunityConversionOpen: (
    sourceName: string,
    signal?: StructuredSignal,
  ) => void;
  onSignalSelect: (signal: StructuredSignal) => void;
  onWatchToggle?: () => void;
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
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
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
            {onWatchToggle ? (
              <FavoriteStarButton
                activeLabel={copy.workspace.watchlist.removeFavorite}
                inactiveLabel={copy.workspace.watchlist.addFavorite}
                isActive={isWatchlisted}
                isDarkTheme={isDarkTheme}
                onToggle={onWatchToggle}
              />
            ) : null}
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
