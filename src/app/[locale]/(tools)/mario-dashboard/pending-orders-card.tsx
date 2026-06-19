import { Button } from "@/components/ui/button";
import { DocumentIcon } from "./icons";
import type { ThemeClasses } from "./theme";
import type { BulkActionType, PendingOrder, TradeDirection } from "./types";
import { ActionButton, Card, CountBadge, ResponsiveTable, TableCell, TableHeader } from "./ui";
import { formatAmountPair, formatPrice, formatPricePair, formatTakeProfitTargetSummary } from "./utils";

export function PendingOrdersCard({ longOrders, onCancelOrder, onOpenBulkAction, shortOrders, theme }: {
  longOrders: readonly PendingOrder[];
  onCancelOrder: (orderId: number) => void;
  onOpenBulkAction: (type: BulkActionType) => void;
  shortOrders: readonly PendingOrder[];
  theme: ThemeClasses;
}) {
  return (
    <Card title="挂单详情" icon={<DocumentIcon />} theme={theme}>
      <div className="orders-container">
        <PendingOrderTable countTone="long" emptyLabel="暂无挂单" orders={longOrders} theme={theme} title="多单" onCancelOrder={onCancelOrder} />
        <PendingOrderTable countTone="short" emptyLabel="暂无挂单" orders={shortOrders} theme={theme} title="空单" onCancelOrder={onCancelOrder} />
      </div>
      <div className="orders-actions">
        <ActionButton tone="long" onClick={() => onOpenBulkAction("long")}>取消多单</ActionButton>
        <ActionButton tone="short" onClick={() => onOpenBulkAction("short")}>取消空单</ActionButton>
        <ActionButton tone="long" onClick={() => onOpenBulkAction("all")}>全部取消</ActionButton>
      </div>
    </Card>
  );
}

function PendingOrderTable({ countTone, emptyLabel, onCancelOrder, orders, theme, title }: {
  countTone: TradeDirection;
  emptyLabel: string;
  onCancelOrder: (orderId: number) => void;
  orders: readonly PendingOrder[];
  theme: ThemeClasses;
  title: string;
}) {
  return (
    <div className="orders-section">
      <h3>{title} <CountBadge tone={countTone}>{orders.length}</CountBadge></h3>
      <ResponsiveTable>
        <thead>
          <tr>
            <TableHeader theme={theme}>币种</TableHeader>
            <TableHeader theme={theme}>价格</TableHeader>
            <TableHeader theme={theme}>数量</TableHeader>
            <TableHeader theme={theme}>止盈</TableHeader>
            <TableHeader theme={theme}>止损</TableHeader>
            <TableHeader theme={theme}>操作</TableHeader>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <TableCell theme={theme}>{order.symbol}</TableCell>
              <TableCell theme={theme}>{formatPricePair(order.entryA, order.entryB)}</TableCell>
              <TableCell theme={theme}>{formatAmountPair(order.amountA, order.amountB)}</TableCell>
              <TableCell theme={theme}>{formatTakeProfitTargetSummary(order.takeProfitTargets)}</TableCell>
              <TableCell theme={theme}>{formatPrice(order.stopLoss)}</TableCell>
              <TableCell theme={theme}>
                <Button className="cancel-btn" size="sm" type="button" variant="destructive" onClick={() => onCancelOrder(order.id)}>取消</Button>
              </TableCell>
            </tr>
          ))}
        </tbody>
      </ResponsiveTable>
      {orders.length === 0 ? <div className="empty-state">{emptyLabel}</div> : null}
    </div>
  );
}
