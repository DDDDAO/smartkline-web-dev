import type { TelegramCommunityBinding } from "@/app/_lib/auth/telegram-auth";

export type TelegramInviteRecord = {
  chatId: string;
  createdAt: string;
  expiresAt: string;
  inviteLink: string;
  status: "created" | "used" | "expired";
  telegramUserId: string;
  token: string;
  userId: string;
};

export type TelegramMembershipRecord = {
  chatId: string;
  inviteToken?: string;
  joinedAt?: string;
  leftAt?: string;
  source: string;
  status: TelegramCommunityBinding;
  telegramUserId: string;
  updatedAt: string;
  userId?: string;
};

export type TelegramCommunityStore = {
  getInvite: (token: string) => Promise<TelegramInviteRecord | null>;
  getMembership: (chatId: string, telegramUserId: string) => Promise<TelegramMembershipRecord | null>;
  saveInvite: (inviteRecord: TelegramInviteRecord, ttlSeconds: number) => Promise<void>;
  saveMembership: (membershipRecord: TelegramMembershipRecord) => Promise<void>;
};

type ExpiringInviteRecord = {
  expiresAtMs: number;
  value: TelegramInviteRecord;
};

const memoryInviteRecords = new Map<string, ExpiringInviteRecord>();
const memoryMembershipRecords = new Map<string, TelegramMembershipRecord>();

/**
 * Process memory keeps the BFF membership contract testable before choosing a durable store.
 * On Vercel this is not a reliable production source; replace this adapter with Redis/Postgres/KV.
 */
const memoryTelegramCommunityStore: TelegramCommunityStore = {
  async getInvite(token) {
    const key = createInviteKey(token);
    const inviteRecord = memoryInviteRecords.get(key);

    if (!inviteRecord) {
      return null;
    }

    if (Date.now() > inviteRecord.expiresAtMs) {
      memoryInviteRecords.delete(key);
      return null;
    }

    return inviteRecord.value;
  },

  async getMembership(chatId, telegramUserId) {
    return memoryMembershipRecords.get(createMembershipKey(chatId, telegramUserId)) ?? null;
  },

  async saveInvite(inviteRecord, ttlSeconds) {
    memoryInviteRecords.set(createInviteKey(inviteRecord.token), {
      expiresAtMs: Date.now() + ttlSeconds * 1000,
      value: inviteRecord,
    });
  },

  async saveMembership(membershipRecord) {
    const key = createMembershipKey(membershipRecord.chatId, membershipRecord.telegramUserId);
    const currentMembership = memoryMembershipRecords.get(key);

    memoryMembershipRecords.set(key, {
      ...currentMembership,
      ...membershipRecord,
      joinedAt: membershipRecord.joinedAt ?? currentMembership?.joinedAt,
      leftAt: membershipRecord.leftAt ?? currentMembership?.leftAt,
      userId: membershipRecord.userId ?? currentMembership?.userId,
    });
  },
};

export function getTelegramCommunityStore(): TelegramCommunityStore {
  return memoryTelegramCommunityStore;
}

function createInviteKey(token: string): string {
  return `sk:telegram:invite:${token}`;
}

function createMembershipKey(chatId: string, telegramUserId: string): string {
  return `sk:telegram:membership:${chatId}:${telegramUserId}`;
}
