import { toMarioUsdtPerpetualMarketSymbol } from "./calculator";
import type { MarioCalculation, MarioRewardRiskRatio, MarioTradeDirection } from "./types";

export type MarioOpenPositionPayload = {
  entrySettings: MarioPricePercentSetting[];
  margin: number;
  positionSide: MarioTradeDirection;
  quantity: number;
  riskRewardRatio: MarioRewardRiskRatio;
  stopLossPrice: number;
  symbol: string;
  takeProfitSettings: MarioPricePercentSetting[];
};

type MarioPricePercentSetting = {
  percent: number;
  price: number;
};

export function createMarioOpenPositionPayload(input: {
  calculation: MarioCalculation;
  direction: MarioTradeDirection;
  ratio: MarioRewardRiskRatio;
  symbol: string;
}): MarioOpenPositionPayload {
  const quantity = roundMarioPayloadNumber(input.calculation.totalQuantity);
  return {
    entrySettings: createEntrySettings(input.calculation),
    margin: roundMarioPayloadNumber(input.calculation.riskBudget),
    positionSide: input.direction,
    quantity,
    riskRewardRatio: input.ratio,
    stopLossPrice: roundMarioPayloadNumber(input.calculation.stopLoss),
    symbol: toMarioUsdtPerpetualMarketSymbol(input.symbol),
    takeProfitSettings: input.calculation.takeProfitTargets.map((target) => ({
      percent: target.closePercent,
      price: roundMarioPayloadNumber(target.price),
    })),
  };
}

function createEntrySettings(calculation: MarioCalculation): MarioPricePercentSetting[] {
  if (calculation.amountB <= 0 || calculation.entryB <= 0) {
    return [{ percent: 100, price: roundMarioPayloadNumber(calculation.entryA) }];
  }
  const amountAPercent = calculation.amountA / calculation.totalQuantity * 100;
  return [
    { percent: roundMarioPayloadNumber(amountAPercent), price: roundMarioPayloadNumber(calculation.entryA) },
    { percent: roundMarioPayloadNumber(100 - amountAPercent), price: roundMarioPayloadNumber(calculation.entryB) },
  ];
}

function roundMarioPayloadNumber(value: number): number {
  return Number(value.toFixed(8));
}
