import type { IPrimitivePaneRenderer } from "lightweight-charts";
import type { TradePointPrimitiveDrawingState } from "./types";
import { drawTradePoint } from "./draw";

export class TradePointRenderer implements IPrimitivePaneRenderer {
  private state: TradePointPrimitiveDrawingState = { items: [], theme: "light" };

  draw(target: Parameters<IPrimitivePaneRenderer["draw"]>[0]) {
    target.useBitmapCoordinateSpace((scope) => {
      const ctx = scope.context;
      const pixelRatio = Math.max(scope.horizontalPixelRatio, scope.verticalPixelRatio);
      const horizontalPixelRatio = scope.horizontalPixelRatio;
      const verticalPixelRatio = scope.verticalPixelRatio;

      ctx.save();
      for (const item of this.state.items) {
        drawTradePoint(ctx, {
          item,
          pixelRatio,
          theme: this.state.theme,
          x: item.x * horizontalPixelRatio,
          y: item.y * verticalPixelRatio,
        });
      }
      ctx.restore();
    });
  }

  update(state: TradePointPrimitiveDrawingState) {
    this.state = state;
  }
}
