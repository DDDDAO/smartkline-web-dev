import type {
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  PrimitiveHoveredItem,
  SeriesAttachedParameter,
  Time,
} from "lightweight-charts";
import { TradePointAvatarImageCache } from "./trade-point-primitive/avatar-cache";
import { HOVER_OBJECT_ID_PREFIX, TRADE_POINT_POINTER_SIZE } from "./trade-point-primitive/constants";
import { createTradePointDrawingState } from "./trade-point-primitive/drawing-state";
import { TradePointRenderer } from "./trade-point-primitive/renderer";
import type {
  AttachedContext,
  DrawnTradePoint,
  TradePointPrimitiveDrawingState,
  TradePointPrimitiveOptions,
} from "./trade-point-primitive/types";

export type { KlineTradePointMarker } from "./trade-point-primitive/types";

/**
 * Source-owned trade points stay as avatar markers. Callers that intentionally
 * omit avatars can still render compact B/S text labels by passing a buy/sell
 * action label; personal trade history keeps its user identity in the marker
 * payload instead.
 */
export class TradePointPrimitive implements ISeriesPrimitive<Time> {
  private readonly avatarImages = new TradePointAvatarImageCache();
  private readonly paneView = new TradePointPaneView();
  private readonly paneViewList: readonly IPrimitivePaneView[] = [this.paneView];
  private attachedContext: AttachedContext | null = null;
  private options: TradePointPrimitiveOptions = {
    activeSignalId: null,
    candles: [],
    markers: [],
    theme: "light",
  };

  applyOptions(options: TradePointPrimitiveOptions) {
    this.options = options;
    this.updateAllViews();
    this.attachedContext?.requestUpdate();
  }

  refresh() {
    this.updateAllViews();
    this.attachedContext?.requestUpdate();
  }

  attached({ chart, requestUpdate, series }: SeriesAttachedParameter<Time>) {
    this.attachedContext = {
      chart,
      requestUpdate,
      series: series as ISeriesApi<"Candlestick", Time>,
    };
    this.updateAllViews();
  }

  detached() {
    this.attachedContext = null;
    this.paneView.update({ items: [], theme: this.options.theme });
  }

  updateAllViews() {
    this.paneView.update(createTradePointDrawingState({
      activeSignalId: this.options.activeSignalId,
      avatarImages: this.avatarImages,
      candles: this.options.candles,
      context: this.attachedContext,
      markers: this.options.markers,
      theme: this.options.theme,
    }));
  }

  hitTest(x: number, y: number): PrimitiveHoveredItem | null {
    return this.paneView.hitTest(x, y);
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return this.paneViewList;
  }
}

export function toTradePointHoverObjectId(markerId: string): string {
  return `${HOVER_OBJECT_ID_PREFIX}${markerId}`;
}

export function readTradePointMarkerId(value: unknown): string | null {
  return typeof value === "string" && value.startsWith(HOVER_OBJECT_ID_PREFIX)
    ? value.slice(HOVER_OBJECT_ID_PREFIX.length)
    : null;
}

class TradePointPaneView implements IPrimitivePaneView {
  private readonly rendererInstance = new TradePointRenderer();
  private items: readonly DrawnTradePoint[] = [];

  renderer(): IPrimitivePaneRenderer {
    return this.rendererInstance;
  }

  update(state: TradePointPrimitiveDrawingState) {
    this.items = state.items;
    this.rendererInstance.update(state);
  }

  hitTest(x: number, y: number): PrimitiveHoveredItem | null {
    let item: DrawnTradePoint | null = null;
    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      const candidate = this.items[index];
      if (candidate && Math.hypot(x - candidate.x, y - candidate.y) <= candidate.width / 2 + TRADE_POINT_POINTER_SIZE + 5) {
        item = candidate;
        break;
      }
    }

    if (!item) {
      return null;
    }

    return {
      externalId: toTradePointHoverObjectId(item.id),
      cursorStyle: "pointer",
      zOrder: "top",
    };
  }

  zOrder() {
    return "top" as const;
  }
}
