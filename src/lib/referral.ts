export const REFERRAL_COMMISSION_STATUSES = [
  "pending",
  "available",
  "reversed",
  "cancelled",
] as const;

export type ReferralCommissionStatus = (typeof REFERRAL_COMMISSION_STATUSES)[number];

export type ReferralDashboardResponse = {
  profile: {
    userId: string;
    tier: string;
    status: string;
    dashboardAccess: boolean;
    currentPlan: {
      code: string;
      name: string;
      maxDepth: number;
      rates: Array<{
        depth: number;
        eventType: string;
        rateBps: number;
        ratePercent: number;
      }>;
    };
  };
  invite: {
    personalCode: string;
    telegramStartPayload: string;
    telegramBotStartUrl?: string | null;
  };
  networkCounts: Array<{
    depth: 1 | 2 | 3;
    count: number;
  }>;
  commissionTotals: ReferralCommissionTotal[];
  recentCommissions: ReferralCommissionItem[];
};

export type ReferralInviteesResponse = {
  items: ReferralInviteeItem[];
  pagination: ReferralPagination;
};

export type ReferralCommissionsResponse = {
  items: ReferralCommissionItem[];
  pagination: ReferralPagination;
};

export type ReferralPagination = {
  limit: number;
  offset: number;
  total: number;
};

export type ReferralCommissionTotal = {
  currency: string;
  status: ReferralCommissionStatus;
  amount: string;
};

export type ReferralInviteeItem = {
  user: ReferralUserSnapshot;
  depth: 1 | 2 | 3;
  boundAt: string | null;
  createdAt: string;
};

export type ReferralCommissionItem = {
  id: string;
  referredUser: ReferralUserSnapshot;
  depth: number;
  eventType: string;
  currency: string;
  baseAmount: string;
  rateBps: number;
  commissionAmount: string;
  status: ReferralCommissionStatus;
  availableAt: string | null;
  createdAt: string;
};

export type ReferralUserSnapshot = {
  id: string;
  status: string;
  customerTier: string;
  createdAt: string;
  telegram: {
    avatarUrl: string | null;
    id: string | null;
    name: string | null;
    username: string | null;
  } | null;
};
