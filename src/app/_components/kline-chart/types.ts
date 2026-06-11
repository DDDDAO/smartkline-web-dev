export type ChartTheme = "light" | "dark";

export type ChartTimeFocusRequest = {
  key: string;
  sourceTimeMs: number;
};

export type KlineSignalBiasSummary = {
  longCount: number;
  longPercent: number;
  shortCount: number;
  shortPercent: number;
  totalCount: number;
};
