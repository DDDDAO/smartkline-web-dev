export type ChartTheme = "light" | "dark";
export type PriceColorMode = "positiveGreen" | "positiveRed";

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
