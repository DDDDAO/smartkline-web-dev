import { Button } from "@/components/ui/button";
import type { TradingFoxStrategyDetail } from "@/lib/tradingfox-control-plane";
import { getTradingFoxErrorMessage } from "@/lib/tradingfox-errors";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { MarioStrategyConsoleCopy } from "./copy";
import { createMarioPendingOrderGroups, formatMarioOrderItems, formatMarioTakeProfitItems, type MarioPendingOrderGroup } from "./orders";
import { DocumentIcon, MarioSectionCard } from "./section-card";
import type { MarioTradeDirection } from "./types";

export type MarioCancelAction = { positionSide?: MarioTradeDirection; symbol?: string; type: "all" | "plan" | MarioTradeDirection };

export function MarioStrategyPendingOrdersCard({
  copy,
  detail,
  error,
  isCancelling,
  isDarkTheme,
  isLoaded,
  workspaceCopy,
  onCancel,
}: {
  copy: MarioStrategyConsoleCopy;
  detail: TradingFoxStrategyDetail;
  error?: string;
  isCancelling: boolean;
  isDarkTheme: boolean;
  isLoaded: boolean;
  workspaceCopy: WorkspaceCopy;
  onCancel: (action: MarioCancelAction) => void;
}) {
  const groups = createMarioPendingOrderGroups(detail.orderHistory);
  return (
    <MarioSectionCard description={copy.pendingOrdersDescription} icon={<DocumentIcon />} isDarkTheme={isDarkTheme} title={copy.pendingOrders}>
      {!isLoaded ? <p className={mutedTextClassName(isDarkTheme)}>{workspaceCopy.workspace.accountCenter.strategy.loadingDetail}</p> : null}
      {error ? <p className={errorTextClassName(isDarkTheme)}>{getTradingFoxErrorMessage(error, workspaceCopy)}</p> : null}
      {isLoaded && !error ? <PendingOrdersContent copy={copy} groups={groups} isCancelling={isCancelling} isDarkTheme={isDarkTheme} onCancel={onCancel} /> : null}
    </MarioSectionCard>
  );
}

function PendingOrdersContent({ copy, groups, isCancelling, isDarkTheme, onCancel }: {
  copy: MarioStrategyConsoleCopy;
  groups: readonly MarioPendingOrderGroup[];
  isCancelling: boolean;
  isDarkTheme: boolean;
  onCancel: (action: MarioCancelAction) => void;
}) {
  if (groups.length === 0) {
    return (
      <>
        <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-[#0F131A]/70 px-3 py-4 text-sm text-slate-500" : "rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] px-3 py-4 text-sm text-slate-500"}>{copy.emptyOrders}</div>
        <BulkCancelActions copy={copy} isCancelling={isCancelling} isDarkTheme={isDarkTheme} onCancel={onCancel} />
      </>
    );
  }

  return (
    <>
      <div className="grid gap-3">
        {groups.map((group) => <PendingOrderGroupPanel key={group.id} copy={copy} group={group} isCancelling={isCancelling} isDarkTheme={isDarkTheme} onCancel={onCancel} />)}
      </div>
      <BulkCancelActions copy={copy} isCancelling={isCancelling} isDarkTheme={isDarkTheme} onCancel={onCancel} />
    </>
  );
}

function PendingOrderGroupPanel({ copy, group, isCancelling, isDarkTheme, onCancel }: {
  copy: MarioStrategyConsoleCopy;
  group: MarioPendingOrderGroup;
  isCancelling: boolean;
  isDarkTheme: boolean;
  onCancel: (action: MarioCancelAction) => void;
}) {
  return (
    <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-[#0F131A]/70 p-3" : "rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] p-3"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-black">{group.symbol}</div>
          <div className={group.positionSide === "long" ? "mt-1 text-xs font-black text-emerald-500" : "mt-1 text-xs font-black text-rose-500"}>{group.positionSide === "long" ? copy.sideLong : copy.sideShort}</div>
        </div>
        <Button className={softButtonClassName(isDarkTheme)} disabled={isCancelling} size="sm" type="button" variant="outline" onClick={() => onCancel({ positionSide: group.positionSide, symbol: group.symbol, type: "plan" })}>
          {isCancelling ? copy.cancelling : copy.cancelPlan}
        </Button>
      </div>
      <div className="mt-3 grid gap-2 text-xs lg:grid-cols-3">
        <OrderSummary label={copy.entryOrders} value={formatMarioOrderItems(group.entries)} />
        <OrderSummary label={copy.takeProfitOrders} value={formatMarioTakeProfitItems(group.takeProfits)} />
        <OrderSummary label={copy.stopLossOrders} value={formatMarioOrderItems(group.stopLosses)} />
      </div>
    </div>
  );
}

function BulkCancelActions({ copy, isCancelling, isDarkTheme, onCancel }: {
  copy: MarioStrategyConsoleCopy;
  isCancelling: boolean;
  isDarkTheme: boolean;
  onCancel: (action: MarioCancelAction) => void;
}) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      <Button className={softButtonClassName(isDarkTheme)} disabled={isCancelling} type="button" variant="outline" onClick={() => onCancel({ type: "long" })}>{copy.cancelLong}</Button>
      <Button className={softButtonClassName(isDarkTheme)} disabled={isCancelling} type="button" variant="outline" onClick={() => onCancel({ type: "short" })}>{copy.cancelShort}</Button>
      <Button className={dangerButtonClassName(isDarkTheme)} disabled={isCancelling} type="button" variant="destructive" onClick={() => onCancel({ type: "all" })}>{copy.cancelAll}</Button>
    </div>
  );
}

function OrderSummary({ label, value }: { label: string; value: string }) {
  return <div><div className="font-black text-slate-500">{label}</div><div className="mt-1 break-words font-mono font-black tabular-nums">{value}</div></div>;
}

function mutedTextClassName(isDarkTheme: boolean): string {
  return isDarkTheme ? "text-sm text-slate-500" : "text-sm text-slate-500";
}

function errorTextClassName(isDarkTheme: boolean): string {
  return isDarkTheme ? "text-sm font-bold text-rose-200" : "text-sm font-bold text-rose-700";
}

function softButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme ? "rounded-2xl border-white/[0.075] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]" : "rounded-2xl border-[#E8E8EC] bg-white text-slate-700 hover:bg-[#F5F5FF]";
}

function dangerButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme ? "rounded-2xl border border-rose-400/20 bg-rose-400/10 text-rose-200 hover:bg-rose-400/15" : "rounded-2xl border border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100";
}
