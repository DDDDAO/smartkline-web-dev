import { randomBytes } from "node:crypto";
import { safeEqual, type TelegramAuthSession, type TelegramCommunityBinding } from "@/lib/auth/telegram-auth";
import {
  getTelegramCommunityStore,
  type TelegramInviteRecord,
  type TelegramMembershipRecord,
} from "@/lib/auth/telegram-community-store";

const TELEGRAM_BOT_API_BASE_URL = "https://api.telegram.org";
const DEFAULT_INVITE_TTL_SECONDS = 10 * 60;
const INVITE_RECORD_RETENTION_SECONDS = 24 * 60 * 60;
const INVITE_TOKEN_BYTE_LENGTH = 8;

type TelegramCommunityConfig = {
  botToken: string;
  chatId: string;
  inviteTtlSeconds: number;
  webhookSecret: string;
};

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

type TelegramChatInviteLink = {
  invite_link: string;
  name?: string;
};

type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type TelegramChat = {
  id: number | string;
  title?: string;
  type?: string;
};

type TelegramChatMember = {
  is_member?: boolean;
  status: string;
  user: TelegramUser;
};

type TelegramChatMemberUpdated = {
  chat: TelegramChat;
  date?: number;
  invite_link?: TelegramChatInviteLink;
  new_chat_member: TelegramChatMember;
  old_chat_member: TelegramChatMember;
};

type TelegramChatJoinRequest = {
  chat: TelegramChat;
  date?: number;
  from: TelegramUser;
  invite_link?: TelegramChatInviteLink;
};

type TelegramMessage = {
  chat: TelegramChat;
  date?: number;
  left_chat_member?: TelegramUser;
  new_chat_members?: TelegramUser[];
};

type TelegramWebhookUpdate = {
  update_id?: number;
  chat_join_request?: TelegramChatJoinRequest;
  chat_member?: TelegramChatMemberUpdated;
  message?: TelegramMessage;
};

export type TelegramCommunityInviteResponse = {
  communityBinding: TelegramCommunityBinding;
  expiresAt: string | null;
  inviteLink: string | null;
};

export type TelegramCommunityRefreshResponse = {
  communityBinding: TelegramCommunityBinding;
};

export async function createTelegramCommunityInvite(session: TelegramAuthSession): Promise<TelegramCommunityInviteResponse> {
  const config = resolveTelegramCommunityConfig();
  const telegramUserId = requireTelegramUserId(session);
  const currentMembership = await getTelegramMembership(config.chatId, telegramUserId);

  if (currentMembership?.status === "joined") {
    return {
      communityBinding: "joined",
      expiresAt: null,
      inviteLink: null,
    };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.inviteTtlSeconds * 1000);
  const token = randomBytes(INVITE_TOKEN_BYTE_LENGTH).toString("hex");
  const inviteName = `sk_${token}`;
  const inviteLink = await callTelegramBotApi<TelegramChatInviteLink>(config, "createChatInviteLink", {
    chat_id: config.chatId,
    expire_date: Math.floor(expiresAt.getTime() / 1000),
    member_limit: 1,
    name: inviteName,
  });

  const inviteRecord: TelegramInviteRecord = {
    chatId: config.chatId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    inviteLink: inviteLink.invite_link,
    status: "created",
    telegramUserId,
    token,
    userId: session.user.id,
  };
  const pendingMembership = createMembershipRecord({
    chatId: config.chatId,
    inviteToken: token,
    source: "invite_created",
    status: "pending",
    telegramUserId,
    userId: session.user.id,
  });

  await Promise.all([
    saveTelegramInvite(inviteRecord, config.inviteTtlSeconds + INVITE_RECORD_RETENTION_SECONDS),
    saveTelegramMembership(pendingMembership),
  ]);

  return {
    communityBinding: "pending",
    expiresAt: inviteRecord.expiresAt,
    inviteLink: inviteRecord.inviteLink,
  };
}

export async function refreshTelegramCommunityMembership(session: TelegramAuthSession): Promise<TelegramCommunityRefreshResponse> {
  const config = resolveTelegramCommunityConfig();
  const telegramUserId = requireTelegramUserId(session);
  const membership = await fetchTelegramMembershipFromBot(config, telegramUserId);

  await saveTelegramMembership({
    ...membership,
    userId: session.user.id,
  });

  return { communityBinding: membership.status };
}

