import type { Dispatch, SetStateAction } from "react";
import { COUNTDOWN_URGENT_MS } from "./constants";
import type { ThemeClasses } from "./theme";
import type { BulkAction, Calculation, CalculatorForm, Countdown, TradeDirection } from "./types";
import { InfoRow, Modal, ModalActions } from "./ui";
import {
  formatAmount,
  formatCountdown,
  formatPrice,
  formatTakeProfitTargetSummary,
  getBulkOrderLabel,
  getBulkPositionLabel,
  sanitizeIntegerInput,
} from "./utils";

type CountdownInput = {
  days: string;
  hours: string;
  minutes: string;
};

type DashboardModalsProps = {
  activeCountdowns: Countdown[];
  bulkAction: BulkAction | null;
  calculation: Calculation;
  confirmDirection: TradeDirection | null;
  countdownInput: CountdownInput;
  currentNow: number;
  form: CalculatorForm;
  isCountdownModalOpen: boolean;
  setCountdownInput: Dispatch<SetStateAction<CountdownInput>>;
  theme: ThemeClasses;
  onAddCountdown: () => void;
  onCloseBulkAction: () => void;
  onCloseConfirm: () => void;
  onCloseCountdown: () => void;
  onConfirmBulkAction: () => void;
  onConfirmOrder: () => void;
  onDeleteCountdown: (countdownId: number) => void;
};

export function DashboardModals({
  activeCountdowns,
  bulkAction,
  calculation,
  confirmDirection,
  countdownInput,
  currentNow,
  form,
  isCountdownModalOpen,
  onAddCountdown,
  onCloseBulkAction,
  onCloseConfirm,
  onCloseCountdown,
  onConfirmBulkAction,
  onConfirmOrder,
  onDeleteCountdown,
  setCountdownInput,
  theme,
}: DashboardModalsProps) {
  return (
    <>
      {confirmDirection ? (
        <Modal title="确认开仓" theme={theme} onClose={onCloseConfirm}>
          <div className="modal-info">
            <InfoRow label="方向" theme={theme} value={confirmDirection === "long" ? "开多" : "开空"} />
            <InfoRow label="币种" theme={theme} value={form.symbol} />
            <InfoRow label="开仓点A" theme={theme} value={formatPrice(calculation.entryA)} />
            <InfoRow label="仓位A" theme={theme} value={formatAmount(calculation.amountA)} />
            {calculation.entryB > 0 ? <InfoRow label="开仓点B" theme={theme} value={formatPrice(calculation.entryB)} /> : null}
            {calculation.amountB > 0 ? <InfoRow label="仓位B" theme={theme} value={formatAmount(calculation.amountB)} /> : null}
            <InfoRow label="止损位" theme={theme} value={formatPrice(calculation.stopLoss)} />
            <InfoRow label="分批止盈" theme={theme} value={formatTakeProfitTargetSummary(calculation.takeProfitTargets)} />
            <InfoRow label="预计盈亏" theme={theme} value={calculation.profit > 0 ? `+${calculation.profit.toFixed(2)}` : "-"} />
          </div>
          <ModalActions
            cancelLabel="取消"
            confirmLabel="确认"
            theme={theme}
            onCancel={onCloseConfirm}
            onConfirm={onConfirmOrder}
          />
        </Modal>
      ) : null}

      {bulkAction ? (
        <Modal title={bulkAction.source === "order" ? getBulkOrderLabel(bulkAction.type) : getBulkPositionLabel(bulkAction.type)} theme={theme} onClose={onCloseBulkAction}>
          <p className="secondary-text" style={{ marginBottom: 16 }}>确定要执行此操作吗？</p>
          <ModalActions
            cancelLabel="取消"
            confirmLabel="确认"
            theme={theme}
            onCancel={onCloseBulkAction}
            onConfirm={onConfirmBulkAction}
          />
        </Modal>
      ) : null}

      {isCountdownModalOpen ? (
        <Modal title="倒计时" theme={theme} onClose={onCloseCountdown}>
          <div className="countdown-modal-list">
            {activeCountdowns.length > 0 ? activeCountdowns.map((countdown) => {
              const remaining = countdown.targetTime - currentNow;
              const isUrgent = remaining < COUNTDOWN_URGENT_MS;
              return (
                <div key={countdown.id} className={`countdown-modal-item${isUrgent ? " urgent" : ""}`}>
                  <span className="countdown-modal-time">{formatCountdown(remaining)}</span>
                  <button className="countdown-modal-delete" type="button" onClick={() => onDeleteCountdown(countdown.id)}>删除</button>
                </div>
              );
            }) : <div className="countdown-modal-empty">暂无倒计时</div>}
          </div>
          <div className="countdown-modal-add">
            <div className="input-row">
              <input aria-label="倒计时天数" inputMode="numeric" maxLength={2} placeholder="天" value={countdownInput.days} onChange={(event) => setCountdownInput((current) => ({ ...current, days: sanitizeIntegerInput(event.target.value) }))} />
              <input aria-label="倒计时小时" inputMode="numeric" maxLength={2} placeholder="时" value={countdownInput.hours} onChange={(event) => setCountdownInput((current) => ({ ...current, hours: sanitizeIntegerInput(event.target.value) }))} />
              <input aria-label="倒计时分钟" inputMode="numeric" maxLength={2} placeholder="分" value={countdownInput.minutes} onChange={(event) => setCountdownInput((current) => ({ ...current, minutes: sanitizeIntegerInput(event.target.value) }))} />
            </div>
          </div>
          <ModalActions
            cancelLabel="关闭"
            confirmLabel="添加"
            theme={theme}
            onCancel={onCloseCountdown}
            onConfirm={onAddCountdown}
          />
        </Modal>
      ) : null}
    </>
  );
}
