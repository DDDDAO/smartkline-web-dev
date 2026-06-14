export type ThemeClasses = ReturnType<typeof getThemeClasses>;

export function getThemeClasses(isDarkTheme: boolean) {
  return {
    borderColor: isDarkTheme ? "border-white/[0.08]" : "border-[#dfe7f1]",
    calculatedValue: isDarkTheme
      ? "flex h-9 flex-1 items-center rounded-xl border border-white/[0.08] bg-white/[0.045] px-2 text-xs font-black text-[#00d4aa] shadow-inner shadow-black/10"
      : "flex h-9 flex-1 items-center rounded-xl border border-[#dfe7f1] bg-[#f4f7fb] px-2 text-xs font-black text-[#008d72] shadow-inner shadow-slate-200/60",
    card: isDarkTheme
      ? "mb-3 rounded-[22px] border border-white/[0.08] bg-[#2d2d3a]/90 p-3 text-[#e8e8ed] shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur"
      : "mb-3 rounded-[22px] border border-[#dfe7f1] bg-white/95 p-3 text-[#1a1a1f] shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur",
    countdownItem: isDarkTheme
      ? "flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.045] px-3 py-2"
      : "flex items-center justify-between rounded-xl border border-[#dfe7f1] bg-[#f4f7fb] px-3 py-2",
    emptyState: isDarkTheme ? "py-3 text-center text-[10px] text-[#a0a0b0]" : "py-3 text-center text-[10px] text-[#6b6b7a]",
    titleCard: isDarkTheme
      ? "mb-3 rounded-[28px] border border-white/[0.08] bg-[radial-gradient(circle_at_20%_16%,rgba(0,212,170,0.16),transparent_32%),linear-gradient(135deg,rgba(45,45,58,0.96),rgba(31,31,42,0.96))] p-4 text-[#e8e8ed] shadow-[0_24px_70px_rgba(0,0,0,0.32)]"
      : "mb-3 rounded-[28px] border border-[#dfe7f1] bg-[radial-gradient(circle_at_18%_14%,rgba(0,212,170,0.16),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.96))] p-4 text-[#1a1a1f] shadow-[0_24px_70px_rgba(15,23,42,0.10)]",
    hintBox: isDarkTheme ? "bg-white/[0.045] text-[#a0a0b0]" : "bg-[#f4f7fb] text-[#6b6b7a]",
    iconButton: isDarkTheme
      ? "grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.09] bg-white/[0.045] text-[#e8e8ed] transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
      : "grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#dfe7f1] bg-white text-[#1a1a1f] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f4f7fb]",
    inlinePrice: isDarkTheme
      ? "flex h-9 items-center rounded-xl border border-[#00d4aa]/25 bg-[#00d4aa]/10 px-2 text-[11px] font-black text-[#7df8dd]"
      : "flex h-9 items-center rounded-xl border border-[#00d4aa]/25 bg-[#00d4aa]/10 px-2 text-[11px] font-black text-[#007e68]",
    input: isDarkTheme
      ? "h-9 min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.045] px-2 text-xs text-[#e8e8ed] outline-none transition focus:border-[#00d4aa] focus:bg-white/[0.07]"
      : "h-9 min-w-0 flex-1 rounded-xl border border-[#dfe7f1] bg-[#f4f7fb] px-2 text-xs text-[#1a1a1f] outline-none transition focus:border-[#00d4aa] focus:bg-white",
    klineCard: isDarkTheme
      ? "mb-3 rounded-[22px] border border-white/[0.08] bg-black/12 p-3 shadow-inner shadow-white/[0.025]"
      : "mb-3 rounded-[22px] border border-white/80 bg-white/80 p-3 shadow-inner shadow-white/80",
    klineAxisBadge:
      "pointer-events-none absolute right-1 top-1/2 z-10 min-w-[64px] -translate-y-1/2 rounded-md bg-[#35bd85] px-2 py-1 text-right text-white shadow-[0_8px_18px_rgba(0,0,0,0.14)]",
    klineIntervalGroup: isDarkTheme
      ? "inline-flex min-h-8 w-max flex-wrap items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.045] p-0.5"
      : "inline-flex min-h-8 w-max flex-wrap items-center gap-1 rounded-xl border border-[#dfe7f1] bg-[#f4f7fb] p-0.5",
    klineIntervalButton: isDarkTheme
      ? "h-7 rounded-lg px-2.5 text-[11px] font-black text-[#a0a0b0] transition hover:bg-white/[0.08] hover:text-[#e8e8ed]"
      : "h-7 rounded-lg px-2.5 text-[11px] font-black text-[#667085] transition hover:bg-white hover:text-[#1a1a1f]",
    klineIntervalButtonActive: "h-7 rounded-lg bg-[#00d4aa] px-2.5 text-[11px] font-black text-[#18181f] shadow-[0_8px_20px_rgba(0,212,170,0.22)]",
    klineMessage: isDarkTheme ? "mt-2 text-[10px] font-semibold text-[#a0a0b0]" : "mt-2 text-[10px] font-semibold text-[#667085]",
    klineMetric: isDarkTheme
      ? "rounded-xl border border-white/[0.07] bg-white/[0.04] px-2 py-1.5"
      : "rounded-xl border border-[#edf1f6] bg-[#f8fafc] px-2 py-1.5 shadow-sm",
    microLabel: isDarkTheme ? "text-[10px] font-black uppercase tracking-[0.16em] text-[#a0a0b0]" : "text-[10px] font-black uppercase tracking-[0.16em] text-[#667085]",
    miniKlineCanvas: isDarkTheme
      ? "h-[260px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#20202a]"
      : "h-[260px] overflow-hidden rounded-2xl border border-[#dfe7f1] bg-[#f8fafc]",
    modal: isDarkTheme
      ? "max-h-[80vh] w-[min(360px,90vw)] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#2d2d3a] p-5 text-[#e8e8ed] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_0_40px_rgba(0,212,170,0.1)]"
      : "max-h-[80vh] w-[min(360px,90vw)] overflow-y-auto rounded-2xl border border-[#dfe7f1] bg-white p-5 text-[#1a1a1f] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_0_40px_rgba(0,212,170,0.1)]",
    modalCancelButton: isDarkTheme
      ? "h-9 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.045] text-xs font-semibold text-[#e8e8ed]"
      : "h-9 flex-1 rounded-xl border border-[#dfe7f1] bg-[#f4f7fb] text-xs font-semibold text-[#1a1a1f]",
    notice: isDarkTheme
      ? "mb-3 rounded-2xl border border-[#00d4aa]/20 bg-[#00d4aa]/10 px-3 py-2 text-xs font-semibold text-[#7df8dd]"
      : "mb-3 rounded-2xl border border-[#b8f1e5] bg-[#ecfffb] px-3 py-2 text-xs font-semibold text-[#007e68]",
    overviewItem: isDarkTheme
      ? "rounded-2xl border border-white/[0.07] bg-white/[0.045] px-2 py-2.5 text-center"
      : "rounded-2xl border border-[#edf1f6] bg-[#f8fafc] px-2 py-2.5 text-center shadow-sm",
    overviewLabel: isDarkTheme ? "text-[10px] text-[#a0a0b0]" : "text-[10px] text-[#6b6b7a]",
    page: isDarkTheme
      ? "min-h-dvh bg-[radial-gradient(circle_at_top_left,rgba(0,212,170,0.12),transparent_32%),linear-gradient(180deg,#20202a_0%,#252530_45%,#1f1f2a_100%)] text-[#e8e8ed] transition-colors"
      : "min-h-dvh bg-[radial-gradient(circle_at_top_left,rgba(0,212,170,0.16),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f8f8fb_42%,#eef3f8_100%)] text-[#1a1a1f] transition-colors",
    quote: isDarkTheme ? "text-[11px] font-semibold text-[#a0a0b0]" : "text-[11px] font-semibold text-[#5d6675]",
    symbolDropdown: isDarkTheme
      ? "absolute left-0 top-10 z-[120] max-h-[min(62dvh,22rem)] w-[min(360px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-white/[0.09] bg-[#181A20] p-1 shadow-[0_24px_70px_rgba(0,0,0,0.36)]"
      : "absolute left-0 top-10 z-[120] max-h-[min(62dvh,22rem)] w-[min(360px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-[#dfe7f1] bg-white p-1 shadow-[0_24px_70px_rgba(15,23,42,0.14)]",
    symbolOption: isDarkTheme
      ? "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#e8e8ed] transition hover:bg-white/[0.08]"
      : "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#1a1a1f] transition hover:bg-[#f4f7fb]",
    symbolOptionActive: isDarkTheme
      ? "flex w-full items-center justify-between rounded-xl bg-[#00d4aa] px-3 py-2 text-left text-xs font-black text-[#18181f]"
      : "flex w-full items-center justify-between rounded-xl bg-[#00d4aa] px-3 py-2 text-left text-xs font-black text-[#18181f]",
    symbolOptionMeta: isDarkTheme ? "text-[11px] text-[#a0a0b0]" : "text-[11px] text-[#667085]",
    symbolPickerInput: isDarkTheme
      ? "h-9 min-w-0 w-full rounded-xl border border-white/[0.08] bg-white/[0.045] py-0 pl-8 pr-2 text-xs font-black uppercase text-[#e8e8ed] outline-none transition placeholder:font-semibold placeholder:text-[#8b8b9a] focus:border-[#00d4aa] focus:bg-white/[0.07]"
      : "h-9 min-w-0 w-full rounded-xl border border-[#dfe7f1] bg-[#f4f7fb] py-0 pl-8 pr-2 text-xs font-black uppercase text-[#1a1a1f] outline-none transition placeholder:font-semibold placeholder:text-[#8b8b9a] focus:border-[#00d4aa] focus:bg-white",
    symbolSearchMessage: isDarkTheme ? "px-3 py-3 text-xs text-[#a0a0b0]" : "px-3 py-3 text-xs text-[#667085]",
    secondaryText: isDarkTheme ? "text-[#a0a0b0]" : "text-[#6b6b7a]",
  };
}
