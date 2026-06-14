// lib/db.ts
// Abstraction layer for persistence - works in dev (file) and prod (Upstash Redis)
import { TournamentState } from './types';

// ──────────────────────────────────────────────────────────────────────────
// In-memory cache for serverless edge (per-instance)
// Real persistence uses Upstash Redis in production
// ──────────────────────────────────────────────────────────────────────────

let redisClient: import('@upstash/redis').Redis | null = null;

async function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!redisClient) {
    const { Redis } = await import('@upstash/redis');
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redisClient;
}

// In-memory fallback for local dev
const inMemoryStore = new Map<string, TournamentState>();

export async function getSession(sessionId: string): Promise<TournamentState | null> {
  const redis = await getRedis();
  if (redis) {
    const data = await redis.get<TournamentState>(`copa2026:${sessionId}`);
    return data ?? null;
  }
  return inMemoryStore.get(sessionId) ?? null;
}

export async function saveSession(sessionId: string, state: TournamentState): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    // Expire after 180 days
    await redis.set(`copa2026:${sessionId}`, state, { ex: 60 * 60 * 24 * 180 });
  } else {
    inMemoryStore.set(sessionId, state);
  }
}
