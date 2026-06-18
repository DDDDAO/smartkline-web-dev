import { ClockIcon, PositionIcon } from "./icons";
import type { ThemeClasses } from "./theme";
import type { BulkActionType, HistoryOrder, MockPosition, TradeDirection } from "./types";
import { ActionButton, Card, CountBadge, ResponsiveTable, TableCell, TableHeader } from "./ui";
import { formatAmount, formatPrice, formatSignedNumber } from "./utils";

export function PositionsCard({ longPositions, onOpenBulkAction, shortPositions, theme }: {
  longPositions: readonly MockPosition[];
  onOpenBulkAction: (type: BulkActionType) => void;
  shortPositions: readonly MockPosition[];
  theme: ThemeClasses;
}) {
  return (
    <Card title="持仓详情" icon={<PositionIcon />} theme={theme}>
      <div className="orders-container">
        <PositionTable countTone="long" emptyLabel="暂无持仓" positions={longPositions} theme={theme} title="多单持仓" />
        <PositionTable countTone="short" emptyLabel="暂无持仓" positions={shortPositions} theme={theme} title="空单持仓" />
      </div>
      <div className="orders-actions">
        <ActionButton tone="long" onClick={() => onOpenBulkAction("long")}>平多单</ActionButton>
        <ActionButton tone="short" onClick={() => onOpenBulkAction("short")}>平空单</ActionButton>
        <ActionButton tone="long" onClick={() => onOpenBulkAction("all")}>全部平仓</ActionButton>
      </div>
    </Card>
  );
}

function PositionTable({ countTone, emptyLabel, positions, theme, title }: {
  countTone: TradeDirection;
  emptyLabel: string;
  positions: readonly MockPosition[];
  theme: ThemeClasses;
  title: string;
}) {
  return (
    <div className="orders-section">
      <h3>{title} <CountBadge tone={countTone}>{positions.length}</CountBadge></h3>
      <ResponsiveTable>
        <thead>
          <tr>
            <TableHeader theme={theme}>币种</TableHeader>
            <TableHeader theme={theme}>价格</TableHeader>
            <TableHeader theme={theme}>数量</TableHeader>
            <TableHeader theme={theme}>盈亏</TableHeader>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => (
            <tr key={`${position.direction}-${position.symbol}-${position.entry}`}>
              <TableCell theme={theme}>{position.symbol}</TableCell>
              <TableCell theme={theme}>{formatPrice(position.entry)}</TableCell>
              <TableCell theme={theme}>{formatAmount(position.amount)}</TableCell>
              <TableCell className={position.pnl >= 0 ? "profit" : "loss"} theme={theme}>{formatSignedNumber(position.pnl)}</TableCell>
            </tr>
          ))}
        </tbody>
      </ResponsiveTable>
      {positions.length === 0 ? <div className="empty-state">{emptyLabel}</div> : null}
    </div>
  );
}

export function HistoryCard({ history, theme }: { history: readonly HistoryOrder[]; theme: ThemeClasses }) {
  return (
    <Card title="历史订单" icon={<ClockIcon />} theme={theme}>
      <ResponsiveTable variant="history">
        <thead>
          <tr>
            <TableHeader theme={theme}>方向</TableHeader>
            <TableHeader theme={theme}>币种</TableHeader>
            <TableHeader theme={theme}>开仓价</TableHeader>
            <TableHeader theme={theme}>平仓价</TableHeader>
            <TableHeader theme={theme}>盈亏</TableHeader>
            <TableHeader theme={theme}>收益率</TableHeader>
          </tr>
        </thead>
        <tbody>
          {history.map((order) => {
            const displayPercent = order.percent.startsWith("-") || order.percent === "0%" ? order.percent : `+${order.percent}`;
            const isProfit = !displayPercent.startsWith("-") && displayPercent !== "0%";
            return (
              <tr key={`${order.direction}-${order.symbol}-${order.entry}-${order.close}`}>
                <TableCell className={order.direction === "long" ? "profit" : "loss"} theme={theme}>{order.direction === "long" ? "多" : "空"}</TableCell>
                <TableCell theme={theme}>{order.symbol}</TableCell>
                <TableCell theme={theme}>{formatPrice(order.entry)}</TableCell>
                <TableCell theme={theme}>{formatPrice(order.close)}</TableCell>
                <TableCell className={order.pnl >= 0 ? "profit" : "loss"} theme={theme}>{formatSignedNumber(order.pnl)}</TableCell>
                <TableCell className={isProfit ? "profit" : "loss"} theme={theme}>{displayPercent}</TableCell>
              </tr>
            );
          })}
        </tbody>
      </ResponsiveTable>
    </Card>
  );
}
