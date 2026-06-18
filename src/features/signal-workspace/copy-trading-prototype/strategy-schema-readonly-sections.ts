import type { WorkspaceLanguage } from "@/i18n/workspace";
import {
  hasSchemaDisplayDescription,
  hasSchemaDisplayLabel,
  schemaAtPath,
  schemaDisplayDescription,
  schemaDisplayLabel,
} from "./strategy-display-metadata";
import {
  compareUiFields,
  compareUiSections,
  hasReadableField,
  isReadonlyField,
  isRecord,
  isUiField,
  isUiSection,
  joinSectionTitle,
  labelForKey,
  type JsonRecord,
  type ReadonlyField,
  type StrategySchemaCopy,
  type UiCondition,
  type UiField,
  type UiSection,
} from "./strategy-schema-readonly-helpers";

export function createVisibleReadonlySections(sections: readonly UiSection[]): UiSection[] {
  const visibleSections: UiSection[] = [];
  for (const section of sections) {
    const fields = section.fields.filter((field) => hasReadableField(field.value));
    if (fields.length > 0) {
      visibleSections.push({ ...section, fields });
    }
  }

  return visibleSections;
}

export function createReadonlySections(
  schema: JsonRecord,
  uiSchema: JsonRecord | undefined,
  formData: JsonRecord,
  rendererCopy: StrategySchemaCopy,
  language: WorkspaceLanguage,
): UiSection[] {
  const uiSections = Array.isArray(uiSchema?.sections) ? uiSchema.sections : null;
  if (uiSections) {
    return createSectionsFromUiSections(schema, uiSections, formData, rendererCopy, language);
  }

  const branchSections = createBranchReadonlySections(schema, uiSchema, formData, rendererCopy, language);
  if (branchSections.length > 0) {
    return branchSections;
  }

  const properties = isRecord(schema.properties) ? schema.properties : {};
  return [{
    fields: Object.entries(properties).map(([key, childSchema]) => ({
      description: schemaDisplayDescription(childSchema, language),
      label: schemaDisplayLabel(childSchema, language, labelForKey(rendererCopy, key)),
      path: key,
      schema: isRecord(childSchema) ? childSchema : undefined,
      value: formData[key],
    })),
    title: schemaDisplayLabel(schema, language, rendererCopy.configurationFallbackTitle),
  }];
}

function createSectionsFromUiSections(
  schema: JsonRecord,
  uiSections: unknown[],
  formData: JsonRecord,
  rendererCopy: StrategySchemaCopy,
  language: WorkspaceLanguage,
  titlePrefix = "",
): UiSection[] {
  return uiSections
    .filter(isUiSection)
    .sort(compareUiSections)
    .map((section, index) => {
      const fields = section.fields.reduce<UiField[]>((uiFields, field) => {
        if (isUiField(field)) {
          uiFields.push(field);
        }
        return uiFields;
      }, []);
      fields.sort(compareUiFields);

      const sectionTitle = typeof section.title === "string" && section.title.trim()
        ? section.title
        : rendererCopy.sectionFallbackTitle(index + 1);
      return {
        description: typeof section.description === "string" ? section.description : undefined,
        fields: fields.reduce<ReadonlyField[]>((readonlyFields, field) => {
          const readonlyField = createReadonlyField(schema, field, formData, rendererCopy, language);
          if (isReadonlyField(readonlyField)) {
            readonlyFields.push(readonlyField);
          }
          return readonlyFields;
        }, []),
        title: titlePrefix ? `${titlePrefix} · ${sectionTitle}` : sectionTitle,
      };
    });
}

function createBranchReadonlySections(
  schema: JsonRecord,
  uiSchema: JsonRecord | undefined,
  formData: JsonRecord,
  rendererCopy: StrategySchemaCopy,
  language: WorkspaceLanguage,
): UiSection[] {
  const properties = isRecord(schema.properties) ? schema.properties : {};
  const branchSections: UiSection[] = [];
  for (const [branchKey, branchSchema] of Object.entries(properties)) {
    if (!isRecord(branchSchema) || !isRecord(branchSchema.properties)) {
      continue;
    }
    const branchData = isRecord(formData[branchKey]) ? formData[branchKey] : {};
    const branchUiSchema = isRecord(uiSchema?.[branchKey]) ? uiSchema[branchKey] : undefined;
    const branchTitle = schemaDisplayLabel(branchSchema, language, labelForKey(rendererCopy, branchKey));
    const branchUiSections = Array.isArray(branchUiSchema?.sections) ? branchUiSchema.sections : null;
    if (branchUiSections) {
      branchSections.push(...createSectionsFromUiSections(branchSchema, branchUiSections, branchData, rendererCopy, language, branchTitle));
      continue;
    }
    branchSections.push(...createSectionsFromObjectSchema(branchSchema, branchData, rendererCopy, language, branchTitle));
  }
  return branchSections;
}

