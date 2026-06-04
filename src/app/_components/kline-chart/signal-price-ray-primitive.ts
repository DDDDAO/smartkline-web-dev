import type {
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  Time,
} from "lightweight-charts";
import type { MarketCandle } from "@/app/_types/market";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { StructuredSignal } from "@/app/_types/signal";
import type { ChartTheme } from "@/app/_components/kline-chart";
import { drawSignalPriceRange, drawSignalPriceRay } from "./signal-price-ray-drawing";
import { createSignalPriceRaySourceState, resolveSignalTimeCoordinate } from "./signal-price-ray-source";
import type {
  SignalPriceRayChartApi,
  SignalPriceRayDrawingState,
  SignalPriceRayPrimitiveOptions,
  SignalPriceRaySeriesApi,
} from "./signal-price-ray-types";

/**
 * Lightweight Charts price lines always span the full pane, so signal levels are
 * drawn as a primitive while hidden price lines keep stable price-axis labels.
 */
export class SignalPriceRayPrimitive implements ISeriesPrimitive<Time> {
  private readonly paneView = new SignalPriceRayPaneView();
  private readonly paneViewList: readonly IPrimitivePaneView[] = [this.paneView];
  private chart: SignalPriceRayChartApi | null = null;
  private options: SignalPriceRayPrimitiveOptions = { candles: [], paperPosition: null, signal: null, theme: "light" };
  private requestUpdate: (() => void) | null = null;
  private series: SignalPriceRaySeriesApi | null = null;

  applyOptions(options: SignalPriceRayPrimitiveOptions) {
    this.options = options;
    this.updateAllViews();
    this.requestUpdate?.();
  }

  attached({ chart, requestUpdate, series }: SeriesAttachedParameter<Time>) {
    this.chart = chart;
    this.requestUpdate = requestUpdate;
    this.series = series;
    this.updateAllViews();
  }

  detached() {
    this.chart = null;
    this.requestUpdate = null;
    this.series = null;
  }

  updateAllViews() {
    this.paneView.update(createSignalPriceRayDrawingState({
      candles: this.options.candles,
      chart: this.chart,
      series: this.series,
      paperPosition: this.options.paperPosition,
      signal: this.options.signal,
      theme: this.options.theme,
    }));
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return this.paneViewList;
  }
}

class SignalPriceRayPaneView implements IPrimitivePaneView {
  private readonly rendererInstance = new SignalPriceRayRenderer();

  renderer(): IPrimitivePaneRenderer {
    return this.rendererInstance;
  }

  update(drawings: SignalPriceRayDrawingState) {
    this.rendererInstance.update(drawings);
  }

  zOrder() {
    return "top" as const;
  }
}

class SignalPriceRayRenderer implements IPrimitivePaneRenderer {
  private drawings: SignalPriceRayDrawingState = { ranges: [], rays: [] };

  draw(target: Parameters<IPrimitivePaneRenderer["draw"]>[0]) {
    target.useBitmapCoordinateSpace((scope) => {
      const ctx = scope.context;
      ctx.save();
      ctx.lineCap = "butt";
      ctx.setLineDash([]);

      for (const range of this.drawings.ranges) {
        drawSignalPriceRange(ctx, scope, range);
      }

      for (const ray of this.drawings.rays) {
        drawSignalPriceRay(ctx, scope, ray);
      }

      ctx.restore();
    });
  }

  update(drawings: SignalPriceRayDrawingState) {
    this.drawings = drawings;
  }
}

function createSignalPriceRayDrawingState(input: {
  candles: readonly MarketCandle[];
  chart: SignalPriceRayChartApi | null;
  series: SignalPriceRaySeriesApi | null;
  paperPosition: PaperPositionRecord | null;
  signal: StructuredSignal | null;
  theme: ChartTheme;
}): SignalPriceRayDrawingState {
  if (!input.chart || !input.series || !input.signal || input.candles.length === 0) {
    return { ranges: [], rays: [] };
  }

  const { candles, chart, paperPosition, series, signal, theme } = input;
  const sourceState = createSignalPriceRaySourceState(signal, paperPosition, theme);
  if (!sourceState) {
    return { ranges: [], rays: [] };
  }

  const startCoordinate = resolveSignalTimeCoordinate(chart, candles, sourceState.startTimeMs);
  if (startCoordinate === null) {
    return { ranges: [], rays: [] };
  }

  const ranges = sourceState.ranges.flatMap((range) => {
    const maxCoordinate = series.priceToCoordinate(range.maxPrice);
    const minCoordinate = series.priceToCoordinate(range.minPrice);
    if (maxCoordinate === null || minCoordinate === null) {
      return [];
    }

    return [{
      fillColor: range.fillColor,
      maxCoordinate: Number(maxCoordinate),
      minCoordinate: Number(minCoordinate),
      startCoordinate,
    }];
  });

  const rays = sourceState.rays.flatMap((ray) => {
    const priceCoordinate = series.priceToCoordinate(ray.price);
    if (priceCoordinate === null) {
      return [];
    }

    return [{
      color: ray.color,
      lineStyle: ray.lineStyle,
      lineWidth: ray.lineWidth,
      priceCoordinate: Number(priceCoordinate),
      startCoordinate,
    }];
  });

  return { ranges, rays };
}

