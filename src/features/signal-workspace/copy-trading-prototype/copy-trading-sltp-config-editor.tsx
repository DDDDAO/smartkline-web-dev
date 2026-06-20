"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { ReactNode } from "react";

type JsonRecord = Record<string, unknown>;
type SltpSettingKey = "singlePositionSL" | "singlePositionTP";
type SltpType = "percent" | "unPnl";
type TrailingMode = "price" | "unPnl";

export function CopyTradingSltpConfigEditor({
  advancedEnabled,
  config,
  copy,
  isDarkTheme,
  onConfigChange,
}: {
  advancedEnabled: boolean;
  config: JsonRecord;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  onConfigChange: (nextConfig: JsonRecord) => void;
}) {
  if (!advancedEnabled) {
    return null;
  }

  const strategyCreateCopy = copy.workspace.accountCenter.strategyCreate;
  const schemaCopy = copy.workspace.accountCenter.strategySchema;
  const labels = schemaCopy.fieldLabels;
  const cardClassName = isDarkTheme
    ? "border-white/[0.075] bg-white/[0.035] text-slate-100"
    : "border-[#E8E8EC] bg-[#FAFAFA] text-slate-950";

  return (
    <Card className={`gap-0 rounded-2xl py-0 shadow-none ${cardClassName}`}>
      <CardHeader className="gap-2 px-3 py-3">
        <CardTitle className="text-sm font-black">{strategyCreateCopy.copyTradingAdvancedSltpTitle}</CardTitle>
        <CardDescription className={isDarkTheme ? "text-xs leading-5 text-slate-400" : "text-xs leading-5 text-slate-600"}>
          {strategyCreateCopy.copyTradingAdvancedSltpDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3">
        <Separator className={isDarkTheme ? "bg-white/[0.075]" : "bg-[#E8E8EC]"} />
        <SltpSettingSection
          config={config}
          copy={copy}
          defaultValue={5}
          isDarkTheme={isDarkTheme}
          settingKey="singlePositionSL"
          title={labels.singlePositionSL}
          onConfigChange={onConfigChange}
        />
        <SltpSettingSection
          config={config}
          copy={copy}
          defaultValue={10}
          isDarkTheme={isDarkTheme}
          settingKey="singlePositionTP"
          title={labels.singlePositionTP}
          onConfigChange={onConfigChange}
        />
        <TrailingSlSection
          config={config}
          copy={copy}
          isDarkTheme={isDarkTheme}
          title={labels.singlePositionTrailingSL}
          onConfigChange={onConfigChange}
        />
      </CardContent>
    </Card>
  );
}

function SltpSettingSection({
  config,
  copy,
  defaultValue,
  isDarkTheme,
  settingKey,
  title,
  onConfigChange,
}: {
  config: JsonRecord;
  copy: WorkspaceCopy;
  defaultValue: number;
  isDarkTheme: boolean;
  settingKey: SltpSettingKey;
  title: string;
  onConfigChange: (nextConfig: JsonRecord) => void;
}) {
  const schemaCopy = copy.workspace.accountCenter.strategySchema;
  const labels = schemaCopy.fieldLabels;
  const setting = readSltpSetting(config, settingKey);
  const enabled = setting.enabled === true;
  const type = normalizeSltpType(setting.type);
  const value = stringifyOptionalNumber(setting.value);

  const updateSetting = (patch: JsonRecord) => {
    onConfigChange(updateSltpSetting(config, settingKey, {
      ...(enabled ? defaultSltpSetting(setting, defaultValue) : { enabled: false }),
      ...setting,
      ...patch,
    }));
  };

  return (
    <section className={getSectionClassName(isDarkTheme)}>
      <SettingHeader
        checked={enabled}
        title={title}
        onCheckedChange={(checked) => onConfigChange(updateSltpSetting(
          config,
          settingKey,
          checked ? defaultSltpSetting(setting, defaultValue) : { enabled: false },
        ))}
      />
      {enabled ? (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
          <SelectField
            isDarkTheme={isDarkTheme}
            label={labels.type}
            value={type}
            onValueChange={(nextType) => updateSetting({ type: nextType })}
          >
            <SelectItem value="percent">{schemaCopy.percentPlaceholder}</SelectItem>
            <SelectItem value="unPnl">{copy.workspace.accountCenter.strategy.unrealizedPnl}</SelectItem>
          </SelectField>
          <NumberField
            isDarkTheme={isDarkTheme}
            label={labels.value}
            placeholder={schemaCopy.percentPlaceholder}
            value={value}
            onChange={(nextValue) => updateSetting({ value: parseOptionalNumberInput(nextValue) })}
          />
        </div>
      ) : null}
    </section>
  );
}

function TrailingSlSection({
  config,
  copy,
  isDarkTheme,
  title,
  onConfigChange,
}: {
  config: JsonRecord;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  title: string;
  onConfigChange: (nextConfig: JsonRecord) => void;
}) {
  const schemaCopy = copy.workspace.accountCenter.strategySchema;
  const labels = schemaCopy.fieldLabels;
  const setting = readSltpSetting(config, "singlePositionTrailingSL");
  const enabled = setting.enabled === true;
  const mode = normalizeTrailingMode(setting.mode);
  const activation = readRecord(setting.activation);

  const updateSetting = (patch: JsonRecord) => {
    onConfigChange(updateSltpSetting(config, "singlePositionTrailingSL", {
      ...(enabled ? defaultTrailingSetting(setting) : { enabled: false }),
      ...setting,
      ...patch,
    }));
  };

  return (
    <section className={getSectionClassName(isDarkTheme)}>
      <SettingHeader
        checked={enabled}
        title={title}
        onCheckedChange={(checked) => onConfigChange(updateSltpSetting(
          config,
          "singlePositionTrailingSL",
          checked ? defaultTrailingSetting(setting) : { enabled: false },
        ))}
      />
      {enabled ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            isDarkTheme={isDarkTheme}
            label={labels.mode}
            value={mode}
            onValueChange={(nextMode) => updateSetting(normalizeTrailingModePatch(setting, nextMode as TrailingMode))}
          >
            <SelectItem value="price">{schemaCopy.pricePlaceholder}</SelectItem>
            <SelectItem value="unPnl">{copy.workspace.accountCenter.strategy.unrealizedPnl}</SelectItem>
          </SelectField>
          <NumberField
            isDarkTheme={isDarkTheme}
            label={`${labels.activation} · ${labels.value}`}
            placeholder={mode === "price" ? schemaCopy.pricePlaceholder : schemaCopy.percentPlaceholder}
            value={stringifyOptionalNumber(activation.value)}
            onChange={(nextValue) => updateSetting({
              activation: {
                ...activation,
                value: parseOptionalNumberInput(nextValue),
              },
            })}
          />
          <NumberField
            isDarkTheme={isDarkTheme}
            label={mode === "price" ? labels.callbackPercent : labels.callbackValue}
            placeholder={mode === "price" ? schemaCopy.percentPlaceholder : labels.value}
            value={stringifyOptionalNumber(mode === "price" ? setting.callbackPercent : setting.callbackValue)}
            onChange={(nextValue) => updateSetting({
              [mode === "price" ? "callbackPercent" : "callbackValue"]: parseOptionalNumberInput(nextValue),
            })}
          />
          <NumberField
            isDarkTheme={isDarkTheme}
            label={labels.reducePercent}
            placeholder={schemaCopy.percentPlaceholder}
            value={stringifyOptionalNumber(setting.reducePercent)}
            onChange={(nextValue) => updateSetting({ reducePercent: parseOptionalNumberInput(nextValue) })}
          />
        </div>
      ) : null}
    </section>
  );
}

