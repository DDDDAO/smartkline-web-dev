export function MiniMetric({ isDarkTheme, label, value, valueClassName }: { isDarkTheme: boolean; label: string; value: string; valueClassName?: string }) {
  const baseValueClassName = "mt-1 truncate text-xs font-black";
  const defaultValueColorClassName = isDarkTheme ? "text-slate-100" : "text-slate-900";
  return (
    <div className={isDarkTheme ? "rounded-xl border border-white/[0.06] bg-white/[0.035] px-2 py-2" : "rounded-xl border border-[#E8E8EC] bg-white px-2 py-2"}>
      <div className={isDarkTheme ? "text-[10px] font-semibold text-slate-500" : "text-[10px] font-semibold text-slate-400"}>{label}</div>
      <div className={`${baseValueClassName} ${valueClassName ?? defaultValueColorClassName}`}>{value}</div>
    </div>
  );
}