function createSectionsFromObjectSchema(
  schema: JsonRecord,
  formData: JsonRecord,
  rendererCopy: StrategySchemaCopy,
  language: WorkspaceLanguage,
  titlePrefix = "",
): UiSection[] {
  const properties = isRecord(schema.properties) ? schema.properties : {};
  const scalarFields: ReadonlyField[] = [];
  const sections: UiSection[] = [];

  for (const [key, childSchema] of Object.entries(properties)) {
    const childRecord = isRecord(childSchema) ? childSchema : undefined;
    const value = formData[key];
    if (childRecord && isRecord(childRecord.properties)) {
      const childFields = Object.entries(childRecord.properties).map(([fieldKey, fieldSchema]) => createSchemaField({
        key: fieldKey,
        language,
        rendererCopy,
        schema: fieldSchema,
        value: isRecord(value) ? value[fieldKey] : undefined,
      }));
      sections.push({
        description: schemaDisplayDescription(childRecord, language),
        fields: childFields,
        title: joinSectionTitle(titlePrefix, schemaDisplayLabel(childRecord, language, labelForKey(rendererCopy, key))),
      });
      continue;
    }
    scalarFields.push(createSchemaField({ key, language, rendererCopy, schema: childSchema, value }));
  }

  if (scalarFields.length > 0) {
    sections.unshift({
      fields: scalarFields,
      title: titlePrefix || schemaDisplayLabel(schema, language, rendererCopy.configurationFallbackTitle),
    });
  }

  return sections;
}

function createSchemaField({
  key,
  language,
  rendererCopy,
  schema,
  value,
}: {
  key: string;
  language: WorkspaceLanguage;
  rendererCopy: StrategySchemaCopy;
  schema: unknown;
  value: unknown;
}): ReadonlyField {
  const schemaRecord = isRecord(schema) ? schema : undefined;
  return {
    description: schemaDisplayDescription(schemaRecord, language),
    label: schemaDisplayLabel(schemaRecord, language, labelForKey(rendererCopy, key)),
    path: key,
    schema: schemaRecord,
    value,
  };
}

function createReadonlyField(
  schema: JsonRecord,
  field: UiField,
  formData: JsonRecord,
  rendererCopy: StrategySchemaCopy,
  language: WorkspaceLanguage,
): ReadonlyField | null {
  if (field.visibleWhen && !evaluateCondition(field.visibleWhen, formData)) {
    return null;
  }
  const fieldSchema = schemaAtPath(schema, field.path);
  const fallbackKey = field.path.split(".").pop() ?? field.path;
  return {
    description: fieldSchema && hasSchemaDisplayDescription(fieldSchema) ? schemaDisplayDescription(fieldSchema, language) : typeof field.help === "string" ? field.help : schemaDisplayDescription(fieldSchema, language),
    label: fieldSchema && hasSchemaDisplayLabel(fieldSchema) ? schemaDisplayLabel(fieldSchema, language, labelForKey(rendererCopy, fallbackKey)) : typeof field.label === "string" ? field.label : schemaDisplayLabel(fieldSchema, language, labelForKey(rendererCopy, fallbackKey)),
    path: field.path,
    schema: fieldSchema ?? undefined,
    value: getValueAtPath(formData, field.path),
  };
}

function getValueAtPath(data: JsonRecord, path: string): unknown {
  let current: unknown = data;
  for (const part of path.split(".").filter(Boolean)) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
}

function evaluateCondition(condition: UiCondition, formData: JsonRecord): boolean {
  if (!condition.path) return true;
  const value = getValueAtPath(formData, condition.path);
  if (Object.prototype.hasOwnProperty.call(condition, "eq")) return value === condition.eq;
  if (Object.prototype.hasOwnProperty.call(condition, "ne")) return value !== condition.ne;
  if (Array.isArray(condition.in)) return condition.in.some((item) => item === value);
  if (typeof condition.exists === "boolean") return hasReadableField(value) === condition.exists;
  return true;
}
