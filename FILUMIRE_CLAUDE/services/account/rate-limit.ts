/*
 * Fixed-window request limiter for sign-in and registration.
 *
 * In-process only: each server instance counts separately and the
 * counts reset on restart. That is enough to slow casual guessing
 * locally and on a single instance; the durable defence against
 * password guessing is the per-account lockout stored with the
 * credential (services/account). A shared store (for example
 * Postgres or Redis) is needed before multi-instance hosting.
 */
interface Window {
  count: number;
  resetAt: number;
}

const shared = globalThis as {
  __filumireRateLimitWindows?: Map<string, Window>;
};

const windows = (shared.__filumireRateLimitWindows ??= new Map());

const MAX_TRACKED_KEYS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  if (windows.size > MAX_TRACKED_KEYS) {
    for (const [storedKey, window] of windows) {
      if (window.resetAt <= now) {
        windows.delete(storedKey);
      }
    }
  }

  let window = windows.get(key);

  if (!window || window.resetAt <= now) {
    window = { count: 0, resetAt: now + windowMs };
    windows.set(key, window);
  }

  window.count += 1;

  return {
    allowed: window.count <= limit,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((window.resetAt - now) / 1000),
    ),
  };
}

export function resetRateLimits(): void {
  windows.clear();
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
