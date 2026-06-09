"use client";

import { type ChangeEvent } from "react";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { StructuredSignal } from "@/app/_types/signal";
import { SourceAvatar, SymbolIcon } from "./card-ui";
import {
  formatSignalPaperPositionStatus,
  getSignalDirectionBadgeClass,
  getSignalPaperPositionBadgeClass,
} from "./paper-position-summary";

export type WorkspaceProductTab = "intel" | "kolFollow" | "running";

const WORKSPACE_PRODUCT_TABS: readonly WorkspaceProductTab[] = [
  "intel",
  "kolFollow",
  "running",
];

const BINANCE_PLATFORM_IPS = [
  "43.156.155.159",
  "43.156.26.177",
  "43.134.115.128",
  "43.128.122.7",
] as const;

type KolFollowModel = {
  activeCount: number;
  avatarUrl: string | null;
  latestSignal: StructuredSignal;
  name: string;
  pnlText: string;
  pnlTone: "default" | "negative" | "positive";
  signalCount: number;
  symbols: string[];
};

type RunningTaskModel = {
  action: "pause" | "stop";
  amountText: string;
  badge: "ai" | "copy" | "sim";
  pnlText: string;
  pnlTone: "default" | "negative" | "positive";
  sourceSignal: StructuredSignal | null;
  statusText: string;
  subtitle: string;
  title: string;
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
                      ? "ml-1 rounded-full bg-amber-300/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200"
                      : "ml-1 rounded-full bg-[#FFF8E8] px-1.5 py-0.5 text-[10px] font-semibold text-[#8B5B00]"
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
  onAiFollowRequest,
  onApiGuideOpen,
  onDetailOpen,
  onFollowStart,
  onSignalSelect,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>;
  signals: readonly StructuredSignal[];
  onAiFollowRequest: (signal: StructuredSignal) => void;
  onApiGuideOpen: () => void;
  onDetailOpen: (model: KolFollowModel) => void;
  onFollowStart: (model: KolFollowModel) => void;
  onSignalSelect: (signal: StructuredSignal) => void;
}) {
  const models = createKolFollowModels(signals, paperPositionsBySignalId);
  const shellClassName = "grid h-full min-h-0 gap-4 p-3 pb-28 lg:grid-cols-[minmax(0,1fr)_330px] lg:p-4 lg:pb-4";
  const panelClassName = getWorkspacePanelClassName(isDarkTheme);

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
          <StageNotice
            isDarkTheme={isDarkTheme}
            label={copy.workspace.kolFollow.stageNotice.label}
            text={copy.workspace.kolFollow.stageNotice.text}
          />
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
                <div className={isDarkTheme ? "text-xs font-semibold text-sky-300" : "text-xs font-semibold text-[#008DCC]"}>
                  {index + 1}
                </div>
                <div className={isDarkTheme ? "mt-1 text-sm font-semibold text-slate-100" : "mt-1 text-sm font-semibold text-slate-900"}>
                  {item}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="kol-scroll-area min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-3 xl:grid-cols-2">
            {models.length > 0 ? (
              models.map((model) => (
                <KolFollowCard
                  key={model.name}
                  copy={copy}
                  isDarkTheme={isDarkTheme}
                  model={model}
                  onAiFollowRequest={onAiFollowRequest}
                  onDetailOpen={onDetailOpen}
                  onFollowStart={onFollowStart}
                  onSignalSelect={onSignalSelect}
                />
              ))
            ) : (
              <EmptyPanelState copy={copy.workspace.running.empty} isDarkTheme={isDarkTheme} />
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
        </section>
        <BinanceGuideCard
          copy={copy}
          isDarkTheme={isDarkTheme}
          onOpen={onApiGuideOpen}
        />
      </aside>
    </section>
  );
}

function KolFollowCard({
  copy,
  isDarkTheme,
  model,
  onAiFollowRequest,
  onDetailOpen,
  onFollowStart,
  onSignalSelect,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  model: KolFollowModel;
  onAiFollowRequest: (signal: StructuredSignal) => void;
  onDetailOpen: (model: KolFollowModel) => void;
  onFollowStart: (model: KolFollowModel) => void;
  onSignalSelect: (signal: StructuredSignal) => void;
}) {
  const cardClassName = isDarkTheme
    ? "rounded-[22px] border border-white/[0.075] bg-white/[0.035] p-4 transition hover:border-sky-500/30 hover:bg-white/[0.055]"
    : "rounded-[22px] border border-[#E5EAF0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.025)] transition hover:border-[#D8E0E8] hover:shadow-[0_5px_14px_rgba(15,23,42,0.07)]";

  return (
    <article className={cardClassName}>
      <div className="flex min-w-0 items-start gap-3">
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
            {model.symbols.slice(0, 3).map((symbol) => (
              <span
                key={symbol}
                className={isDarkTheme ? "inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-1 text-xs text-slate-200" : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"}
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
          label={copy.workspace.kolFollow.stats.signals}
          value={String(model.signalCount)}
        />
        <MetricTile
          isDarkTheme={isDarkTheme}
          label={copy.workspace.kolFollow.stats.active}
          value={String(model.activeCount)}
        />
        <MetricTile
          isDarkTheme={isDarkTheme}
          label={copy.workspace.kolFollow.stats.pnl}
          tone={model.pnlTone}
          value={model.pnlText}
        />
      </div>
      <div
        className={
          isDarkTheme
            ? "mt-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2"
            : "mt-3 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2"
        }
      >
        <div className={isDarkTheme ? "text-[11px] font-medium text-slate-500" : "text-[11px] font-medium text-slate-400"}>
          {copy.workspace.kolFollow.stats.latest}
        </div>
        <button
          className={isDarkTheme ? "mt-1 flex min-w-0 items-center gap-2 text-left text-xs font-semibold text-slate-100" : "mt-1 flex min-w-0 items-center gap-2 text-left text-xs font-semibold text-slate-800"}
          type="button"
          onClick={() => {
            onSignalSelect(model.latestSignal);
            onAiFollowRequest(model.latestSignal);
          }}
        >
          <span
            className={getSignalDirectionBadgeClass(
              isDarkTheme,
              model.latestSignal.direction,
            )}
          >
            {copy.kol.directionShort[model.latestSignal.direction]}
          </span>
          <span className="truncate">
            {formatSignalEntryText(model.latestSignal, copy)}
          </span>
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className={getSecondaryButtonClassName(isDarkTheme)}
          type="button"
          onClick={() => onDetailOpen(model)}
        >
          {copy.workspace.kolFollow.cardSecondaryAction}
        </button>
        <button
          className={getPrimaryButtonClassName()}
          type="button"
          onClick={() => onFollowStart(model)}
        >
          {copy.workspace.kolFollow.cardAction}
        </button>
      </div>
    </article>
  );
}

function StageNotice({
  isDarkTheme,
  label,
  text,
}: {
  isDarkTheme: boolean;
  label: string;
  text: string;
}) {
  const containerClassName = isDarkTheme
    ? "mt-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-3 py-2.5"
    : "mt-3 rounded-2xl border border-[#FFEFC5] bg-[#FFF8E8] px-3 py-2.5";
  const labelClassName = isDarkTheme
    ? "kol-signal-pill kol-signal-pill-dark kol-status-pending"
    : "kol-signal-pill kol-status-pending";
  const textClassName = isDarkTheme
    ? "mt-2 text-xs font-medium leading-5 text-amber-100/90"
    : "mt-2 text-xs font-medium leading-5 text-[#8B5B00]";

  return (
    <div className={containerClassName}>
      <span className={labelClassName}>{label}</span>
      <div className={textClassName}>{text}</div>
    </div>
  );
}

export function RunningProductTab({
  copy,
  isDarkTheme,
  paperPositionsBySignalId,
  signals,
  onApiGuideOpen,
  onTaskAction,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>;
  signals: readonly StructuredSignal[];
  onApiGuideOpen: () => void;
  onTaskAction: (task: RunningTaskModel, action: "pause" | "stop" | "view") => void;
}) {
  const tasks = createRunningTaskModels(signals, paperPositionsBySignalId, copy);
  const panelClassName = getWorkspacePanelClassName(isDarkTheme);

  return (
    <section className="grid h-full min-h-0 gap-4 p-3 pb-28 lg:grid-cols-[minmax(0,1fr)_330px] lg:p-4 lg:pb-4">
      <div className={`${panelClassName} flex min-h-0 flex-col overflow-hidden`}>
        <div
          className={
            isDarkTheme
              ? "flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.075] px-4 py-4"
              : "flex flex-wrap items-start justify-between gap-3 border-b border-[#E5EAF0] px-4 py-4"
          }
        >
          <div>
            <h2 className={getPanelTitleClassName(isDarkTheme)}>
              {copy.workspace.running.title}
            </h2>
            <p className={getPanelDescriptionClassName(isDarkTheme)}>
              {copy.workspace.running.description}
            </p>
            <StageNotice
              isDarkTheme={isDarkTheme}
              label={copy.workspace.running.stageNotice.label}
              text={copy.workspace.running.stageNotice.text}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {copy.workspace.running.filters.map((filter) => (
              <span key={filter} className={getInfoPillClassName(isDarkTheme)}>
                {filter}
              </span>
            ))}
          </div>
        </div>
        <div className="kol-scroll-area min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <RunningTaskCard
                key={`${task.badge}-${task.title}`}
                copy={copy}
                isDarkTheme={isDarkTheme}
                task={task}
                onTaskAction={onTaskAction}
              />
            ))
          ) : (
            <EmptyPanelState copy={copy.workspace.running.empty} isDarkTheme={isDarkTheme} />
          )}
        </div>
      </div>
      <aside className="flex min-h-0 flex-col gap-3">
        <BinanceGuideCard
          copy={copy}
          isDarkTheme={isDarkTheme}
          onOpen={onApiGuideOpen}
        />
        <section className={`${panelClassName} p-4`}>
          <h3 className={getPanelSubtitleClassName(isDarkTheme)}>
            {copy.workspace.running.noticeTitle}
          </h3>
          <div className="mt-3 space-y-3">
            {tasks.slice(0, 3).map((task) => (
              <div key={task.title} className="flex min-w-0 gap-3">
                <span className={getTaskBadgeClassName(isDarkTheme, task.badge)}>
                  {task.badge === "ai" ? "AI" : task.badge === "copy" ? "K" : "S"}
                </span>
                <div className="min-w-0">
                  <div className={isDarkTheme ? "truncate text-sm font-semibold text-slate-100" : "truncate text-sm font-semibold text-slate-900"}>
                    {task.title}
                  </div>
                  <p className={getPanelDescriptionClassName(isDarkTheme)}>
                    {task.statusText}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}

function RunningTaskCard({
  copy,
  isDarkTheme,
  task,
  onTaskAction,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  task: RunningTaskModel;
  onTaskAction: (task: RunningTaskModel, action: "pause" | "stop" | "view") => void;
}) {
  const cardClassName = isDarkTheme
    ? "grid gap-3 rounded-[22px] border border-white/[0.075] bg-white/[0.035] p-4 md:grid-cols-[auto_minmax(0,1fr)_auto]"
    : "grid gap-3 rounded-[22px] border border-[#E5EAF0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.025)] md:grid-cols-[auto_minmax(0,1fr)_auto]";

  return (
    <article className={cardClassName}>
      <span className={getTaskBadgeClassName(isDarkTheme, task.badge)}>
        {task.badge === "ai" ? "AI跟" : task.badge === "copy" ? "跟单" : "模拟"}
      </span>
      <div className="min-w-0">
        <h3 className={getPanelSubtitleClassName(isDarkTheme)}>
          {task.title}
        </h3>
        <p className={getPanelDescriptionClassName(isDarkTheme)}>
          {task.subtitle}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 md:justify-end">
        <MetricInline
          isDarkTheme={isDarkTheme}
          label={copy.workspace.aiFollow.amount}
          value={task.amountText}
        />
        <MetricInline
          isDarkTheme={isDarkTheme}
          label={copy.workspace.kolFollow.stats.pnl}
          tone={task.pnlTone}
          value={task.pnlText}
        />
        <MetricInline
          isDarkTheme={isDarkTheme}
          label={copy.kol.filters.status}
          value={task.statusText}
        />
        <button
          className={getSecondaryButtonClassName(isDarkTheme)}
          type="button"
          onClick={() => onTaskAction(task, "view")}
        >
          {copy.workspace.running.taskActions.view}
        </button>
        <button
          className={getGhostButtonClassName(isDarkTheme)}
          type="button"
          onClick={() => onTaskAction(task, task.action)}
        >
          {copy.workspace.running.taskActions[task.action]}
        </button>
      </div>
    </article>
  );
}

export function TradePlanModal({
  copy,
  isConfirmed,
  isDarkTheme,
  record,
  signal,
  onClose,
  onConfirmedChange,
  onLiveStart,
  onSimulationStart,
}: {
  copy: WorkspaceCopy;
  isConfirmed: boolean;
  isDarkTheme: boolean;
  record: PaperPositionRecord | null;
  signal: StructuredSignal | null;
  onClose: () => void;
  onConfirmedChange: (isConfirmed: boolean) => void;
  onLiveStart: () => void;
  onSimulationStart: () => void;
}) {
  if (!signal) {
    return null;
  }

  const modalClassName = isDarkTheme
    ? "max-h-[90vh] w-[min(1120px,96vw)] overflow-y-auto rounded-[28px] border border-white/[0.08] bg-[#181A20] text-slate-100 shadow-[0_24px_72px_rgba(0,0,0,0.42)]"
    : "max-h-[90vh] w-[min(1120px,96vw)] overflow-y-auto rounded-[28px] border border-[#E5EAF0] bg-white text-slate-950 shadow-[0_22px_64px_rgba(15,23,42,0.16)]";
  const planMode = createAiFollowPlanMode(record, copy);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/42 p-4 backdrop-blur-[6px]">
      <div className={modalClassName}>
        <div className={isDarkTheme ? "sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/[0.075] bg-[#181A20]/98 px-5 py-4 backdrop-blur-xl" : "sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E5EAF0] bg-white/98 px-5 py-4 backdrop-blur-xl"}>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {copy.workspace.aiFollow.title}
            </h2>
            <p className={getPanelDescriptionClassName(isDarkTheme)}>
              {copy.workspace.aiFollow.subtitle}
            </p>
          </div>
          <button className={getIconButtonClassName(isDarkTheme)} type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="p-4">
          <div className="grid gap-2 md:grid-cols-3">
            {copy.workspace.aiFollow.steps.map((step, index) => (
              <div
                key={step}
                className={
                  index < 2
                    ? isDarkTheme
                      ? "flex h-10 items-center justify-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 text-sm font-semibold text-sky-200"
                      : "flex h-10 items-center justify-center gap-2 rounded-full border border-[#CDEFFF] bg-[#F1FBFF] text-sm font-semibold text-[#087EBB]"
                    : isDarkTheme
                      ? "flex h-10 items-center justify-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 text-sm font-semibold text-amber-200"
                      : "flex h-10 items-center justify-center gap-2 rounded-full border border-[#FFEFC5] bg-[#FFF8E8] text-sm font-semibold text-[#8B5B00]"
                }
              >
                <span>{index + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)]">
            <div>
              <div className={getInnerPanelClassName(isDarkTheme)}>
                <div className="flex flex-wrap gap-2">
                  <span className={getSignalDirectionBadgeClass(isDarkTheme, signal.direction)}>
                    {copy.kol.directionShort[signal.direction]}
                  </span>
                  <span className={getSignalPaperPositionBadgeClass(isDarkTheme, record)}>
                    {formatSignalPaperPositionStatus(record, null, copy.paper)}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold tracking-tight">
                  {planMode.title}
                </h3>
                <p className={getPanelDescriptionClassName(isDarkTheme)}>
                  {planMode.description}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <MetricTile
                    isDarkTheme={isDarkTheme}
                    label={copy.workspace.aiFollow.entryMode}
                    value={planMode.entryMode}
                  />
                  <MetricTile
                    isDarkTheme={isDarkTheme}
                    label={copy.workspace.aiFollow.amount}
                    value={copy.workspace.aiFollow.amountOptions[0]}
                  />
                  <MetricTile
                    isDarkTheme={isDarkTheme}
                    label={copy.workspace.aiFollow.risk}
                    value={copy.workspace.aiFollow.riskOptions[1]}
                  />
                  <MetricTile
                    isDarkTheme={isDarkTheme}
                    label={copy.workspace.aiFollow.mode}
                    value={copy.workspace.aiFollow.modeOptions[0]}
                  />
                </div>
              </div>
              <ConfigChoiceGroup
                copy={copy.workspace.aiFollow.amount}
                isDarkTheme={isDarkTheme}
                options={copy.workspace.aiFollow.amountOptions}
              />
              <ConfigChoiceGroup
                activeIndex={0}
                copy={copy.workspace.aiFollow.mode}
                isDarkTheme={isDarkTheme}
                options={copy.workspace.aiFollow.modeOptions}
              />
              <ConfigChoiceGroup
                activeIndex={1}
                copy={copy.workspace.aiFollow.risk}
                isDarkTheme={isDarkTheme}
                options={copy.workspace.aiFollow.riskOptions}
              />
            </div>
            <div>
              <div className={getInnerPanelClassName(isDarkTheme)}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold tracking-tight">
                    {copy.workspace.aiFollow.planSummary}
                  </h3>
                  <span className={getInfoPillClassName(isDarkTheme)}>
                    {planMode.badge}
                  </span>
                </div>
                <div className="space-y-2">
                  <PlanLine
                    isDarkTheme={isDarkTheme}
                    label={copy.kol.filters.symbol}
                    value={formatSymbolLabel(signal.symbol)}
                  />
                  <PlanLine
                    isDarkTheme={isDarkTheme}
                    label={copy.workspace.aiFollow.trigger}
                    value={formatSignalEntryText(signal, copy)}
                  />
                  <PlanLine
                    isDarkTheme={isDarkTheme}
                    label={copy.workspace.aiFollow.stopLoss}
                    value={signal.stop_loss?.toLocaleString("en-US") ?? "--"}
                  />
                  <PlanLine
                    isDarkTheme={isDarkTheme}
                    label={copy.workspace.aiFollow.takeProfit}
                    value={formatTakeProfitText(signal.take_profit, copy)}
                  />
                  <PlanLine
                    isDarkTheme={isDarkTheme}
                    label={copy.workspace.running.title}
                    value={copy.workspace.aiFollow.planAfter}
                  />
                </div>
              </div>
              <label className={isDarkTheme ? "mt-3 flex gap-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3 text-sm text-slate-300" : "mt-3 flex gap-3 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3 text-sm text-slate-600"}>
                <input
                  checked={isConfirmed}
                  className="mt-1"
                  type="checkbox"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    onConfirmedChange(event.target.checked)
                  }
                />
                <span>{copy.workspace.aiFollow.confirmText}</span>
              </label>
              <div className={isConfirmed ? getReadyStateClassName(isDarkTheme) : getLockedStateClassName(isDarkTheme)}>
                <b>{isConfirmed ? copy.workspace.aiFollow.confirmed : copy.workspace.aiFollow.actionsLocked}</b>
                <span>{copy.workspace.aiFollow.liveRequiresApi}</span>
              </div>
              <div className="sticky bottom-0 mt-4 grid gap-2 bg-inherit pt-3 sm:grid-cols-2">
                <button
                  className={isConfirmed ? getSecondaryButtonClassName(isDarkTheme) : getDisabledButtonClassName(isDarkTheme)}
                  disabled={!isConfirmed}
                  type="button"
                  onClick={onSimulationStart}
                >
                  {copy.workspace.aiFollow.simAction}
                </button>
                <button
                  className={isConfirmed ? getPrimaryButtonClassName() : getDisabledButtonClassName(isDarkTheme)}
                  disabled={!isConfirmed}
                  type="button"
                  onClick={onLiveStart}
                >
                  {copy.workspace.aiFollow.liveAction}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigChoiceGroup({
  activeIndex = 0,
  copy,
  isDarkTheme,
  options,
}: {
  activeIndex?: number;
  copy: string;
  isDarkTheme: boolean;
  options: readonly string[];
}) {
  return (
    <div className="mt-4">
      <h3 className={getPanelSubtitleClassName(isDarkTheme)}>{copy}</h3>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {options.map((option, index) => (
          <button
            key={option}
            className={
              index === activeIndex
                ? isDarkTheme
                  ? "h-10 rounded-2xl border border-sky-400/35 bg-sky-400/10 text-sm font-semibold text-sky-200"
                  : "h-10 rounded-2xl border border-[#CDEFFF] bg-[#F1FBFF] text-sm font-semibold text-[#087EBB]"
                : isDarkTheme
                  ? "h-10 rounded-2xl border border-white/[0.075] bg-white/[0.035] text-sm font-semibold text-slate-300"
                  : "h-10 rounded-2xl border border-[#E5EAF0] bg-white text-sm font-semibold text-slate-600"
            }
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BinanceGuideModal({
  copy,
  isDarkTheme,
  onClose,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  onClose: () => void;
}) {
  const modalClassName = isDarkTheme
    ? "w-[min(720px,94vw)] rounded-[28px] border border-white/[0.08] bg-[#181A20] p-5 text-slate-100 shadow-[0_24px_72px_rgba(0,0,0,0.42)]"
    : "w-[min(720px,94vw)] rounded-[28px] border border-[#E5EAF0] bg-white p-5 text-slate-950 shadow-[0_22px_64px_rgba(15,23,42,0.16)]";

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/42 p-4 backdrop-blur-[6px]">
      <div className={modalClassName}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {copy.workspace.binanceGuide.title}
            </h2>
            <p className={getPanelDescriptionClassName(isDarkTheme)}>
              {copy.workspace.binanceGuide.description}
            </p>
          </div>
          <button className={getIconButtonClassName(isDarkTheme)} type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {copy.workspace.binanceGuide.steps.map((step, index) => (
            <div key={step} className={getInnerPanelClassName(isDarkTheme)}>
              <div className={isDarkTheme ? "text-xs font-semibold text-sky-300" : "text-xs font-semibold text-[#008DCC]"}>
                Step {index + 1}
              </div>
              <div className={isDarkTheme ? "mt-2 text-sm font-semibold text-slate-100" : "mt-2 text-sm font-semibold text-slate-900"}>
                {step}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <h3 className={getPanelSubtitleClassName(isDarkTheme)}>
            {copy.workspace.binanceGuide.ipLabel}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {BINANCE_PLATFORM_IPS.map((ip) => (
              <span key={ip} className={getWarningPillClassName(isDarkTheme)}>
                {ip}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {copy.workspace.binanceGuide.checks.map((check) => (
            <div key={check} className={getSuccessTileClassName(isDarkTheme)}>
              {check}
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className={getSecondaryButtonClassName(isDarkTheme)} type="button" onClick={onClose}>
            {copy.workspace.binanceGuide.closeAction}
          </button>
          <button className={getPrimaryButtonClassName()} type="button" onClick={onClose}>
            {copy.workspace.binanceGuide.nextAction}
          </button>
        </div>
      </div>
    </div>
  );
}

function BinanceGuideCard({
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
      <h3 className={getPanelSubtitleClassName(isDarkTheme)}>
        {copy.workspace.running.apiCardTitle}
      </h3>
      <p className={getPanelDescriptionClassName(isDarkTheme)}>
        {copy.workspace.running.apiCardDescription}
      </p>
      <div className={isDarkTheme ? "mt-3 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-3 text-sm font-semibold text-sky-200" : "mt-3 rounded-2xl border border-[#CDEFFF] bg-[#F1FBFF] p-3 text-sm font-semibold text-[#087EBB]"}>
        {copy.workspace.binanceGuide.description}
      </div>
      <button className={`${getPrimaryButtonClassName()} mt-3 w-full`} type="button" onClick={onOpen}>
        {copy.workspace.running.apiCardAction}
      </button>
    </section>
  );
}

function PlanLine({
  isDarkTheme,
  label,
  value,
}: {
  isDarkTheme: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className={isDarkTheme ? "grid gap-1 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 sm:grid-cols-[100px_minmax(0,1fr)]" : "grid gap-1 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2 sm:grid-cols-[100px_minmax(0,1fr)]"}>
      <span className={isDarkTheme ? "text-xs font-medium text-slate-500" : "text-xs font-medium text-slate-400"}>
        {label}
      </span>
      <b className={isDarkTheme ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-slate-800"}>
        {value}
      </b>
    </div>
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
    <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2"}>
      <div className={isDarkTheme ? "text-[11px] text-slate-500" : "text-[11px] text-slate-400"}>
        {label}
      </div>
      <div className={getMetricValueClassName(isDarkTheme, tone)}>
        {value}
      </div>
    </div>
  );
}

function MetricInline({
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
    <div className="min-w-[70px]">
      <div className={isDarkTheme ? "text-[11px] text-slate-500" : "text-[11px] text-slate-400"}>
        {label}
      </div>
      <div className={getMetricValueClassName(isDarkTheme, tone)}>
        {value}
      </div>
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
    <div className={isDarkTheme ? "rounded-[22px] border border-white/[0.075] bg-white/[0.035] p-6 text-sm text-slate-400" : "rounded-[22px] border border-[#E5EAF0] bg-white p-6 text-sm text-slate-500"}>
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
        .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
      const records = sortedSignals
        .map((signal) => paperPositionsBySignalId[signal.id])
        .filter(Boolean);
      const pnlValues = records
        .map((record) => record.pnlPercent)
        .filter((value): value is number => value !== null);
      const totalPnl = pnlValues.reduce((sum, value) => sum + value, 0);
      const activeCount = records.filter((record) => record.status === "entered").length;
      const latestSignal = sortedSignals[0];

      return {
        activeCount,
        avatarUrl: latestSignal.source_avatar_url,
        latestSignal,
        name,
        pnlText: pnlValues.length > 0 ? formatSignedPercent(totalPnl) : "--",
        pnlTone: getTone(totalPnl, pnlValues.length),
        signalCount: sortedSignals.length,
        symbols: Array.from(new Set(sortedSignals.map((signal) => signal.symbol))),
      };
    })
    .sort((left, right) => right.signalCount - left.signalCount)
    .slice(0, 6);
}

function createRunningTaskModels(
  signals: readonly StructuredSignal[],
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>,
  copy: WorkspaceCopy,
): RunningTaskModel[] {
  const sortedSignals = signals
    .slice()
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
  const aiTasks = sortedSignals.slice(0, 2).map((signal, index) => {
    const record = paperPositionsBySignalId[signal.id] ?? null;
    const pnlPercent = record?.pnlPercent ?? signal.pnl ?? null;
    return {
      action: record?.status === "exited" ? "stop" : "pause",
      amountText: index === 0 ? "100U" : "500U",
      badge: index === 0 ? "ai" : "sim",
      pnlText: formatSignedPercent(pnlPercent),
      pnlTone: getTone(pnlPercent, pnlPercent === null ? 0 : 1),
      sourceSignal: signal,
      statusText: formatSignalPaperPositionStatus(record, null, copy.paper),
      subtitle: `${formatSymbolLabel(signal.symbol)} · ${signal.source_name} · ${copy.workspace.aiFollow.riskOptions[index === 0 ? 1 : 0]}`,
      title: `${formatSymbolLabel(signal.symbol)} ${copy.kol.directionFull[signal.direction]} · ${signal.source_name}`,
    } satisfies RunningTaskModel;
  });
  const kolModels = createKolFollowModels(signals, paperPositionsBySignalId);
  const copyTasks = kolModels.slice(0, 2).map((model, index) => ({
    action: "stop",
    amountText: index === 0 ? "500U" : "100U",
    badge: "copy",
    pnlText: model.pnlText,
    pnlTone: model.pnlTone,
    sourceSignal: model.latestSignal,
    statusText: model.activeCount > 0 ? copy.paper.statusEntered : copy.paper.statusNotEntered,
    subtitle: `${copy.workspace.kolFollow.heroTitle} · ${copy.workspace.aiFollow.modeOptions[0]} · ${copy.workspace.aiFollow.riskOptions[0]}`,
    title: `${copy.workspace.copyTrading} ${model.name}`,
  }) satisfies RunningTaskModel);

  return [...aiTasks, ...copyTasks].slice(0, 4);
}

function createAiFollowPlanMode(
  record: PaperPositionRecord | null,
  copy: WorkspaceCopy,
): {
  badge: string;
  description: string;
  entryMode: string;
  title: string;
} {
  if (!record || record.status === "invalid") {
    return copy.workspace.aiFollow.planModes.observe;
  }

  if (record.status === "not-entered") {
    return copy.workspace.aiFollow.planModes.executable;
  }

  return copy.workspace.aiFollow.planModes.simulation;
}

function getTone(value: number | null, sampleSize: number): "default" | "negative" | "positive" {
  if (sampleSize === 0 || value === null || value === 0) {
    return "default";
  }

  return value > 0 ? "positive" : "negative";
}

function formatSignalEntryText(signal: StructuredSignal, copy: WorkspaceCopy): string {
  if (signal.entry_type === "range") {
    const values = [signal.entry_min, signal.entry_max]
      .filter((value): value is number => value !== null)
      .map((value) => value.toLocaleString("en-US"));
    return values.length > 0 ? values.join("-") : copy.kol.marketPrice;
  }

  return signal.trigger_price?.toLocaleString("en-US") ?? copy.kol.marketPrice;
}

function formatTakeProfitText(
  takeProfits: readonly number[],
  copy: WorkspaceCopy,
): string {
  if (takeProfits.length === 0) {
    return "--";
  }

  return takeProfits
    .map((price, index) => `${copy.kol.takeProfitLevel(index + 1)} ${price.toLocaleString("en-US")}`)
    .join(" / ");
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

function getWarningPillClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "kol-signal-pill kol-signal-pill-dark kol-status-pending"
    : "kol-signal-pill kol-status-pending";
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

function getGhostButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "motion-fx-1-nav-button inline-flex h-10 items-center justify-center rounded-full px-2 text-sm font-semibold text-slate-400 transition hover:text-sky-300"
    : "motion-fx-1-nav-button inline-flex h-10 items-center justify-center rounded-full px-2 text-sm font-semibold text-slate-500 transition hover:text-[#008DCC]";
}

function getDisabledButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "inline-flex h-10 cursor-not-allowed items-center justify-center rounded-full border border-white/[0.075] bg-white/[0.045] px-4 text-sm font-semibold text-slate-600"
    : "inline-flex h-10 cursor-not-allowed items-center justify-center rounded-full border border-[#E5EAF0] bg-[#E8EEF5] px-4 text-sm font-semibold text-slate-400";
}

function getIconButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/[0.075] bg-white/[0.035] text-xl text-slate-300 transition hover:bg-white/[0.08] hover:text-sky-300"
    : "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#E5EAF0] bg-[#F8FAFC] text-xl text-slate-600 transition hover:border-[#B7E8FC] hover:bg-[#EAF8FE] hover:text-[#008DCC]";
}

function getReadyStateClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200"
    : "mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#C6F1DF] bg-[#F2FFF9] p-3 text-sm text-[#0F8F68]";
}

function getLockedStateClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3 text-sm text-slate-400"
    : "mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3 text-sm text-slate-500";
}

function getSuccessTileClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-3 text-center text-sm font-semibold text-emerald-200"
    : "rounded-2xl border border-[#C6F1DF] bg-[#F2FFF9] px-3 py-3 text-center text-sm font-semibold text-[#0F8F68]";
}

function getTaskBadgeClassName(
  isDarkTheme: boolean,
  badge: RunningTaskModel["badge"],
): string {
  const baseClassName = "grid h-14 w-14 shrink-0 place-items-center rounded-[18px] text-center text-xs font-bold";

  if (badge === "copy") {
    return `${baseClassName} ${isDarkTheme ? "bg-orange-400/20 text-orange-200" : "bg-orange-100 text-orange-700"}`;
  }

  if (badge === "sim") {
    return `${baseClassName} ${isDarkTheme ? "bg-emerald-400/20 text-emerald-200" : "bg-emerald-100 text-emerald-700"}`;
  }

  return `${baseClassName} ${isDarkTheme ? "bg-sky-400/20 text-sky-200" : "bg-[#EAF8FE] text-[#087EBB]"}`;
}
