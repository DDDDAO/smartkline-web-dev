import { mockKolSignals } from "@/app/_lib/mock-kol-signal-data";
import { DEFAULT_CREATED_AT } from "./constants";
import type { KolSignalApiItem } from "./types";

export const sampleKolSignalApiResponses: KolSignalApiItem[] = [
  {
    id: "sample:3:0",
    source_id: "sample-3",
    source_message_id: "sample-message-3",
    created_at: "2026-05-31T09:30:00+08:00",
    message_type: "OPEN_POSITION",
    entry: {
      raw: "市价多单模拟，用于展示已入场浮动盈亏",
      type: "MARKET",
      price: null,
      range: null,
      max_price: null,
      min_price: null,
    },
    symbol: "BTC/USDT:USDT",
    direction: "LONG",
    stop_loss: null,
    take_profits: [],
  },
  {
    id: "sample:4:0",
    source_id: "sample-4",
    source_message_id: "sample-message-4",
    created_at: "2026-05-31T09:30:00+08:00",
    message_type: "OPEN_POSITION",
    entry: {
      raw: "市价空单模拟，用于展示已入场浮动盈亏",
      type: "MARKET",
      price: null,
      range: null,
      max_price: null,
      min_price: null,
    },
    symbol: "BTC/USDT:USDT",
    direction: "SHORT",
    stop_loss: null,
    take_profits: [],
  },
  {
    id: "sample:1:0",
    source_id: "sample-1",
    source_message_id: "sample-message-1",
    created_at: DEFAULT_CREATED_AT,
    message_type: "OPEN_POSITION",
    entry: {
      raw: "67000附近直接空市价 再挂68588",
      type: "RANGE",
      price: null,
      range: "67000-68588",
      max_price: "68588",
      min_price: "67000",
    },
    symbol: "BTC/USDT:USDT",
    direction: "SHORT",
    stop_loss: { price: "70000" },
    take_profits: [
      { label: "TP_SHORT_1", price: "66188", percentage: "70" },
      { label: "TP_SHORT_2", price: "65388", percentage: null },
      { label: "TP_SHORT_3", price: "63888", percentage: null },
    ],
  },
  {
    id: "sample:2:0",
    source_id: "sample-2",
    source_message_id: "sample-message-2",
    created_at: "2026-05-31T21:02:00+08:00",
    message_type: "OPEN_POSITION",
    entry: {
      raw: "67400-68600",
      type: "RANGE",
      price: null,
      range: "67400-68600",
      max_price: "68600",
      min_price: "67400",
    },
    symbol: "BTC/USDT:USDT",
    direction: "SHORT",
    stop_loss: { price: "69200" },
    take_profits: [
      { label: "TP_SHORT_1", price: "66500", percentage: null },
      { label: "TP_SHORT_2", price: "65800", percentage: null },
      { label: "TP_SHORT_3", price: "65100", percentage: null },
    ],
  },
];

export const fallbackKolSignals = mockKolSignals;
