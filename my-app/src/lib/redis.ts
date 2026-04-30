import IORedis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __redis: IORedis | undefined;
}

if (!global.__redis) {
  global.__redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");
}

export const redis = global.__redis;

export type StoredMessage = { role: "user" | "assistant"; content: string };

export const CHAT_TTL = 60 * 60 * 24;

export const chatKey = (sessionId: string) => `elective-chat:${sessionId}`;
