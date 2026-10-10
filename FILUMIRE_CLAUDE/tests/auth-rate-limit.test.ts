import { consumeRateLimit, resetRateLimits } from "../services/account/rate-limit";
import { pool } from "../services/database";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const persistence = process.env.FILUMIRE_PERSISTENCE ?? "memory";

async function main(): Promise<void> {
  const run = Date.now().toString(36);

  // Concurrent requests: exactly `limit` are allowed, none lost.
  const key = `test:concurrent:${run}`;
  const results = await Promise.all(
    Array.from({ length: 25 }, () => consumeRateLimit(key, 20, 60_000)),
  );
  const allowed = results.filter((result) => result.allowed).length;
  assert(allowed === 20, `expected 20 allowed of 25 concurrent, got ${allowed}`);
  assert(
    results.every((result) => result.retryAfterSeconds > 0 && result.retryAfterSeconds <= 60),
    "retry-after stays inside the window",
  );
  console.log({ test: "concurrent requests share one exact count", result: "PASS" });

  // Separate keys do not interfere.
  const other = await consumeRateLimit(`test:other:${run}`, 1, 60_000);
  assert(other.allowed, "a different key has its own window");
  console.log({ test: "keys are independent", result: "PASS" });

  // A window that has ended starts again from one.
  const windowKey = `test:window:${run}`;
  const start = Date.now();
  assert((await consumeRateLimit(windowKey, 1, 1_000, start)).allowed, "first request allowed");
  assert(!(await consumeRateLimit(windowKey, 1, 1_000, start + 10)).allowed, "second request inside window refused");
  assert((await consumeRateLimit(windowKey, 1, 1_000, start + 1_500)).allowed, "request after window ends allowed");
  console.log({ test: "expired windows restart", result: "PASS" });

  if (persistence === "postgres") {
    const stored = await pool.query<{ key_hash: string }>(
      "SELECT key_hash FROM auth_rate_limits WHERE key_hash LIKE '%test:%'",
    );
    assert(stored.rows.length === 0, "raw keys are never stored");
    console.log({ test: "only hashed keys are stored", result: "PASS" });
  }

  await resetRateLimits();
  console.log({ rateLimitTest: "PASS", persistence });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (persistence === "postgres") await pool.end();
  });
