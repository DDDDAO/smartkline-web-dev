import type { MouseEventParams, Time } from "lightweight-charts";

export function readMouseEventObjectId(param: MouseEventParams<Time>): unknown {
  return param.hoveredInfo?.objectId ?? param.hoveredObjectId;
}