export async function getTelegramCommunityBindingForSession(session: TelegramAuthSession): Promise<TelegramCommunityBinding> {
  if (!session.user.telegramId || !process.env.TELEGRAM_COMMUNITY_CHAT_ID) {
    return "unverified";
  }

  const membership = await getTelegramMembership(process.env.TELEGRAM_COMMUNITY_CHAT_ID, session.user.telegramId);
  return membership?.status ?? "unverified";
}

export async function handleTelegramCommunityWebhook(update: TelegramWebhookUpdate): Promise<void> {
  const config = resolveTelegramCommunityConfig();

  if (update.chat_member && isConfiguredChat(update.chat_member.chat, config.chatId)) {
    await handleChatMemberUpdate(config, update.chat_member);
  }

  if (update.chat_join_request && isConfiguredChat(update.chat_join_request.chat, config.chatId)) {
    await handleChatJoinRequest(config, update.chat_join_request);
  }

  if (update.message && isConfiguredChat(update.message.chat, config.chatId)) {
    await handleMembershipServiceMessage(config, update.message);
  }
}

export function verifyTelegramWebhookSecret(headerValue: string | null): boolean {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  if (!expectedSecret || !headerValue) {
    return false;
  }

  return safeEqual(headerValue, expectedSecret);
}

export function resolveTelegramCommunityConfig(): TelegramCommunityConfig {
  const botToken = readRequiredEnv("TELEGRAM_BOT_TOKEN");
  const chatId = readRequiredEnv("TELEGRAM_COMMUNITY_CHAT_ID");
  const webhookSecret = readRequiredEnv("TELEGRAM_WEBHOOK_SECRET");
  const inviteTtlSeconds = readPositiveIntegerEnv("TELEGRAM_COMMUNITY_INVITE_TTL_SECONDS", DEFAULT_INVITE_TTL_SECONDS);

  return {
    botToken,
    chatId,
    inviteTtlSeconds,
    webhookSecret,
  };
}

export class TelegramCommunityConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramCommunityConfigError";
  }
}

async function fetchTelegramMembershipFromBot(config: TelegramCommunityConfig, telegramUserId: string): Promise<TelegramMembershipRecord> {
  try {
    const chatMember = await callTelegramBotApi<TelegramChatMember>(config, "getChatMember", {
      chat_id: config.chatId,
      user_id: Number(telegramUserId),
    });

    return createMembershipRecord({
      chatId: config.chatId,
      source: "refresh_getChatMember",
      status: mapTelegramChatMemberStatus(chatMember),
      telegramUserId,
    });
  } catch (error) {
    if (error instanceof TelegramBotApiError && /user not found|member not found/i.test(error.message)) {
      return createMembershipRecord({
        chatId: config.chatId,
        source: "refresh_getChatMember_not_found",
        status: "left",
        telegramUserId,
      });
    }

    throw error;
  }
}

async function handleChatMemberUpdate(config: TelegramCommunityConfig, chatMemberUpdate: TelegramChatMemberUpdated) {
  const telegramUserId = String(chatMemberUpdate.new_chat_member.user.id);
  const inviteToken = readInviteToken(chatMemberUpdate.invite_link);
  const status = mapTelegramChatMemberStatus(chatMemberUpdate.new_chat_member);
  const existingMembership = await getTelegramMembership(config.chatId, telegramUserId);
  const inviteRecord = inviteToken ? await getTelegramInvite(inviteToken) : null;

  await saveTelegramMembership(createMembershipRecord({
    chatId: config.chatId,
    inviteToken: inviteToken ?? existingMembership?.inviteToken,
    source: "webhook_chat_member",
    status,
    telegramUserId,
    userId: existingMembership?.userId ?? inviteRecord?.userId,
  }));

  if (inviteRecord && (status === "joined" || status === "pending")) {
    await saveTelegramInvite({ ...inviteRecord, status: "used" }, INVITE_RECORD_RETENTION_SECONDS);
  }
}

