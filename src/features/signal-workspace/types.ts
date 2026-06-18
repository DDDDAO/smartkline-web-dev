export type KolSignalSourceStatus = {
  error: string | null;
  isLoading: boolean;
};

export function formatKolSignalSourceError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
