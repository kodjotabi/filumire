/*
 * Postgres payment attempt store (Payments Phase 2, step 2; tables from
 * migration 0018). The pool is injected (normally services/database.ts) so
 * importing this module never opens a connection.
 *
 * Durability and concurrency come from the database: unique constraints on
 * idempotency_key / our_reference / (provider, provider_reference), a partial
 * unique index allowing one active attempt per obligation and one success per
 * obligation, SELECT ... FOR UPDATE around every transition, and the 0018
 * triggers (lifecycle, succeeded immutability, append-only events).
 *
 * B3: transactions go through ./pg-transaction (lock_timeout, bounded retry on
 * 40001 / 40P01 / 55P03, PERSISTENCE_RETRYABLE when exhausted). The insert and
 * transition steps are protected so the obligation-bound PostgresPaymentLedger
 * (services/payments/obligations/postgres-ledger.ts, migration 0019) can run
 * them inside its own transaction AFTER locking the obligation row. Once 0019
 * is applied this attempt-only store can no longer complete a success on its
 * own: the 0019 commit-time check refuses a succeeded attempt without a receipt
 * and settlement, so use the ledger there.
 */
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { canTransition, PaymentError } from "../../../packages/payments";
import type {
  AttemptPatch,
  CreateResult,
  NewPaymentAttempt,
  PaymentAttemptEvent,
  PaymentAttemptRecord,
  PaymentAttemptStore,
  TransitionRequest,
  TransitionResult,
} from "./index";
import { resolveTransactionOptions, runTransaction, type PgTransactionOptions } from "./pg-transaction";

export const CREATE_CONFLICTS: Record<string, Exclude<CreateResult, { created: true }>["conflict"]> = {
  payment_attempts_idempotency_key_unique: "idempotency_key",
  payment_attempts_our_reference_unique: "our_reference",
  payment_attempts_one_active_per_obligation: "obligation_active",
  payment_attempts_one_success_per_obligation: "obligation_succeeded",
};

const PATCH_COLUMNS: Record<keyof AttemptPatch, string> = {
  providerReference: "provider_reference",
  observedStatus: "observed_status",
  observedAmountMinor: "observed_amount_minor",
  observedCurrency: "observed_currency",
  verificationFailures: "verification_failures",
  lastErrorCode: "last_error_code",
  confirmedAt: "confirmed_at",
};

type Row = Record<string, unknown>;

