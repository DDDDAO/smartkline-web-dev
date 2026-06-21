export type JsonRecord = Record<string, unknown>;

export function createStrategyConfigSkeleton(schema?: JsonRecord): JsonRecord {
  const value = createDefaultValue(schema, true);
  return isRecord(value) ? value : {};
}

function createDefaultValue(schema: unknown, isRequired: boolean): unknown {
  if (!isRecord(schema)) return undefined;
  if (schema.default !== undefined) return JSON.parse(JSON.stringify(schema.default)) as unknown;
  if (schema.type === "object") return createObjectDefaultValue(schema, isRequired);
  if (schema.type === "array") return isRequired ? [] : undefined;
  return undefined;
}

function createObjectDefaultValue(schema: JsonRecord, isRequired: boolean): unknown {
  const properties = isRecord(schema.properties) ? schema.properties : {};
  const required = new Set(Array.isArray(schema.required) ? schema.required.map(String) : []);
  const output: JsonRecord = {};

  for (const [key, childSchema] of Object.entries(properties)) {
    const childValue = createDefaultValue(childSchema, required.has(key));
    if (childValue !== undefined) {
      output[key] = childValue;
    }
  }

  if (Object.keys(output).length > 0) {
    return output;
  }
  return isRequired ? {} : undefined;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
