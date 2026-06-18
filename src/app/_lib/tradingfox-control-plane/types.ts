/**
 * Public subset of the TradingFox IP pool record. The backend record can carry
 * proxy auth/internal routing fields; the Next.js API must not expose them.
 */
export type TradingFoxIPAddress = {
  address: string;
  createdAt?: string;
  expiresAt?: string;
  location?: string;
  port?: number;
  status: string;
  updatedAt?: string;
  workerId?: string;
};

export type TradingFoxConnector = {
  id: number;
  userId: number;
  name: string;
  accountEquity?: number;
  bindingLabel?: string;
  bindingMode?: string;
  displayName?: string;
  exchangePlatform: string;
  credentials: Record<string, unknown>;
  isMock: boolean;
  mockMarginBalance?: number;
  positionSideDual: boolean;
  ipAddress?: TradingFoxIPAddress | null;
  whitelistIp?: string;
  recommended?: boolean;
  dead: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TradingFoxTrader = {
  id: number;
  userId: number;
  name: string;
  strategyDefinitionId: string;
  exchangeConnectorId: number;
  enabled?: boolean;
  configSchemaVersion: number;
  configRevision: number;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  runtime?: TradingFoxRuntimeStatus;
  desiredState?: string;
  runtimeState?: string;
  displayStatus?: string;
  statusMessage?: string;
};

export type TradingFoxRuntimeStatus = {
  traderId: number;
  exchangeConnectorId: number;
  workerId: string;
  state: string;
  strategyDefinitionId: string;
  traderName: string;
  errorMessage?: string;
  configRevision: number;
  updatedAt: string;
};

export type TradingFoxRuntimeStatusResponse = {
  status: TradingFoxRuntimeStatus;
};

export type TradingFoxCopyStrategyStatus = "failed" | "paused" | "pending" | "running" | "stopped";
export type TradingFoxStrategyDetailSection = "account" | "positions" | "signalSources" | "orders" | "curve";

export type TradingFoxLocalizedText = Record<string, string>;

export type TradingFoxDisplayMetadata = {
  label?: TradingFoxLocalizedText;
  description?: TradingFoxLocalizedText;
  placeholder?: TradingFoxLocalizedText;
  options?: Record<string, TradingFoxDisplayMetadata>;
};

export type TradingFoxActionDefinition = {
  id: string;
  label?: string;
  description?: string;
  display?: TradingFoxDisplayMetadata;
  payloadSchema?: Record<string, unknown>;
  uiSchema?: Record<string, unknown>;
};

export type TradingFoxStrategyCapabilities = {
  handlesTradeEvents?: boolean;
  hasPollingLoop?: boolean;
  supportsSltpMonitoring?: boolean;
  supportsManualSync?: boolean;
  supportsSignalSources?: boolean;
  supportsPositionQuery?: boolean;
  supportsAccountStatus?: boolean;
  supportsCloseOnStop?: boolean;
  actionDefinitions?: TradingFoxActionDefinition[];
};

export type TradingFoxStrategyDefinitionSummary = {
  id: string;
  name: string;
  description?: string;
  display?: TradingFoxDisplayMetadata;
  status: string;
  version: string;
  configSchemaVersion: number;
  commonModules?: string[];
  capabilities: TradingFoxStrategyCapabilities;
};

export type TradingFoxStrategyDefinition = TradingFoxStrategyDefinitionSummary & {
  configSchema?: Record<string, unknown>;
  uiSchema?: Record<string, unknown>;
  strategyConfigSchema?: Record<string, unknown>;
  strategyUiSchema?: Record<string, unknown>;
};

export type TradingFoxCopyStrategy = {
  apiAccountName: string;
  accountEquity?: number;
  exchangeConnectorId: number;
  avatarUrl: string;
  createdAtLabel: string;
  eventsCount?: number;
  id: string;
  platform: string;
  positionsCount?: number;
  signalSourceAvatarUrl?: string;
  signalSourceName?: string;
  signalSourcePlatform?: string;
  startedAt: string;
  status: TradingFoxCopyStrategyStatus;
  stopLossPercent: number;
  strategyDefinitionId?: string;
  takeProfitPercent: number;
  traderId: string;
  traderName: string;
  strategyType?: "copyTrading" | "generic" | "mario";
  unrealizedPnl?: number;
};

export type TradingFoxAccountResponse = {
  connector: TradingFoxConnector | null;
  connectors: TradingFoxConnector[];
  strategies: TradingFoxCopyStrategy[];
};

export type TradingFoxHyperliquidTypedData = {
  domain: Record<string, unknown>;
  message: Record<string, unknown>;
  primaryType: string;
  types: Record<string, unknown>;
};

export type TradingFoxHyperliquidSigningAction = {
  action: Record<string, unknown>;
  kind: "approveAgent" | "approveBuilderFee";
  typedData: TradingFoxHyperliquidTypedData;
};

export type TradingFoxHyperliquidAgentBinding = {
  id: number;
  userId: number;
  connectorName: string;
  walletAddress: string;
  agentAddress: string;
  agentName: string;
  builderAddress?: string;
  builderFeeInt?: number;
  builderMaxFeeRate?: string;
  status: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TradingFoxHyperliquidAgentBindingStartResponse = {
  actions: TradingFoxHyperliquidSigningAction[];
  binding: TradingFoxHyperliquidAgentBinding;
};

export type TradingFoxHyperliquidAgentBindingCompleteResponse = {
  binding: TradingFoxHyperliquidAgentBinding;
  connector?: TradingFoxConnector;
};

export type TradingFoxAccountStatus = {
  equity: number;
  positionSideDual: boolean;
  usdtFree: number;
  usdtTotal: number;
  usdtUsed: number;
};

export type TradingFoxStrategyCurvePoint = {
  currency?: string;
  equity?: number | null;
  pnl: number | null;
  roi: number | null;
  timestamp: string;
};

export type TradingFoxStrategyCurve = {
  baseEquity?: number | null;
  currency?: string;
  points: TradingFoxStrategyCurvePoint[];
  updatedAt?: string;
};

export type TradingFoxPosition = {
  symbol: string;
  side: string;
  contracts?: number;
  notional?: number;
  leverage?: number;
  unrealizedPnl?: number;
  entryPrice?: number;
  markPrice?: number;
};

export type TradingFoxSignalSource = {
  signalSourceId: string;
  signalType?: string;
  name?: string;
  avatar?: string | null;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  signalSourceAvatarUrl?: string | null;
  marginBalance: number;
  status?: string;
  marginPercent: number;
  followSide?: string;
  positions: Array<{
    symbol: string;
    positionSide: string;
    positionSize: number;
    leverage: number;
    entryPrice: number;
    markPrice?: number;
    exchangePlatform?: string;
    skipTrade: boolean;
  }>;
};

export type TradingFoxOrderHistory = {
  hasMore?: boolean;
  items: Array<{
    clientOrderId: string;
    symbol: string;
    side: string;
    status?: string;
    price: string;
    contractAmount: string;
    leverage: number;
    isMock: boolean;
    timestamp: string;
    message?: string;
  }>;
  limit?: number;
  offset?: number;
  returnedCount?: number;
  signalSourceOrdersNextCursor?: string;
  signalSourceOrders: Array<{
    eventId: string;
    signalSourceId: string;
    signalSourceName?: string;
    signalType?: string;
    exchange?: string;
    symbol: string;
    side: string;
    action: string;
    prevQty?: string;
    currQty?: string;
    deltaQty?: string;
    isFullClose?: boolean;
    positionVersion?: number;
    tradeSeq?: number;
    sourceTimestamp?: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
    price?: string | number;
    priceSource?: string;
    entryPrice?: string | number;
    markPrice?: string | number;
  }>;
  tradeLogs: Array<{
    id: number;
    type: string;
    errorMessage?: string;
    ssTradeInfo?: Record<string, unknown>;
    ssConfig?: Record<string, unknown>;
    orderData?: Record<string, unknown>;
    additionalInfo?: Record<string, unknown>;
    timestamp: string;
    traderId?: number;
  }>;
  tradeLogsNextCursor?: string;
  traderOrdersNextCursor?: string;
};

export type TradingFoxStrategyDetail = {
  account: TradingFoxAccountStatus | null;
  accountError?: string;
  accountInitialEquity?: number;
  loadedSections?: TradingFoxStrategyDetailSection[];
  orderHistory: TradingFoxOrderHistory | null;
  orderHistoryError?: string;
  positions: TradingFoxPosition[];
  positionsError?: string;
  signalSources: TradingFoxSignalSource[];
  signalSourcesError?: string;
  strategyCurve: TradingFoxStrategyCurve | null;
  strategyCurveError?: string;
  strategy: TradingFoxCopyStrategy;
  trader: TradingFoxTrader;
};

export type TradingFoxTraderActionResponse = {
  actionId: string;
  detail?: TradingFoxStrategyDetail;
  result?: Record<string, unknown>;
  runtimeStatus?: TradingFoxRuntimeStatus;
};

export type TradingFoxCopyStrategyCurveWindow = "24h" | "7d" | "30d" | "90d" | "180d";

export type TradingFoxCopyStrategyDetailInput = {
  curveWindow?: unknown;
  orderLimit?: unknown;
  orderOffset?: unknown;
  sections?: unknown;
};

export type CreateMockConnectorInput = {
  accountName?: string;
  apiKey?: unknown;
  exchangePlatform?: unknown;
  mockMarginBalance?: unknown;
  password?: unknown;
  privateKey?: unknown;
  secret?: unknown;
  walletAddress?: unknown;
};

export type CreateConnectorInput = CreateMockConnectorInput & {
  ipAddress?: unknown;
  isMock?: unknown;
};

export type CreateHyperliquidAgentBindingInput = {
  accountName?: unknown;
  walletAddress?: unknown;
};

export type CompleteHyperliquidAgentBindingInput = {
  approveAgentSignature?: unknown;
  approveBuilderFeeSignature?: unknown;
};

export type TradingFoxConnectorWhitelistIP = {
  assignmentStatus: "assigned" | "unassigned";
  userId: number;
  exchangePlatform: string;
  ipAddress: TradingFoxIPAddress | null;
  whitelistIp: string;
};

export type CreateCopyStrategyInput = {
  exchangeConnectorId?: unknown;
  signalSourceId: string;
  strategyName?: unknown;
  traderName: string;
  platform: string;
  avatarUrl?: string;
  positionsCount?: number;
  eventsCount?: number;
  takeProfitPercent: number;
  stopLossPercent: number;
};

export type CreateTradingFoxStrategyInput = {
  autoStart?: unknown;
  config?: unknown;
  configSchemaVersion?: unknown;
  copyTrading?: unknown;
  enableSltpMonitoring?: unknown;
  exchangeConnectorId?: unknown;
  strategyDefinitionId?: unknown;
  strategyName?: unknown;
};

export type SyncCopyStrategyPositionsInput = {
  ratioPercent?: unknown;
};

export type ExecuteTradingFoxTraderActionInput = {
  payload?: unknown;
};

export type UpdateCopyStrategySettingsInput = {
  config?: unknown;
  configSchemaVersion?: unknown;
  stopLossPercent?: unknown;
  strategyDefinitionId?: unknown;
  strategyName?: unknown;
  takeProfitPercent?: unknown;
};

export class TradingFoxConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TradingFoxConfigError";
  }
}

export class TradingFoxApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TradingFoxApiError";
    this.status = status;
  }
}