export function toAttempt(row: Row): PaymentAttemptRecord {
  return {
    id: row.id as string,
    idempotencyKey: row.idempotency_key as string,
    obligationId: row.obligation_id as string,
    ourReference: row.our_reference as string,
    requestFingerprint: row.request_fingerprint as string,
    provider: row.provider as string,
    mode: row.mode as PaymentAttemptRecord["mode"],
    providerReference: (row.provider_reference as string | null) ?? null,
    payerPrincipalId: row.payer_principal_id as string,
    billingAccountId: (row.billing_account_id as string | null) ?? null,
    amountMinor: row.amount_minor as number,
    currency: row.currency as PaymentAttemptRecord["currency"],
    status: row.status as PaymentAttemptRecord["status"],
    observedStatus: (row.observed_status as PaymentAttemptRecord["observedStatus"]) ?? null,
    observedAmountMinor: (row.observed_amount_minor as number | null) ?? null,
    observedCurrency: (row.observed_currency as string | null) ?? null,
    verificationFailures: (row.verification_failures as string[] | null) ?? null,
    lastErrorCode: (row.last_error_code as string | null) ?? null,
    verifyCount: row.verify_count as number,
    confirmedAt: (row.confirmed_at as Date | null) ?? null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

function toEvent(row: Row): PaymentAttemptEvent {
  return {
    id: row.id as string,
    attemptId: row.attempt_id as string,
    sequence: row.sequence as number,
    eventType: row.event_type as string,
    fromStatus: (row.from_status as PaymentAttemptEvent["fromStatus"]) ?? null,
    toStatus: (row.to_status as PaymentAttemptEvent["toStatus"]) ?? null,
    detail: row.detail as PaymentAttemptEvent["detail"],
    createdAt: row.created_at as Date,
  };
}

export function persistenceError(error: unknown): PaymentError {
  const code = (error as { code?: string }).code ?? "unknown";
  return new PaymentError("PERSISTENCE_ERROR", `Payment store operation failed (database code ${code}).`);
}

/* 23505 on a known constraint -> the matching create conflict; anything else -> null. */
export function createConflict(error: unknown): Exclude<CreateResult, { created: true }> | null {
  const { code, constraint } = error as { code?: string; constraint?: string };
  if (code === "23505" && constraint && CREATE_CONFLICTS[constraint]) {
    return { created: false, conflict: CREATE_CONFLICTS[constraint] };
  }
  return null;
}

export class PostgresPaymentAttemptStore implements PaymentAttemptStore {
  private readonly txOptions: ReturnType<typeof resolveTransactionOptions>;

  constructor(
    protected readonly pool: Pool,
    transactionOptions: PgTransactionOptions = {},
  ) {
    this.txOptions = resolveTransactionOptions(transactionOptions);
  }

  protected tx<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    return runTransaction(this.pool, work, this.txOptions);
  }

  async create(input: NewPaymentAttempt): Promise<CreateResult> {
    try {
      return await this.tx((client) => this.insertAttempt(client, input));
    } catch (error) {
      const conflict = createConflict(error);
      if (conflict) return conflict;
      if (error instanceof PaymentError) throw error;
      throw persistenceError(error);
    }
  }

  /* Inserts the attempt ("created") and its "created" event on the caller's transaction. */
  protected async insertAttempt(client: PoolClient, input: NewPaymentAttempt): Promise<CreateResult> {
    const inserted = await client.query(
      `INSERT INTO payment_attempts
         (id, idempotency_key, obligation_id, our_reference, request_fingerprint, provider, mode,
          payer_principal_id, billing_account_id, amount_minor, currency, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'created', $12, $12)
       RETURNING *`,
      [
        input.id, input.idempotencyKey, input.obligationId, input.ourReference, input.requestFingerprint,
        input.provider, input.mode, input.payerPrincipalId, input.billingAccountId, input.amountMinor,
        input.currency, input.createdAt,
      ],
    );
    await client.query(
      `INSERT INTO payment_attempt_events (id, attempt_id, sequence, event_type, from_status, to_status, detail, created_at)
       VALUES ($1, $2, 1, 'created', NULL, 'created', '{}'::jsonb, $3)`,
      [randomUUID(), input.id, input.createdAt],
    );
    return { created: true, attempt: toAttempt(inserted.rows[0] as Row) };
  }

  async findById(id: string): Promise<PaymentAttemptRecord | null> {
    const result = await this.pool.query("SELECT * FROM payment_attempts WHERE id = $1", [id]);
    return result.rows[0] ? toAttempt(result.rows[0]) : null;
  }

  async findByIdempotencyKey(key: string): Promise<PaymentAttemptRecord | null> {
    const result = await this.pool.query("SELECT * FROM payment_attempts WHERE idempotency_key = $1", [key]);
    return result.rows[0] ? toAttempt(result.rows[0]) : null;
  }

  async listByObligation(obligationId: string): Promise<PaymentAttemptRecord[]> {
    const result = await this.pool.query(
      "SELECT * FROM payment_attempts WHERE obligation_id = $1 ORDER BY created_at, id",
      [obligationId],
    );
    return result.rows.map(toAttempt);
  }

  async listActive(updatedBefore: Date, limit: number): Promise<PaymentAttemptRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM payment_attempts
        WHERE status IN ('created', 'pending', 'unknown') AND updated_at < $1
        ORDER BY updated_at, id LIMIT $2`,
      [updatedBefore, limit],
    );
    return result.rows.map(toAttempt);
  }

  async transition(attemptId: string, request: TransitionRequest): Promise<TransitionResult> {
    try {
      return await this.tx(async (client) => {
        const current = await this.lockAttempt(client, attemptId);
        if (!this.transitionAllowed(current, request)) return { applied: false, attempt: current } as TransitionResult;
        return { applied: true, attempt: await this.applyAttemptTransition(client, current, request) } as TransitionResult;
      });
    } catch (error) {
      if (error instanceof PaymentError) throw error;
      throw persistenceError(error);
    }
  }

  protected async lockAttempt(client: PoolClient, attemptId: string): Promise<PaymentAttemptRecord> {
    const locked = await client.query("SELECT * FROM payment_attempts WHERE id = $1 FOR UPDATE", [attemptId]);
    if (!locked.rows[0]) throw new PaymentError("PERSISTENCE_ERROR", "Unknown payment attempt.");
    return toAttempt(locked.rows[0]);
  }

  protected transitionAllowed(current: PaymentAttemptRecord, request: TransitionRequest): boolean {
    return request.from.includes(current.status) && canTransition(current.status, request.to ?? current.status);
  }

  /* Guarded UPDATE + event with the next sequence, on the caller's transaction (attempt row already locked). */
  protected async applyAttemptTransition(client: PoolClient, current: PaymentAttemptRecord, request: TransitionRequest): Promise<PaymentAttemptRecord> {
    const attemptId = current.id;
    const to = request.to ?? current.status;
    const sets = ["status = $2", "updated_at = $3"];
    const values: unknown[] = [attemptId, to, request.at];
    for (const [key, column] of Object.entries(PATCH_COLUMNS) as Array<[keyof AttemptPatch, string]>) {
      const value = request.patch?.[key];
      if (value === undefined) continue;
      values.push(key === "verificationFailures" && value !== null ? JSON.stringify(value) : value);
      sets.push(`${column} = $${values.length}`);
    }
    if (request.incrementVerifyCount) sets.push("verify_count = verify_count + 1");
    const updated = await client.query(`UPDATE payment_attempts SET ${sets.join(", ")} WHERE id = $1 RETURNING *`, values);

    await client.query(
      `INSERT INTO payment_attempt_events (id, attempt_id, sequence, event_type, from_status, to_status, detail, created_at)
       SELECT $1, $2, coalesce(max(sequence), 0) + 1, $3, $4, $5, $6::jsonb, $7
         FROM payment_attempt_events WHERE attempt_id = $2`,
      [randomUUID(), attemptId, request.event.type, current.status, to, JSON.stringify(request.event.detail ?? {}), request.at],
    );
    return toAttempt(updated.rows[0]);
  }

  async listEvents(attemptId: string): Promise<PaymentAttemptEvent[]> {
    const result = await this.pool.query(
      "SELECT * FROM payment_attempt_events WHERE attempt_id = $1 ORDER BY sequence",
      [attemptId],
    );
    return result.rows.map(toEvent);
  }
}
