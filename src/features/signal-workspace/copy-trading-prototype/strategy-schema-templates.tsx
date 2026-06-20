import type { FieldTemplateProps, FormContextType } from "@rjsf/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type RendererTemplateContext = FormContextType & { isDarkTheme?: boolean };

const FRAMED_WIDGETS = new Set(["array-table", "json", "percent-sum-table", "price-percent-ladder"]);

export function StrategyFieldTemplate({
  children,
  description,
  displayLabel,
  errors,
  help,
  hidden,
  id,
  label,
  rawErrors,
  registry,
  required,
  schema,
  uiSchema,
}: FieldTemplateProps) {
  if (hidden) {
    return <div className="hidden">{children}</div>;
  }

  const isDarkTheme = Boolean((registry.formContext as RendererTemplateContext | undefined)?.isDarkTheme);
  const widget = typeof uiSchema?.["ui:widget"] === "string" ? uiSchema["ui:widget"] : "";
  const isBooleanField = schema.type === "boolean" || widget === "checkbox" || widget === "switch";
  const isContainerField = schema.type === "object" || schema.type === "array";
  const shouldFrameField = Boolean(id !== "root" && (isContainerField || FRAMED_WIDGETS.has(widget)));
  const labelNode = displayLabel ? (
    <Label className={getLabelClassName(isDarkTheme)} htmlFor={id}>
      {label}{required ? " *" : ""}
    </Label>
  ) : null;
  const feedbackNode = rawErrors?.length ? <div className={getErrorClassName(isDarkTheme)}>{errors}</div> : null;

  if (isBooleanField && !shouldFrameField) {
    return (
      <div className={getBooleanFieldClassName(isDarkTheme)}>
        <div className="min-w-0 space-y-1">
          {labelNode}
          {description}
          {help}
          {feedbackNode}
        </div>
        <div className="shrink-0 pt-0.5">{children}</div>
      </div>
    );
  }

  const content = (
    <>
      {labelNode}
      {description}
      {children}
      {help}
      {feedbackNode}
    </>
  );

  if (!shouldFrameField) {
    return <div className="space-y-1.5">{content}</div>;
  }

  return (
    <Card className={getCardClassName(isDarkTheme)}>
      <CardContent className="space-y-2 px-0 py-0">{content}</CardContent>
    </Card>
  );
}

function getLabelClassName(isDarkTheme: boolean): string {
  return cn(
    "text-xs font-black uppercase tracking-[0.12em]",
    isDarkTheme ? "text-slate-400" : "text-slate-500",
  );
}

function getBooleanFieldClassName(isDarkTheme: boolean): string {
  return cn(
    "flex items-start justify-between gap-4 rounded-2xl border p-3",
    isDarkTheme
      ? "border-white/[0.075] bg-white/[0.035]"
      : "border-[#E8E8EC] bg-white shadow-sm",
  );
}

function getCardClassName(isDarkTheme: boolean): string {
  return cn(
    "gap-0 rounded-2xl border p-3 shadow-none",
    isDarkTheme
      ? "border-white/[0.075] bg-white/[0.035] text-slate-100"
      : "border-[#E8E8EC] bg-white text-slate-950",
  );
}

function getErrorClassName(isDarkTheme: boolean): string {
  return isDarkTheme ? "text-xs font-bold text-rose-300" : "text-xs font-bold text-rose-500";
}
