import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export type StoredMessage = { role: "user" | "assistant"; content: string };

export const CHAT_TTL = 60 * 60 * 24;

export const chatKey = (sessionId: string) => `elective-chat:${sessionId}`;