async function handleChatJoinRequest(config: TelegramCommunityConfig, joinRequest: TelegramChatJoinRequest) {
  const telegramUserId = String(joinRequest.from.id);
  const inviteToken = readInviteToken(joinRequest.invite_link);
  const inviteRecord = inviteToken ? await getTelegramInvite(inviteToken) : null;

  await saveTelegramMembership(createMembershipRecord({
    chatId: config.chatId,
    inviteToken,
    source: "webhook_chat_join_request",
    status: "pending",
    telegramUserId,
    userId: inviteRecord?.userId,
  }));
}

async function handleMembershipServiceMessage(config: TelegramCommunityConfig, message: TelegramMessage) {
  const membershipUpdates: TelegramMembershipRecord[] = [];

  for (const user of message.new_chat_members ?? []) {
    membershipUpdates.push(createMembershipRecord({
      chatId: config.chatId,
      source: "webhook_message_new_chat_members",
      status: "joined",
      telegramUserId: String(user.id),
    }));
  }

  if (message.left_chat_member) {
    membershipUpdates.push(createMembershipRecord({
      chatId: config.chatId,
      source: "webhook_message_left_chat_member",
      status: "left",
      telegramUserId: String(message.left_chat_member.id),
    }));
  }

  await Promise.all(membershipUpdates.map(saveTelegramMembership));
}

function createMembershipRecord(input: {
  chatId: string;
  inviteToken?: string;
  source: string;
  status: TelegramCommunityBinding;
  telegramUserId: string;
  userId?: string;
}): TelegramMembershipRecord {
  const now = new Date().toISOString();
  const isJoined = input.status === "joined";
  const isLeft = input.status === "left" || input.status === "kicked";

  return {
    chatId: input.chatId,
    inviteToken: input.inviteToken,
    joinedAt: isJoined ? now : undefined,
    leftAt: isLeft ? now : undefined,
    source: input.source,
    status: input.status,
    telegramUserId: input.telegramUserId,
    updatedAt: now,
    userId: input.userId,
  };
}

async function saveTelegramInvite(inviteRecord: TelegramInviteRecord, ttlSeconds: number): Promise<void> {
  await getTelegramCommunityStore().saveInvite(inviteRecord, ttlSeconds);
}

async function getTelegramInvite(token: string): Promise<TelegramInviteRecord | null> {
  return getTelegramCommunityStore().getInvite(token);
}

async function saveTelegramMembership(membershipRecord: TelegramMembershipRecord): Promise<void> {
  await getTelegramCommunityStore().saveMembership(membershipRecord);
}

async function getTelegramMembership(chatId: string, telegramUserId: string): Promise<TelegramMembershipRecord | null> {
  return getTelegramCommunityStore().getMembership(chatId, telegramUserId);
}

async function callTelegramBotApi<T>(config: TelegramCommunityConfig, method: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${TELEGRAM_BOT_API_BASE_URL}/bot${config.botToken}/${method}`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = await response.json() as TelegramApiResponse<T>;

  if (!response.ok || !payload.ok || typeof payload.result === "undefined") {
    throw new TelegramBotApiError(payload.description || `Telegram Bot API ${method} failed with status ${response.status}.`);
  }

  return payload.result;
}

export class TelegramBotApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramBotApiError";
  }
}

function mapTelegramChatMemberStatus(chatMember: TelegramChatMember): TelegramCommunityBinding {
  switch (chatMember.status) {
    case "creator":
    case "administrator":
    case "member":
      return "joined";
    case "restricted":
      return chatMember.is_member === false ? "left" : "joined";
    case "kicked":
      return "kicked";
    case "left":
      return "left";
    default:
      return "unverified";
  }
}

function isConfiguredChat(chat: TelegramChat, configuredChatId: string): boolean {
  return String(chat.id) === configuredChatId;
}

function readInviteToken(inviteLink?: TelegramChatInviteLink): string | undefined {
  if (!inviteLink?.name?.startsWith("sk_")) {
    return undefined;
  }

  return inviteLink.name.slice(3) || undefined;
}

function requireTelegramUserId(session: TelegramAuthSession): string {
  const telegramUserId = session.user.telegramId;

  if (!telegramUserId || !/^\d+$/.test(telegramUserId)) {
    throw new TelegramCommunityConfigError("Telegram numeric user id is required for community membership checks.");
  }

  return telegramUserId;
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new TelegramCommunityConfigError(`${name} is required for Telegram community membership.`);
  }

  return value;
}

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = process.env[name]?.trim();
  if (!value) {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}
