"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { WorkspaceCopy } from "@/i18n/workspace";
import { NOTIFICATION_CHANNELS } from "./constants";

export function NotificationSettingsPlaceholder({
  copy,
  isDarkTheme,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
}) {
  const accountCopy = copy.workspace.accountCenter;
  const notificationCopy = accountCopy.notifications;

  return (
    <Card className={isDarkTheme ? "gap-0 rounded-[28px] border-white/[0.075] bg-white/[0.035] p-4 text-slate-100 shadow-none" : "gap-0 rounded-[28px] border-[#E5EAF0] bg-white p-4 text-slate-950 shadow-sm"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-black">{notificationCopy.title}</h2>
          <p className={isDarkTheme ? "mt-1 max-w-3xl text-xs leading-5 text-slate-400" : "mt-1 max-w-3xl text-xs leading-5 text-slate-600"}>
            {notificationCopy.description}
          </p>
        </div>
        <Badge className={getNotificationUnavailableBadgeClassName(isDarkTheme)}>
          {notificationCopy.unavailable}
        </Badge>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {NOTIFICATION_CHANNELS.map((channel) => (
          <NotificationChannelCard
            key={channel.key}
            channel={channel}
            copy={copy}
            isDarkTheme={isDarkTheme}
          />
        ))}
      </div>
    </Card>
  );
}

export function NotificationChannelCard({
  channel,
  copy,
  isDarkTheme,
}: {
  channel: typeof NOTIFICATION_CHANNELS[number];
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
}) {
  const notificationCopy = copy.workspace.accountCenter.notifications;
  const channelCopy = notificationCopy.channels[channel.key];
  const cardClassName = isDarkTheme
    ? "overflow-hidden rounded-[24px] border border-white/[0.075] bg-[#111820]"
    : "overflow-hidden rounded-[24px] border border-[#E5EAF0] bg-white shadow-sm";
  const mutedPanelClassName = isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3"
    : "rounded-2xl border border-[#E5EAF0] bg-[#FAFBFD] p-3";
  const inputClassName = isDarkTheme
    ? "mt-2 h-11 cursor-not-allowed rounded-xl border-white/[0.075] bg-white/[0.025] text-sm font-semibold text-slate-500 placeholder:text-slate-700"
    : "mt-2 h-11 cursor-not-allowed rounded-xl border-[#E5EAF0] bg-[#F8FAFC] text-sm font-semibold text-slate-500 placeholder:text-slate-400";

  return (
    <Card className={`${cardClassName} gap-0 py-0`}>
      <div className={isDarkTheme ? "border-b border-white/[0.075] p-4" : "border-b border-[#EEF2F6] p-4"}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className={getNotificationIconClassName(isDarkTheme)} aria-hidden="true">
              {channel.icon}
            </span>
            <div className="min-w-0">
              <h3 className={isDarkTheme ? "truncate text-sm font-black text-slate-100" : "truncate text-sm font-black text-slate-950"}>
                {channelCopy.title}
              </h3>
              <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-500" : "mt-1 text-xs leading-5 text-slate-600"}>
                {channelCopy.description}
              </p>
            </div>
          </div>
          <Badge className={getNotificationUnavailableBadgeClassName(isDarkTheme)}>
            {notificationCopy.unavailable}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 p-4">
        <div className={mutedPanelClassName}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className={isDarkTheme ? "text-sm font-black text-slate-200" : "text-sm font-black text-slate-800"}>
                {notificationCopy.enableChannel}
              </div>
              <div className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-500" : "mt-1 text-xs leading-5 text-slate-500"}>
                {notificationCopy.enableDescription}
              </div>
            </div>
            <Switch
              aria-label={notificationCopy.enableChannel}
              checked={false}
              className={isDarkTheme ? "cursor-not-allowed bg-white/[0.06] opacity-60" : "cursor-not-allowed bg-slate-200 opacity-70"}
              disabled
            />
          </div>
        </div>

        <div className="block">
          <Label className={getLabelClassName(isDarkTheme)}>{notificationCopy.displayName}</Label>
          <Input
            className={inputClassName}
            disabled
            readOnly
            value={channelCopy.defaultName}
          />
        </div>

        {channel.requiresWebhookUrl ? (
          <div className="block">
            <Label className={getLabelClassName(isDarkTheme)}>{notificationCopy.webhookUrl}</Label>
            <Input
              className={inputClassName}
              disabled
              placeholder={notificationCopy.webhookPlaceholder}
              readOnly
              value=""
            />
            <div className={isDarkTheme ? "mt-2 text-xs font-bold text-amber-300" : "mt-2 text-xs font-bold text-amber-600"}>
              {notificationCopy.unavailableHint}
            </div>
          </div>
        ) : (
          <div className={mutedPanelClassName}>
            <div className={isDarkTheme ? "text-xs leading-5 text-slate-400" : "text-xs leading-5 text-slate-600"}>
              {notificationCopy.telegramHint}
            </div>
          </div>
        )}
      </div>

      <div className={isDarkTheme ? "flex items-center justify-between gap-3 border-t border-white/[0.075] px-4 py-3" : "flex items-center justify-between gap-3 border-t border-[#EEF2F6] px-4 py-3"}>
        <span className={isDarkTheme ? "text-xs text-slate-500" : "text-xs text-slate-500"}>
          {notificationCopy.placeholderStatus}
        </span>
        <Button className={getPrimaryButtonClassName(isDarkTheme)} disabled type="button">
          {notificationCopy.save}
        </Button>
      </div>
    </Card>
  );
}

function getPrimaryButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-2xl bg-sky-400 text-slate-950 hover:bg-sky-300"
    : "rounded-2xl bg-[#16AFF5] text-white hover:bg-[#008DCC]";
}

function getNotificationUnavailableBadgeClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "shrink-0 rounded-full border-0 bg-amber-400/15 px-2.5 py-1 text-[11px] font-black text-amber-300"
    : "shrink-0 rounded-full border-0 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700";
}

function getNotificationIconClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/[0.075] bg-white/[0.035] text-base"
    : "grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[#E5EAF0] bg-[#FAFBFD] text-base";
}

function getLabelClassName(isDarkTheme: boolean): string {
  return isDarkTheme ? "text-xs font-black text-slate-300" : "text-xs font-black text-slate-700";
}
