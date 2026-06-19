export function MarioMiniMetric({ isDarkTheme, label, value }: {
  isDarkTheme: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3" : "rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] p-3"}>
      <div className={isDarkTheme ? "text-[11px] font-bold text-slate-500" : "text-[11px] font-bold text-slate-500"}>{label}</div>
      <div className="mt-1 font-mono text-sm font-black tabular-nums">{value}</div>
    </div>
  );
}
