"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function PercentInput({
  copyLabel,
  fieldName,
  isDarkTheme,
  placeholder,
  value,
  onChange,
}: {
  copyLabel: string;
  fieldName: string;
  isDarkTheme: boolean;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `copy-trading-${fieldName}`;

  return (
    <div className="block">
      <Label className={getPrototypeLabelClassName(isDarkTheme)} htmlFor={id}>{copyLabel}</Label>
      <div className="relative mt-2">
        <Input
          className={cn(
            "h-12 rounded-2xl pr-8 text-sm font-black",
            isDarkTheme
              ? "border-white/[0.075] bg-white/[0.035] text-slate-100 focus-visible:border-indigo-400/45 focus-visible:ring-indigo-400/10"
              : "border-[#E8E8EC] bg-white text-slate-950 focus-visible:border-[#818CF8] focus-visible:ring-[#6366F1]/10",
          )}
          id={id}
          inputMode="decimal"
          name={id}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className={isDarkTheme ? "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500" : "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400"}>%</span>
      </div>
    </div>
  );
}

export function PrototypeInput({
  autoComplete,
  fieldName,
  inputMode,
  isDarkTheme,
  label,
  placeholder,
  type = "text",
  value,
  onChange,
}: {
  autoComplete?: string;
  fieldName: string;
  inputMode?: "decimal" | "numeric" | "text";
  isDarkTheme: boolean;
  label: string;
  placeholder?: string;
  type?: "password" | "text";
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `copy-trading-api-${fieldName}`;

  return (
    <div className="block">
      <Label className={getPrototypeLabelClassName(isDarkTheme)} htmlFor={id}>{label}</Label>
      <Input
        autoComplete={autoComplete}
        className={cn(
          "mt-2 h-12 rounded-2xl text-sm font-semibold",
          isDarkTheme
            ? "border-white/[0.075] bg-white/[0.035] text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-400/45 focus-visible:ring-indigo-400/10"
            : "border-[#E8E8EC] bg-white text-slate-950 placeholder:text-slate-400 focus-visible:border-[#818CF8] focus-visible:ring-[#6366F1]/10",
        )}
        id={id}
        inputMode={inputMode}
        name={id}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function getPrototypeLabelClassName(isDarkTheme: boolean): string {
  return isDarkTheme ? "text-xs font-black text-slate-300" : "text-xs font-black text-slate-700";
}
