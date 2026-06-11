export const WORKSPACE_WATCHLIST_STORAGE_KEY = "smartkline:workspace-watchlist:v1";

export type WorkspaceWatchlistKolSource = {
  avatarUrl: string | null;
  favoritedAt: string;
  key: string;
  name: string;
  sourceType: string | null;
};

export type WorkspaceWatchlistTopSignalSource = {
  avatarUrl: string | null;
  favoritedAt: string;
  id: string;
  name: string;
  platform: string | null;
};

export type WorkspaceWatchlist = {
  kolSources: WorkspaceWatchlistKolSource[];
  topSignalSources: WorkspaceWatchlistTopSignalSource[];
  version: 1;
};

export type WorkspaceWatchlistParseResult = {
  shouldRewrite: boolean;
  watchlist: WorkspaceWatchlist;
};

export function createEmptyWorkspaceWatchlist(): WorkspaceWatchlist {
  return {
    kolSources: [],
    topSignalSources: [],
    version: 1,
  };
}

export function createKolSourceWatchKey(sourceName: string): string {
  return sourceName.trim().replace(/\s+/g, " ").toLowerCase();
}

export function parseWorkspaceWatchlistValue(
  value: string | null | undefined,
): WorkspaceWatchlistParseResult {
  if (!value) {
    return {
      shouldRewrite: false,
      watchlist: createEmptyWorkspaceWatchlist(),
    };
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    const migrated = normalizeWorkspaceWatchlist(parsed);
    return {
      shouldRewrite: true,
      watchlist: migrated,
    };
  } catch {
    return {
      shouldRewrite: true,
      watchlist: createEmptyWorkspaceWatchlist(),
    };
  }
}

export function serializeWorkspaceWatchlist(watchlist: WorkspaceWatchlist): string {
  return JSON.stringify(normalizeWorkspaceWatchlist(watchlist));
}

function normalizeWorkspaceWatchlist(value: unknown): WorkspaceWatchlist {
  if (!value || typeof value !== "object") {
    return createEmptyWorkspaceWatchlist();
  }

  const record = value as Record<string, unknown>;
  const kolSources = readKolSources(record);
  const topSignalSources = readTopSignalSources(record);

  return {
    kolSources,
    topSignalSources,
    version: 1,
  };
}

function readKolSources(record: Record<string, unknown>): WorkspaceWatchlistKolSource[] {
  if (Array.isArray(record.kolSources)) {
    return uniqueBy(
      record.kolSources
        .map((item) => readKolSourceEntry(item))
        .filter((item): item is WorkspaceWatchlistKolSource => item !== null),
      (item) => item.key,
    );
  }

  if (Array.isArray(record.kolSourceKeys)) {
    return uniqueBy(
      record.kolSourceKeys
        .map((item) => (typeof item === "string" ? item : ""))
        .map((key) => key.trim())
        .filter(Boolean)
        .map((key) => ({
          avatarUrl: null,
          favoritedAt: new Date(0).toISOString(),
          key: createKolSourceWatchKey(key),
          name: key,
          sourceType: null,
        })),
      (item) => item.key,
    );
  }

  return [];
}

function readTopSignalSources(record: Record<string, unknown>): WorkspaceWatchlistTopSignalSource[] {
  if (Array.isArray(record.topSignalSources)) {
    return uniqueBy(
      record.topSignalSources
        .map((item) => readTopSignalSourceEntry(item))
        .filter((item): item is WorkspaceWatchlistTopSignalSource => item !== null),
      (item) => item.id,
    );
  }

  if (Array.isArray(record.topSignalSourceIds)) {
    return uniqueBy(
      record.topSignalSourceIds
        .map((item) => (typeof item === "string" ? item : ""))
        .map((id) => id.trim())
        .filter(Boolean)
        .map((id) => ({
          avatarUrl: null,
          favoritedAt: new Date(0).toISOString(),
          id,
          name: id,
          platform: null,
        })),
      (item) => item.id,
    );
  }

  return [];
}

function readKolSourceEntry(value: unknown): WorkspaceWatchlistKolSource | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const name = readString(record.name) ?? "";
  const key = createKolSourceWatchKey(readString(record.key) ?? name);
  if (!key) {
    return null;
  }

  return {
    avatarUrl: readNullableString(record.avatarUrl),
    favoritedAt: readString(record.favoritedAt) ?? new Date(0).toISOString(),
    key,
    name: name || key,
    sourceType: readNullableString(record.sourceType),
  };
}

function readTopSignalSourceEntry(value: unknown): WorkspaceWatchlistTopSignalSource | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = readString(record.id) ?? "";
  if (!id.trim()) {
    return null;
  }

  return {
    avatarUrl: readNullableString(record.avatarUrl),
    favoritedAt: readString(record.favoritedAt) ?? new Date(0).toISOString(),
    id: id.trim(),
    name: readString(record.name) ?? id.trim(),
    platform: readNullableString(record.platform),
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function uniqueBy<T>(items: T[], keyOf: (item: T) => string): T[] {
  const result: T[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}
