export type JsonRecord = Record<string, unknown>;
export type UiCondition = { path?: string; eq?: unknown; ne?: unknown; in?: unknown[]; exists?: boolean };
export type UiField = JsonRecord & {
  description?: string;
  enabledWhen?: UiCondition;
  help?: string;
  label?: string;
  order?: number;
  path: string;
  visibleWhen?: UiCondition;
  widget?: string;
};
export type UiSectionSpec = JsonRecord & {
  description?: string;
  fields: UiField[];
  order?: number;
  title?: string;
};

export function fieldDefinitionsFromUiSchema(uiSchema: JsonRecord | undefined): Map<string, UiField> {
  const definitions = new Map<string, UiField>();
  const fields = isRecord(uiSchema?.fields) ? uiSchema.fields : {};

  for (const [path, fieldValue] of Object.entries(fields)) {
    if (!isRecord(fieldValue)) {
      definitions.set(path, { path });
      continue;
    }
    definitions.set(path, normalizeUiField({ ...fieldValue, path }));
  }

  return definitions;
}

export function normalizeUiSections(uiSchema: JsonRecord | undefined): UiSectionSpec[] | null {
  const sections = Array.isArray(uiSchema?.sections) ? uiSchema.sections : null;
  if (!sections) {
    return null;
  }

  const fieldDefinitions = fieldDefinitionsFromUiSchema(uiSchema);
  return sections
    .filter(isUiSectionRecord)
    .sort(compareUiRecords)
    .map((section) => ({
      ...section,
      fields: section.fields
        .map((field) => normalizeSectionField(field, fieldDefinitions))
        .filter((field): field is UiField => field !== null)
        .sort(compareUiFields),
    }));
}

export function normalizeUiFields(uiSchema: JsonRecord | undefined): UiField[] {
  return [...fieldDefinitionsFromUiSchema(uiSchema).values()].sort(compareUiFields);
}

export function normalizeUiField(value: JsonRecord & { path: string }): UiField {
  const description = typeof value.description === "string" ? value.description : undefined;
  return {
    ...value,
    help: typeof value.help === "string" ? value.help : description,
    path: value.path,
  };
}

export function compareUiFields(left: UiField, right: UiField): number {
  const leftOrder = typeof left.order === "number" ? left.order : Number.MAX_SAFE_INTEGER;
  const rightOrder = typeof right.order === "number" ? right.order : Number.MAX_SAFE_INTEGER;
  return leftOrder - rightOrder || left.path.localeCompare(right.path);
}

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeSectionField(field: unknown, fieldDefinitions: Map<string, UiField>): UiField | null {
  if (typeof field === "string" && field.trim()) {
    const path = field.trim();
    return fieldDefinitions.get(path) ?? { path };
  }
  if (!isRecord(field) || typeof field.path !== "string" || !field.path.trim()) {
    return null;
  }

  const path = field.path.trim();
  return normalizeUiField({
    ...(fieldDefinitions.get(path) ?? {}),
    ...field,
    path,
  });
}

function isUiSectionRecord(value: unknown): value is JsonRecord & { fields: unknown[] } {
  return isRecord(value) && Array.isArray(value.fields);
}

function compareUiRecords(left: JsonRecord, right: JsonRecord): number {
  const leftOrder = typeof left.order === "number" ? left.order : Number.MAX_SAFE_INTEGER;
  const rightOrder = typeof right.order === "number" ? right.order : Number.MAX_SAFE_INTEGER;
  return leftOrder - rightOrder;
}