function SettingHeader({
  checked,
  title,
  onCheckedChange,
}: {
  checked: boolean;
  title: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h4 className="text-sm font-black">{title}</h4>
      <div className="flex items-center gap-2">
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}

function SelectField({
  children,
  isDarkTheme,
  label,
  value,
  onValueChange,
}: {
  children: ReactNode;
  isDarkTheme: boolean;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className={getLabelClassName(isDarkTheme)}>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={getInputClassName(isDarkTheme)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={isDarkTheme ? "border-white/[0.075] bg-[#111820] text-slate-100" : "border-[#E8E8EC] bg-white text-slate-950"}>
          {children}
        </SelectContent>
      </Select>
    </div>
  );
}

function NumberField({
  isDarkTheme,
  label,
  placeholder,
  value,
  onChange,
}: {
  isDarkTheme: boolean;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className={getLabelClassName(isDarkTheme)}>{label}</Label>
      <Input
        className={getInputClassName(isDarkTheme)}
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function validateCopyTradingAdvancedSltpConfig({
  advancedEnabled,
  config,
  copy,
}: {
  advancedEnabled: boolean;
  config: JsonRecord;
  copy: WorkspaceCopy;
}): string[] {
  if (!advancedEnabled) {
    return [];
  }

  const labels = copy.workspace.accountCenter.strategySchema.fieldLabels;
  const errors: string[] = [];
  collectSltpSettingErrors(errors, readSltpSetting(config, "singlePositionSL"), labels.singlePositionSL);
  collectSltpSettingErrors(errors, readSltpSetting(config, "singlePositionTP"), labels.singlePositionTP);
  collectTrailingErrors(errors, readSltpSetting(config, "singlePositionTrailingSL"), labels.singlePositionTrailingSL);
  return errors;
}

export function hasCopyTradingAdvancedSltpConfig(config: JsonRecord): boolean {
  return ["singlePositionSL", "singlePositionTP", "singlePositionTrailingSL"].some((key) => {
    const setting = readSltpSetting(config, key);
    return Object.keys(setting).length > 0 && !Object.values(setting).every((value) => value === undefined || value === null || value === "");
  });
}

function collectSltpSettingErrors(errors: string[], setting: JsonRecord, label: string) {
  if (setting.enabled !== true) {
    return;
  }
  if (!["percent", "unPnl"].includes(String(setting.type))) {
    errors.push(`${label}: type is required.`);
  }
  if (!isPositiveNumber(setting.value)) {
    errors.push(`${label}: value must be greater than 0.`);
  }
}

function collectTrailingErrors(errors: string[], setting: JsonRecord, label: string) {
  if (setting.enabled !== true) {
    return;
  }
  const mode = String(setting.mode);
  const activation = readRecord(setting.activation);
  if (!["price", "unPnl"].includes(mode)) {
    errors.push(`${label}: mode is required.`);
  }
  if (!isNonNegativeNumber(activation.value)) {
    errors.push(`${label}: activation value must be nonnegative.`);
  }
  if (mode === "price" && !isPositiveNumber(setting.callbackPercent)) {
    errors.push(`${label}: callback percent must be greater than 0.`);
  }
  if (mode === "unPnl" && !isPositiveNumber(setting.callbackValue)) {
    errors.push(`${label}: callback value must be greater than 0.`);
  }
  if (setting.reducePercent !== undefined && (!isPositiveNumber(setting.reducePercent) || Number(setting.reducePercent) > 100)) {
    errors.push(`${label}: reduce percent must be > 0 and <= 100.`);
  }
}

function updateSltpSetting(config: JsonRecord, settingKey: string, setting: JsonRecord): JsonRecord {
  const nextConfig = cloneRecord(config);
  const common = readRecord(nextConfig.common);
  const sltp = readRecord(common.sltp);
  sltp[settingKey] = cleanSetting(setting);
  common.sltp = sltp;
  nextConfig.common = common;
  return nextConfig;
}

function normalizeTrailingModePatch(setting: JsonRecord, nextMode: TrailingMode): JsonRecord {
  const patch: JsonRecord = { mode: nextMode };
  if (nextMode === "price") {
    patch.callbackPercent = firstPositiveNumber(setting.callbackPercent, setting.callbackValue, 1);
    patch.callbackValue = undefined;
  } else {
    patch.callbackValue = firstPositiveNumber(setting.callbackValue, setting.callbackPercent, 1);
    patch.callbackPercent = undefined;
  }
  return patch;
}

function defaultSltpSetting(setting: JsonRecord, defaultValue: number): JsonRecord {
  return {
    enabled: true,
    type: normalizeSltpType(setting.type),
    value: firstPositiveNumber(setting.value, defaultValue),
  };
}

function defaultTrailingSetting(setting: JsonRecord): JsonRecord {
  const mode = normalizeTrailingMode(setting.mode);
  return {
    activation: { value: firstNonNegativeNumber(readRecord(setting.activation).value, 0) },
    callbackPercent: mode === "price" ? firstPositiveNumber(setting.callbackPercent, 1) : undefined,
    callbackValue: mode === "unPnl" ? firstPositiveNumber(setting.callbackValue, 1) : undefined,
    enabled: true,
    mode,
    reducePercent: normalizeOptionalPositiveNumber(setting.reducePercent),
  };
}

function cleanSetting(setting: JsonRecord): JsonRecord {
  return Object.fromEntries(Object.entries(setting).filter(([, value]) => value !== undefined));
}

function readSltpSetting(config: JsonRecord, settingKey: string): JsonRecord {
  return readRecord(readRecord(readRecord(config.common).sltp)[settingKey]);
}

function normalizeSltpType(value: unknown): SltpType {
  return value === "unPnl" ? "unPnl" : "percent";
}

function normalizeTrailingMode(value: unknown): TrailingMode {
  return value === "unPnl" ? "unPnl" : "price";
}

function parseOptionalNumberInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function stringifyOptionalNumber(value: unknown): string {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numeric) ? String(value) : "";
}

function firstPositiveNumber(...values: unknown[]): number {
  return Number(values.find(isPositiveNumber));
}

function firstNonNegativeNumber(...values: unknown[]): number {
  return Number(values.find(isNonNegativeNumber));
}

function normalizeOptionalPositiveNumber(value: unknown): number | undefined {
  return isPositiveNumber(value) ? Number(value) : undefined;
}

function isPositiveNumber(value: unknown): boolean {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0;
}

function isNonNegativeNumber(value: unknown): boolean {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0;
}

function cloneRecord(value: JsonRecord): JsonRecord {
  return JSON.parse(JSON.stringify(value)) as JsonRecord;
}

function readRecord(value: unknown): JsonRecord {
  return isRecord(value) ? cloneRecord(value) : {};
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getSectionClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "space-y-3 rounded-2xl border border-white/[0.075] bg-[#0F131A]/70 p-3"
    : "space-y-3 rounded-2xl border border-[#E8E8EC] bg-white p-3";
}

function getLabelClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "text-[11px] uppercase tracking-[0.13em] text-slate-500"
    : "text-[11px] uppercase tracking-[0.13em] text-slate-400";
}

function getInputClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "h-12 border-white/[0.075] bg-white/[0.035] text-slate-100"
    : "h-12 border-[#E8E8EC] bg-white text-slate-950";
}
