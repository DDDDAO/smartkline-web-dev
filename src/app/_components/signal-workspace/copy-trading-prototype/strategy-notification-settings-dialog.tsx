"use client";

import type { WorkspaceCopy } from "@/i18n/workspace";
import { STRATEGY_NOTIFICATION_EVENTS } from "./constants";
import { BellGlyph, PlusGlyph, SaveGlyph } from "./icons";
import { getIconButtonClassName, getModalSectionClassName, getNotificationModalIconClassName, getNotificationSaveButtonClassName, getNotificationUnavailableBadgeClassName, getSoftButtonClassName } from "./styles";

export function StrategyNotificationSettingsDialog({
  copy,
  isDarkTheme,
  onClose,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  onClose: () => void;
}) {
  const notificationCopy = copy.workspace.accountCenter.notifications;
  const strategyCopy = copy.workspace.accountCenter.strategy;
  const emptyPanelClassName = isDarkTheme
    ? "rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.02] px-4 py-5 text-sm font-bold text-slate-500"
    : "rounded-2xl border border-dashed border-[#E5EAF0] bg-[#FAFBFD] px-4 py-5 text-sm font-bold text-slate-500";
  const eventCardClassName = isDarkTheme
    ? "flex min-h-[72px] items-start gap-3 rounded-2xl border border-white/[0.075] bg-white/[0.025] p-3 opacity-70"
    : "flex min-h-[72px] items-start gap-3 rounded-2xl border border-[#E5EAF0] bg-[#FAFBFD] p-3 opacity-75";
  const checkboxClassName = isDarkTheme
    ? "mt-0.5 h-4 w-4 shrink-0 rounded border border-white/[0.12] bg-white/[0.02]"
    : "mt-0.5 h-4 w-4 shrink-0 rounded border border-[#D5E4EF] bg-white";

  return (
    <>
      <button
        aria-label={copy.common.close}
        className={isDarkTheme ? "fixed inset-0 z-[125] bg-black/58 backdrop-blur-[5px]" : "fixed inset-0 z-[125] bg-slate-950/28 backdrop-blur-[5px]"}
        type="button"
        onClick={onClose}
      />
      <section
        aria-label={strategyCopy.notificationSettingsTitle}
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-[130] h-[92dvh] overflow-hidden rounded-t-[30px] shadow-[0_-26px_88px_rgba(15,23,42,0.26)] sm:inset-x-3 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:h-[min(820px,calc(100dvh-1rem))] sm:max-w-[980px] sm:-translate-y-1/2 sm:rounded-[30px] sm:shadow-[0_30px_90px_rgba(15,23,42,0.26)]"
        role="dialog"
      >
        <div className={isDarkTheme ? "flex h-full flex-col border border-white/[0.085] bg-[#111820] text-slate-100" : "flex h-full flex-col border border-[#D5E4EF] bg-white text-slate-950"}>
          <header className={isDarkTheme ? "border-b border-white/[0.075] px-4 py-4 sm:px-5 sm:py-5" : "border-b border-[#E5EAF0] px-4 py-4 sm:px-5 sm:py-5"}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className={getNotificationModalIconClassName(isDarkTheme)}>
                  <BellGlyph />
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black tracking-tight">{strategyCopy.notificationSettingsTitle}</h2>
                    <span className={getNotificationUnavailableBadgeClassName(isDarkTheme)}>
                      {notificationCopy.unavailable}
                    </span>
                  </div>
                  <p className={isDarkTheme ? "mt-2 max-w-3xl text-sm leading-6 text-slate-400" : "mt-2 max-w-3xl text-sm leading-6 text-slate-600"}>
                    {strategyCopy.notificationSettingsDescription}
                  </p>
                </div>
              </div>
              <button aria-label={copy.common.close} className={getIconButtonClassName(isDarkTheme)} type="button" onClick={onClose}>
                <span aria-hidden="true" className="text-lg leading-none">×</span>
              </button>
            </div>
          </header>

          <div className="kol-scroll-area min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            <section className={getModalSectionClassName(isDarkTheme)}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black">{strategyCopy.notificationEnableTitle}</h3>
                  <p className={isDarkTheme ? "mt-1 text-sm leading-6 text-slate-400" : "mt-1 text-sm leading-6 text-slate-600"}>
                    {strategyCopy.notificationEnableDescription}
                  </p>
                </div>
                <span className={isDarkTheme ? "relative h-7 w-12 shrink-0 rounded-full bg-white/[0.08] opacity-60" : "relative h-7 w-12 shrink-0 rounded-full bg-slate-200 opacity-70"} aria-hidden="true">
                  <span className={isDarkTheme ? "absolute left-1 top-1 h-5 w-5 rounded-full bg-slate-600" : "absolute left-1 top-1 h-5 w-5 rounded-full bg-white"} />
                </span>
              </div>
            </section>

            <section className={getModalSectionClassName(isDarkTheme)}>
              <h3 className="text-base font-black">{strategyCopy.notificationChannelsTitle}</h3>
              <p className={isDarkTheme ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-600"}>
                {strategyCopy.notificationChannelsDescription}
              </p>
              <div className={`${emptyPanelClassName} mt-4`}>
                {strategyCopy.notificationChannelsEmpty}
              </div>
            </section>

            <section className={getModalSectionClassName(isDarkTheme)}>
              <h3 className="text-base font-black">{strategyCopy.notificationEventsTitle}</h3>
              <p className={isDarkTheme ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-600"}>
                {strategyCopy.notificationEventsDescription}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {STRATEGY_NOTIFICATION_EVENTS.map((event) => {
                  const eventCopy = strategyCopy.notificationEvents[event.key];

                  return (
                    <div key={event.key} className={eventCardClassName}>
                      <span className={checkboxClassName} aria-hidden="true" />
                      <div className="min-w-0">
                        <div className={isDarkTheme ? "text-sm font-black text-slate-300" : "text-sm font-black text-slate-700"}>
                          {eventCopy}
                        </div>
                        <div className={isDarkTheme ? "mt-2 break-all text-xs font-semibold text-slate-500" : "mt-2 break-all text-xs font-semibold text-slate-400"}>
                          {event.code}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={getModalSectionClassName(isDarkTheme)}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black">{strategyCopy.notificationThresholdTitle}</h3>
                  <p className={isDarkTheme ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-600"}>
                    {strategyCopy.notificationThresholdDescription}
                  </p>
                </div>
                <button className={getSoftButtonClassName(isDarkTheme)} disabled type="button">
                  <PlusGlyph />
                  {strategyCopy.notificationAddThreshold}
                </button>
              </div>
              <div className={`${emptyPanelClassName} mt-4`}>
                {strategyCopy.notificationThresholdEmpty}
              </div>
            </section>
          </div>

          <footer className={isDarkTheme ? "flex flex-col gap-3 border-t border-white/[0.075] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-5" : "flex flex-col gap-3 border-t border-[#E5EAF0] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-5"}>
            <p className={isDarkTheme ? "text-sm leading-6 text-slate-500" : "text-sm leading-6 text-slate-500"}>
              {strategyCopy.notificationFooterHint}
            </p>
            <button className={getNotificationSaveButtonClassName(isDarkTheme)} disabled type="button">
              <SaveGlyph />
              {strategyCopy.notificationSaveSettings}
            </button>
          </footer>
        </div>
      </section>
    </>
  );
}
