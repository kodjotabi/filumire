/*
 * PostgreSQL transaction runner for the payment stores (Payments Phase 2, step 3, B3).
 *
 * - READ COMMITTED (the server default) with explicit row locks taken by the caller.
 * - `SET LOCAL lock_timeout` so a blocked lock fails (55P03) instead of hanging a request.
 * - Bounded retry of the whole transaction on retryable conflicts: 40001 (serialization
 *   failure), 40P01 (deadlock detected), 55P03 (lock not available). Each try runs on a fresh
 *   connection after ROLLBACK, re-reads state and re-applies the SAME request, so the work must
 *   be idempotent under its own from-status checks (every payment store operation is).
 * - The work function receives only a database client: provider calls cannot happen inside a
 *   transaction because the stores never hold an adapter (the recorder calls the provider
 *   between store operations).
 * - Errors raised at COMMIT (deferred constraint triggers / FKs in 0019) surface like any
 *   other error after rollback.
 * Exhausted retries -> PaymentError PERSISTENCE_RETRYABLE (nothing committed; safe to repeat).
 * Connection-level failures are NOT retried here: a lost COMMIT acknowledgement is ambiguous,
 * and the caller must re-read before deciding (the recorder does, by idempotency key).
 */
import type { Pool, PoolClient } from "pg";
import { PaymentError } from "../../../packages/payments";

export const RETRYABLE_SQLSTATES: readonly string[] = ["40001", "40P01", "55P03"];

export interface PgTransactionOptions {
  /* Total tries including the first (default 3, 1-10). */
  maxAttempts?: number;
  /* lock_timeout per try, in milliseconds (default 5000). */
  lockTimeoutMs?: number;
  /* Delay before try n+1 (default 25 ms * n). Tests pass () => 0. */
  backoffMs?: (failedAttempt: number) => number;
}

export function sqlState(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : undefined;
}

export function isRetryableConflict(error: unknown): boolean {
  const code = sqlState(error);
  return code !== undefined && RETRYABLE_SQLSTATES.includes(code);
}

export function resolveTransactionOptions(options: PgTransactionOptions = {}): Required<PgTransactionOptions> {
  const maxAttempts = options.maxAttempts ?? 3;
  const lockTimeoutMs = options.lockTimeoutMs ?? 5000;
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
    throw new PaymentError("CONFIGURATION", "maxAttempts must be an integer from 1 to 10.");
  }
  if (!Number.isSafeInteger(lockTimeoutMs) || lockTimeoutMs < 1 || lockTimeoutMs > 60_000) {
    throw new PaymentError("CONFIGURATION", "lockTimeoutMs must be an integer from 1 to 60000.");
  }
  return { maxAttempts, lockTimeoutMs, backoffMs: options.backoffMs ?? ((n) => 25 * n) };
}

export async function runTransaction<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>,
  options: Required<PgTransactionOptions>,
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    const client = await pool.connect();
    let broken = false;
    try {
      await client.query("BEGIN");
      await client.query(`SET LOCAL lock_timeout = '${options.lockTimeoutMs}ms'`);
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {
        broken = true;
      });
      if (!isRetryableConflict(error)) throw error;
      if (attempt >= options.maxAttempts) {
        throw new PaymentError(
          "PERSISTENCE_RETRYABLE",
          `Payment store conflict (database code ${sqlState(error)}) persisted after ${attempt} tries; nothing was saved. Retry the same request.`,
        );
      }
    } finally {
      client.release(broken);
    }
    const delay = options.backoffMs(attempt);
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
