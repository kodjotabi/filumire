import { createHash } from "node:crypto";

import { pool } from "../database";

/*
 * Fixed-window request limiter for sign-in, registration and
 * account changes.
 *
 * With Postgres persistence the counts live in auth_rate_limits,
 * so every server instance (each Vercel function) shares them and
 * they survive restarts. Keys are stored only as SHA-256 hashes,
 * so the table never holds client addresses or login names. The
 * memory backend keeps the same behaviour in-process for local
 * development and tests.
 *
 * The per-account lockout stored with each credential
 * (services/account) remains the main defence against guessing a
 * particular password; these limits slow broad guessing and abuse.
 */

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface RateLimitBackend {
  consume(
    keyHash: string,
    windowMs: number,
    now: number,
  ): Promise<{ count: number; resetAt: number }>;
  reset(): Promise<void>;
}

interface Window {
  count: number;
  resetAt: number;
}

const MAX_TRACKED_KEYS = 10_000;

function createMemoryBackend(): RateLimitBackend {
  const shared = globalThis as {
    __filumireRateLimitWindows?: Map<string, Window>;
  };
  const windows = (shared.__filumireRateLimitWindows ??= new Map());

  return {
    async consume(keyHash, windowMs, now) {
      if (windows.size > MAX_TRACKED_KEYS) {
        for (const [storedKey, window] of windows) {
          if (window.resetAt <= now) {
            windows.delete(storedKey);
          }
        }
      }

      let window = windows.get(keyHash);

      if (!window || window.resetAt <= now) {
        window = { count: 0, resetAt: now + windowMs };
        windows.set(keyHash, window);
      }

      window.count += 1;

      return { count: window.count, resetAt: window.resetAt };
    },

    async reset() {
      windows.clear();
    },
  };
}

/*
 * One atomic upsert per check: a row whose window has ended starts
 * a new window at 1, otherwise its count goes up by one. Concurrent
 * requests on any instance therefore never lose a count.
 */
function createPostgresBackend(): RateLimitBackend {
  let lastSweep = 0;

  return {
    async consume(keyHash, windowMs, now) {
      const result = await pool.query<{ count: number; reset_at: Date }>(
        `INSERT INTO auth_rate_limits AS l (key_hash, window_ends_at, request_count)
         VALUES ($1, $2, 1)
         ON CONFLICT (key_hash) DO UPDATE SET
           request_count = CASE WHEN l.window_ends_at <= $3 THEN 1 ELSE l.request_count + 1 END,
           window_ends_at = CASE WHEN l.window_ends_at <= $3 THEN EXCLUDED.window_ends_at ELSE l.window_ends_at END
         RETURNING request_count AS count, window_ends_at AS reset_at`,
        [keyHash, new Date(now + windowMs), new Date(now)],
      );

      // Expired windows carry no information; clear them out now
      // and then rather than on every request.
      if (now - lastSweep > 10 * 60_000) {
        lastSweep = now;
        await pool.query(
          "DELETE FROM auth_rate_limits WHERE window_ends_at < $1",
          [new Date(now - 60 * 60_000)],
        );
      }

      const row = result.rows[0];

      return { count: row.count, resetAt: row.reset_at.getTime() };
    },

    async reset() {
      await pool.query("DELETE FROM auth_rate_limits");
    },
  };
}

const backend: RateLimitBackend =
  (process.env.FILUMIRE_PERSISTENCE ?? "memory") === "postgres"
    ? createPostgresBackend()
    : createMemoryBackend();

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): Promise<RateLimitResult> {
  const { count, resetAt } = await backend.consume(
    hashKey(key),
    windowMs,
    now,
  );

  return {
    allowed: count <= limit,
    retryAfterSeconds: Math.min(
      Math.ceil(windowMs / 1000),
      Math.max(1, Math.ceil((resetAt - now) / 1000)),
    ),
  };
}

/*
 * Clears every window. Tests only.
 */
export async function resetRateLimits(): Promise<void> {
  await backend.reset();
}

/*
 * The client address as seen by the first trusted proxy. Behind
 * Vercel or another proxy x-forwarded-for is set by the platform;
 * locally there is usually no header and all requests share one
 * bucket, which is the safe direction to fail in.
 */
export function getClientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first.slice(0, 64);
    }
  }

  return request.headers.get("x-real-ip")?.slice(0, 64) ?? "local";
}
