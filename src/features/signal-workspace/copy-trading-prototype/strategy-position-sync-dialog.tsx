"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { WorkspaceCopy } from "@/i18n/workspace";
import { getInlineErrorClassName } from "./styles";

type StrategyPositionSyncDialogProps = {
  copy: WorkspaceCopy;
  error: string;
  isDarkTheme: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (ratioPercent: number) => Promise<void> | void;
};

export function StrategyPositionSyncDialog({
  copy,
  error,
  isDarkTheme,
  isSubmitting,
  onClose,
  onConfirm,
}: StrategyPositionSyncDialogProps) {
  const strategyCopy = copy.workspace.accountCenter.strategy;
  const [ratioPercent, setRatioPercent] = useState(strategyCopy.ratioPlaceholder);
  const [validationError, setValidationError] = useState("");
  const parsedRatioPercent = Number(ratioPercent);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!Number.isFinite(parsedRatioPercent) || parsedRatioPercent <= 0) {
      setValidationError(strategyCopy.syncPositionsRatioRequired);
      return;
    }

    setValidationError("");
    await onConfirm(parsedRatioPercent);
  };

  return (
    <Sheet open onOpenChange={(open) => {
      if (!open && !isSubmitting) {
        onClose();
      }
    }}>
      <SheetContent
        aria-label={strategyCopy.syncPositionsTitle}
        className={isDarkTheme
          ? "inset-x-0 bottom-0 h-auto overflow-hidden rounded-t-[30px] border-white/[0.085] bg-[#111820] p-0 text-slate-100 shadow-[0_-26px_88px_rgba(15,23,42,0.26)] sm:inset-x-3 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:max-w-[520px] sm:-translate-y-1/2 sm:rounded-[30px] sm:shadow-[0_30px_90px_rgba(15,23,42,0.26)]"
          : "inset-x-0 bottom-0 h-auto overflow-hidden rounded-t-[30px] border-[#E8E8EC] bg-white p-0 text-slate-950 shadow-[0_-26px_88px_rgba(15,23,42,0.26)] sm:inset-x-3 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:max-w-[520px] sm:-translate-y-1/2 sm:rounded-[30px] sm:shadow-[0_30px_90px_rgba(15,23,42,0.26)]"}
        side="bottom"
      >
        <form className="flex min-h-0 flex-col" onSubmit={submit}>
          <SheetHeader className={isDarkTheme ? "border-b border-white/[0.075]" : "border-b border-[#E8E8EC]"}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <SheetTitle className="text-xl font-black tracking-tight">{strategyCopy.syncPositionsTitle}</SheetTitle>
                <SheetDescription className={isDarkTheme ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-600"}>
                  {strategyCopy.syncPositionsDescription}
                </SheetDescription>
              </div>
              <Button aria-label={copy.common.close} className={getIconButtonClassName(isDarkTheme)} disabled={isSubmitting} size="icon" type="button" variant="outline" onClick={onClose}>
                <span aria-hidden="true" className="text-lg leading-none">×</span>
              </Button>
            </div>
          </SheetHeader>

          <div className="px-4 py-4 sm:px-5 sm:py-5">
            <Card className={getSectionClassName(isDarkTheme)}>
              <Label className={isDarkTheme ? "text-xs font-black text-slate-300" : "text-xs font-black text-slate-700"} htmlFor="strategy-position-sync-ratio">
                {strategyCopy.ratioPercent}
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  id="strategy-position-sync-ratio"
                  className={isDarkTheme ? "bg-white/[0.04] text-slate-100" : "bg-white"}
                  disabled={isSubmitting}
                  inputMode="decimal"
                  min="0.0001"
                  placeholder={strategyCopy.ratioPlaceholder}
                  step="any"
                  type="number"
                  value={ratioPercent}
                  onChange={(event) => {
                    setRatioPercent(event.target.value);
                    setValidationError("");
                  }}
                />
                <span className={isDarkTheme ? "text-sm font-black text-slate-400" : "text-sm font-black text-slate-500"}>%</span>
              </div>
              <p className={isDarkTheme ? "mt-3 text-xs leading-5 text-slate-500" : "mt-3 text-xs leading-5 text-slate-500"}>
                {strategyCopy.syncPositionsRatioHint}
              </p>
              {validationError ? <p className={`${getInlineErrorClassName(isDarkTheme)} mt-3`}>{validationError}</p> : null}
              {error ? <p className={`${getInlineErrorClassName(isDarkTheme)} mt-3`}>{error}</p> : null}
            </Card>
          </div>

          <SheetFooter className={isDarkTheme ? "grid grid-cols-2 gap-2 border-t border-white/[0.075] pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex" : "grid grid-cols-2 gap-2 border-t border-[#E8E8EC] pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex"}>
            <Button className={getSoftButtonClassName(isDarkTheme)} disabled={isSubmitting} type="button" variant="outline" onClick={onClose}>
              {copy.common.close}
            </Button>
            <Button className={getPrimaryButtonClassName(isDarkTheme)} disabled={isSubmitting} type="submit">
              {isSubmitting ? strategyCopy.syncingPositions : strategyCopy.syncPositionsConfirm}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function getSectionClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "gap-0 rounded-[24px] border-white/[0.075] bg-white/[0.035] p-4 text-slate-100 shadow-none"
    : "gap-0 rounded-[24px] border-[#E8E8EC] bg-[#FAFAFA] p-4 text-slate-950 shadow-none";
}

function getIconButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-full border-white/[0.075] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-slate-50"
    : "rounded-full border-[#E8E8EC] bg-white text-slate-500 hover:border-[#C7D2FE] hover:text-slate-900";
}

function getPrimaryButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "min-h-10 rounded-2xl bg-indigo-400 px-4 text-sm font-black text-slate-950 hover:bg-indigo-300"
    : "min-h-10 rounded-2xl bg-[#6366F1] px-4 text-sm font-black text-white hover:bg-[#4F46E5]";
}

function getSoftButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "min-h-10 rounded-2xl border-white/[0.075] bg-white/[0.04] px-4 text-sm font-black text-slate-200 hover:bg-white/[0.08]"
    : "min-h-10 rounded-2xl border-[#E8E8EC] bg-white px-4 text-sm font-black text-slate-700 hover:border-[#C7D2FE] hover:bg-[#F5F5FF] hover:text-slate-950";
}
