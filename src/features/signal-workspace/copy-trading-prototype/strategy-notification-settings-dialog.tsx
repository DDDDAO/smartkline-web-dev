"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import type { WorkspaceCopy } from "@/i18n/workspace";
import { STRATEGY_NOTIFICATION_EVENTS } from "./constants";
import { BellGlyph, PlusGlyph, SaveGlyph } from "./icons";

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
    : "rounded-2xl border border-dashed border-[#E8E8EC] bg-[#FAFAFA] px-4 py-5 text-sm font-bold text-slate-500";
  const eventCardClassName = isDarkTheme
    ? "flex min-h-[72px] items-start gap-3 rounded-2xl border border-white/[0.075] bg-white/[0.025] p-3 opacity-70"
    : "flex min-h-[72px] items-start gap-3 rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] p-3 opacity-75";

  return (
    <Sheet open onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <SheetContent
        aria-label={strategyCopy.notificationSettingsTitle}
        className={isDarkTheme
          ? "inset-x-0 bottom-0 h-[92dvh] overflow-hidden rounded-t-[30px] border-white/[0.085] bg-[#111820] p-0 text-slate-100 shadow-[0_-26px_88px_rgba(15,23,42,0.26)] sm:inset-x-3 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:h-[min(820px,calc(100dvh-1rem))] sm:max-w-[980px] sm:-translate-y-1/2 sm:rounded-[30px] sm:shadow-[0_30px_90px_rgba(15,23,42,0.26)]"
          : "inset-x-0 bottom-0 h-[92dvh] overflow-hidden rounded-t-[30px] border-[#E8E8EC] bg-white p-0 text-slate-950 shadow-[0_-26px_88px_rgba(15,23,42,0.26)] sm:inset-x-3 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:h-[min(820px,calc(100dvh-1rem))] sm:max-w-[980px] sm:-translate-y-1/2 sm:rounded-[30px] sm:shadow-[0_30px_90px_rgba(15,23,42,0.26)]"}
        side="bottom"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <SheetHeader className={isDarkTheme ? "border-b border-white/[0.075]" : "border-b border-[#E8E8EC]"}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className={getNotificationModalIconClassName(isDarkTheme)}>
                  <BellGlyph />
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <SheetTitle className="text-xl font-black tracking-tight">{strategyCopy.notificationSettingsTitle}</SheetTitle>
                    <Badge className={getNotificationUnavailableBadgeClassName(isDarkTheme)}>
                      {notificationCopy.unavailable}
                    </Badge>
                  </div>
                  <SheetDescription className={isDarkTheme ? "mt-2 max-w-3xl text-sm leading-6 text-slate-400" : "mt-2 max-w-3xl text-sm leading-6 text-slate-600"}>
                    {strategyCopy.notificationSettingsDescription}
                  </SheetDescription>
                </div>
              </div>
              <Button aria-label={copy.common.close} className={getIconButtonClassName(isDarkTheme)} size="icon" type="button" variant="outline" onClick={onClose}>
                <span aria-hidden="true" className="text-lg leading-none">×</span>
              </Button>
            </div>
          </SheetHeader>

          <div className="kol-scroll-area min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            <Card className={getModalSectionClassName(isDarkTheme)}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black">{strategyCopy.notificationEnableTitle}</h3>
                  <p className={isDarkTheme ? "mt-1 text-sm leading-6 text-slate-400" : "mt-1 text-sm leading-6 text-slate-600"}>
                    {strategyCopy.notificationEnableDescription}
                  </p>
                </div>
                <Switch checked={false} className={isDarkTheme ? "bg-white/[0.08] opacity-60" : "bg-slate-200 opacity-70"} disabled />
              </div>
            </Card>

            <Card className={getModalSectionClassName(isDarkTheme)}>
              <h3 className="text-base font-black">{strategyCopy.notificationChannelsTitle}</h3>
              <p className={isDarkTheme ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-600"}>
                {strategyCopy.notificationChannelsDescription}
              </p>
              <div className={`${emptyPanelClassName} mt-4`}>
                {strategyCopy.notificationChannelsEmpty}
              </div>
            </Card>

            <Card className={getModalSectionClassName(isDarkTheme)}>
              <h3 className="text-base font-black">{strategyCopy.notificationEventsTitle}</h3>
              <p className={isDarkTheme ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-600"}>
                {strategyCopy.notificationEventsDescription}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {STRATEGY_NOTIFICATION_EVENTS.map((event) => {
                  const eventCopy = strategyCopy.notificationEvents[event.key];

                  return (
                    <div key={event.key} className={eventCardClassName}>
                      <Checkbox checked={false} className={isDarkTheme ? "mt-0.5 border-white/[0.12] bg-white/[0.02]" : "mt-0.5 border-[#E8E8EC] bg-white"} disabled />
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
            </Card>

            <Card className={getModalSectionClassName(isDarkTheme)}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black">{strategyCopy.notificationThresholdTitle}</h3>
                  <p className={isDarkTheme ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-600"}>
                    {strategyCopy.notificationThresholdDescription}
                  </p>
                </div>
                <Button className={getSoftButtonClassName(isDarkTheme)} disabled type="button" variant="outline">
                  <PlusGlyph />
                  {strategyCopy.notificationAddThreshold}
                </Button>
              </div>
              <div className={`${emptyPanelClassName} mt-4`}>
                {strategyCopy.notificationThresholdEmpty}
              </div>
            </Card>
          </div>

          <SheetFooter className={isDarkTheme ? "flex-col gap-3 border-t border-white/[0.075] pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between" : "flex-col gap-3 border-t border-[#E8E8EC] pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between"}>
            <p className={isDarkTheme ? "text-sm leading-6 text-slate-500" : "text-sm leading-6 text-slate-500"}>
              {strategyCopy.notificationFooterHint}
            </p>
            <Button className={getNotificationSaveButtonClassName(isDarkTheme)} disabled type="button">
              <SaveGlyph />
              {strategyCopy.notificationSaveSettings}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function getModalSectionClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "gap-0 rounded-[24px] border-white/[0.075] bg-white/[0.035] p-4 text-slate-100 shadow-none"
    : "gap-0 rounded-[24px] border-[#E8E8EC] bg-white p-4 text-slate-950 shadow-sm";
}

function getIconButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-full border-white/[0.075] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-slate-50"
    : "rounded-full border-[#E8E8EC] bg-white text-slate-500 hover:border-[#C7D2FE] hover:text-slate-900";
}

function getNotificationSaveButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "min-h-10 rounded-2xl bg-[#D97955] px-4 text-sm font-black text-slate-950 hover:bg-[#E08A67]"
    : "min-h-10 rounded-2xl bg-[#C95F3F] px-4 text-sm font-black text-white hover:bg-[#B95034]";
}

function getNotificationUnavailableBadgeClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "shrink-0 rounded-full border-0 bg-amber-400/15 px-2.5 py-1 text-[11px] font-black text-amber-300"
    : "shrink-0 rounded-full border-0 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700";
}

function getNotificationModalIconClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/[0.075] bg-white/[0.035] text-slate-100"
    : "grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] text-slate-950";
}

function getSoftButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-2xl border-white/[0.075] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
    : "rounded-2xl border-[#E8E8EC] bg-white text-slate-700 hover:border-[#C7D2FE] hover:bg-[#F5F5FF] hover:text-slate-950";
}
