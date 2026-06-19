import type { TradingFoxOrderHistory } from "@/lib/tradingfox-control-plane";
import type { MarioTradeDirection } from "./types";

export type MarioPendingOrderGroup = {
  entries: MarioPendingOrderItem[];
  id: string;
  positionSide: MarioTradeDirection;
  stopLosses: MarioPendingOrderItem[];
  symbol: string;
  takeProfits: MarioPendingOrderItem[];
};

export type MarioPendingOrderItem = {
  clientOrderId: string;
  contractAmount: string;
  kind: "entry" | "stopLoss" | "takeProfit";
  price: string;
  status: string;
  timestamp: string;
};

type TraderOrder = NonNullable<TradingFoxOrderHistory>["items"][number];

const OPEN_ORDER_STATUSES = new Set(["new", "open", "pending", "partially_filled", "partially-filled", "partiallyfilled"]);

export function createMarioPendingOrderGroups(orderHistory: TradingFoxOrderHistory | null): MarioPendingOrderGroup[] {
  if (!orderHistory) {
    return [];
  }

  const groups = new Map<string, MarioPendingOrderGroup>();
  for (const order of orderHistory.items) {
    if (!isOpenOrderStatus(order.status)) {
      continue;
    }
    const positionSide = inferMarioOrderPositionSide(order);
    if (!positionSide) {
      continue;
    }
    const groupKey = `${order.symbol}::${positionSide}`;
    const group = groups.get(groupKey) ?? createPendingOrderGroup(order.symbol, positionSide, groupKey);
    appendPendingOrder(group, order);
    groups.set(groupKey, group);
  }

  return Array.from(groups.values()).sort(compareMarioPendingOrderGroups);
}

export function formatMarioOrderItems(items: readonly Pick<MarioPendingOrderItem, "contractAmount" | "price">[]): string {
  if (items.length === 0) {
    return "-";
  }
  return items.map((item) => `${item.price} / ${item.contractAmount}`).join(" · ");
}

export function formatMarioTakeProfitItems(items: readonly Pick<MarioPendingOrderItem, "contractAmount" | "price">[]): string {
  if (items.length === 0) {
    return "-";
  }
  return items.map((item, index) => `TP${index + 1} ${item.price} / ${item.contractAmount}`).join(" · ");
}

function createPendingOrderGroup(symbol: string, positionSide: MarioTradeDirection, id: string): MarioPendingOrderGroup {
  return { entries: [], id, positionSide, stopLosses: [], symbol, takeProfits: [] };
}

function appendPendingOrder(group: MarioPendingOrderGroup, order: TraderOrder): void {
  const item = {
    clientOrderId: order.clientOrderId,
    contractAmount: order.contractAmount,
    kind: getMarioOrderKind(order),
    price: order.price,
    status: order.status ?? "",
    timestamp: order.timestamp,
  } satisfies MarioPendingOrderItem;

  if (item.kind === "entry") {
    group.entries.push(item);
  } else if (item.kind === "takeProfit") {
    group.takeProfits.push(item);
  } else {
    group.stopLosses.push(item);
  }
}

function getMarioOrderKind(order: TraderOrder): MarioPendingOrderItem["kind"] {
  if (order.isClosePosition) {
    return "stopLoss";
  }
  return order.reduceOnly ? "takeProfit" : "entry";
}

function inferMarioOrderPositionSide(order: TraderOrder): MarioTradeDirection | null {
  const side = order.side.trim().toLowerCase();
  if (!order.reduceOnly && !order.isClosePosition) {
    return side.includes("buy") || side === "long" ? "long" : side.includes("sell") || side === "short" ? "short" : null;
  }
  return side.includes("sell") || side === "short" ? "long" : side.includes("buy") || side === "long" ? "short" : null;
}

function isOpenOrderStatus(status: string | undefined): boolean {
  const normalizedStatus = (status ?? "").trim().toLowerCase();
  return normalizedStatus.length === 0 || OPEN_ORDER_STATUSES.has(normalizedStatus);
}

function compareMarioPendingOrderGroups(left: MarioPendingOrderGroup, right: MarioPendingOrderGroup): number {
  if (left.positionSide !== right.positionSide) {
    return left.positionSide === "long" ? -1 : 1;
  }
  return left.symbol.localeCompare(right.symbol);
}
