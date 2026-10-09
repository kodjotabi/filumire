/*
 * Postgres payment ledger (Payments Phase 2, step 3, B3): the obligation-bound
 * store over migration 0019, with the same rules as MemoryPaymentLedger (B2).
 * WRITTEN IN B3, NOT YET RUN AGAINST POSTGRESQL: 0019 is not applied. Its
 * locking claims are design claims until the B5 interleaving tests pass.
 *
 * Lock order (every obligation-touching transaction, Stage A section F):
 *   1. the obligation row, SELECT ... FOR UPDATE (one obligation per transaction);
 *   2. at most one attempt row, FOR UPDATE;
 *   3. principal_learner_access rows, FOR SHARE, ordered by id (evidence re-check),
 *      and inserts / updates (attempt, receipt, obligation, exceptions, events).
 * Access rows are leaf locks: revocation only updates an access row and never
 * waits for an obligation, so taking them before or after the writes cannot
 * close a cycle, and no lock cycle runs through obligations (one per transaction). Sweeps take one obligation per transaction; expiry
 * uses SKIP LOCKED. Retryable conflicts (40001, 40P01, 55P03) re-run the whole
 * transaction (store/pg-transaction.ts); the provider is never called here.
 *
 * What this closes (Step 2 race): an attempt can only be inserted after the
 * obligation row is locked and seen open, unexpired, sealed, with no active
 * attempt and with every beneficiary still authorised; settlement happens in
 * the same transaction as the attempt -> succeeded transition. The 0019 insert
 * trigger repeats the check (FOR SHARE) for anything that bypasses this class.
 */
import { randomUUID } from "node:crypto";
import type { PoolClient, Pool } from "pg";
import {
  canTransitionObligation,
  decideObligationOutcome,
  decidePostSuccessObservation,
  EXCEPTION_BLOCKS_FULFILMENT,
  evaluateGuardianV1,
  isOperatorOnlyTransition,
  MERCHANT_CONTEXT_PATTERN,
  PaymentError,
  receiptCandidate,
  receiptMatchesObligation,
  type BeneficiaryEvidence,
  type FinancialException,
  type FinancialExceptionKind,
  type ObligationStatus,
  type PaymentAttemptStatus,
  type PaymentObligation,
  type PaymentReceipt,
} from "../../../packages/payments";
import type {
  ClosedAttemptPage,
  CreateResult,
  NewPaymentAttempt,
  PaymentAttemptRecord,
  PostSuccessObservation,
  TransitionRequest,
  TransitionResult,
} from "../store";
import type { PgTransactionOptions } from "../store/pg-transaction";
import { sqlState } from "../store/pg-transaction";
import { createConflict, persistenceError, PostgresPaymentAttemptStore, toAttempt } from "../store/postgres";
import { beneficiaryRefusal } from "./authorization";
import type {
  CreateObligationResult,
  NewObligation,
  ObligationEvent,
  ObligationEventDetail,
  ObligationStore,
  ObligationTransitionResult,
} from "./store";
import { assertSnapshotHash, validateNewObligation } from "./validate";

type Row = Record<string, unknown>;

const ACTIVE_SQL = "('created', 'pending', 'unknown')";

export interface PostgresPaymentLedgerOptions {
  /* Scopes receipts: (provider, mode, merchant context, provider reference) is unique. */
  merchantContext: string;
  transaction?: PgTransactionOptions;
}

function toObligation(row: Row): PaymentObligation {
  return {
    id: row.id as string,
    payerPrincipalId: row.payer_principal_id as string,
    creationKey: row.creation_key as string,
    productCode: row.product_code as string,
    productVersion: row.product_version as string,
    productLabel: row.product_label as string,
    productTerms: row.product_terms as PaymentObligation["productTerms"],
    amountMinor: row.amount_minor as number,
    currency: row.currency as PaymentObligation["currency"],
    mode: row.mode as PaymentObligation["mode"],
    beneficiaryCount: row.beneficiary_count as number,
    snapshotHash: row.snapshot_hash as string,
    status: row.status as ObligationStatus,
    expiresAt: row.expires_at as Date,
    settledReceiptId: (row.settled_receipt_id as string | null) ?? null,
    settledAt: (row.settled_at as Date | null) ?? null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

function toEvidence(row: Row): BeneficiaryEvidence {
  return {
    learnerId: row.learner_id as string,
    accessId: row.access_id as string,
    policyCode: row.policy_code as BeneficiaryEvidence["policyCode"],
    relationshipType: row.relationship_type as BeneficiaryEvidence["relationshipType"],
    authorizedAt: row.authorized_at as Date,
  };
}

function toReceipt(row: Row): PaymentReceipt {
  return {
    id: row.id as string,
    attemptId: row.attempt_id as string,
    obligationId: row.obligation_id as string,
    provider: row.provider as string,
    mode: row.mode as PaymentReceipt["mode"],
    merchantContext: row.merchant_context as string,
    providerReference: row.provider_reference as string,
    amountMinor: row.amount_minor as number,
    currency: row.currency as string,
    verifiedAt: row.verified_at as Date,
    recordedAt: row.recorded_at as Date,
  };
}

function toException(row: Row): FinancialException {
  return {
    id: row.id as string,
    obligationId: row.obligation_id as string,
    attemptId: (row.attempt_id as string | null) ?? null,
    receiptId: (row.receipt_id as string | null) ?? null,
    kind: row.kind as FinancialExceptionKind,
    blocksFulfilment: row.blocks_fulfilment as boolean,
    dedupeKey: row.dedupe_key as string,
    status: row.status as FinancialException["status"],
    openedAt: row.opened_at as Date,
    openedBy: "system",
    resolutionCode: null,
    resolvedAt: null,
  };
}

function toObligationEvent(row: Row): ObligationEvent {
  return {
    id: row.id as string,
    obligationId: row.obligation_id as string,
    sequence: row.sequence as number,
    eventType: row.event_type as string,
    fromStatus: (row.from_status as ObligationStatus | null) ?? null,
    toStatus: (row.to_status as ObligationStatus | null) ?? null,
    actorType: row.actor_type as ObligationEvent["actorType"],
    actorPrincipalId: (row.actor_principal_id as string | null) ?? null,
    detail: row.detail as ObligationEventDetail,
    createdAt: row.created_at as Date,
  };
}

/*
 * Database errors -> payment errors. 0019 custom SQLSTATEs (see the hand-written
 * part of the migration); constraint names from services/database-schema.ts.
 */
export function ledgerError(error: unknown): PaymentError {
  if (error instanceof PaymentError) return error;
  const code = sqlState(error);
  const constraint = (error as { constraint?: string }).constraint ?? "";
  switch (code) {
    case "PF002":
      return new PaymentError("OBLIGATION_NOT_PAYABLE", "This obligation is no longer payable.");
    case "PF003":
      return new PaymentError("OBLIGATION_NEEDS_REVIEW", "A payment for this obligation needs review before another attempt.");
    case "PF004":
      return beneficiaryRefusal();
    case "PF005":
    case "PF006":
    case "PF010":
      return new PaymentError("INVALID_OBLIGATION", `The obligation failed a database integrity check (${code}).`);
    case "23503":
      if (constraint === "payment_attempts_obligation_fk") {
        return new PaymentError("OBLIGATION_MISMATCH", "The payment does not match its obligation (payer, amount, currency or mode).");
      }
      return persistenceError(error);
    case "23514":
      if (constraint === "payment_obligations_sandbox_only_check") return new PaymentError("SANDBOX_ONLY", "Step 3 payment obligations run in sandbox mode only.");
      if (constraint.startsWith("payment_obligations_")) return new PaymentError("INVALID_OBLIGATION", "The obligation failed a database check.");
      return persistenceError(error);
    case "23505":
      if (constraint === "payment_attempts_provider_reference_unique" || constraint === "payment_receipts_provider_charge_unique") {
        return new PaymentError("PERSISTENCE_ERROR", "This provider reference already belongs to another payment attempt.");
      }
      return persistenceError(error);
    default:
      /* PF001 is handled where it can occur (attempt insert); PF007-PF009 mean a broken invariant. */
      return persistenceError(error);
  }
}

export class PostgresPaymentLedger extends PostgresPaymentAttemptStore implements ObligationStore {
  private readonly merchantContext: string;

  constructor(pool: Pool, options: PostgresPaymentLedgerOptions) {
    super(pool, options?.transaction);
    if (!MERCHANT_CONTEXT_PATTERN.test(options?.merchantContext ?? "")) {
      throw new PaymentError("CONFIGURATION", "merchantContext must be 3-64 characters of a-z, 0-9, ':', '.', '_' or '-'.");
    }
    this.merchantContext = options.merchantContext;
  }

  /* ---------- obligations ---------- */

  async createObligation(input: NewObligation): Promise<CreateObligationResult> {
    const { obligation: o, evidence, learnerIds } = validateNewObligation(input);
    try {
      return await this.tx(async (client) => {
        const existing = await client.query(
          "SELECT * FROM payment_obligations WHERE payer_principal_id = $1 AND creation_key = $2",
          [o.payerPrincipalId, o.creationKey],
        );
        if (existing.rows[0]) return { created: false, existing: toObligation(existing.rows[0]) } as CreateObligationResult;
        assertSnapshotHash(o, learnerIds);

        await client.query(
          `INSERT INTO payment_obligations
             (id, payer_principal_id, creation_key, product_code, product_version, product_label, product_terms,
              amount_minor, currency, mode, beneficiary_count, snapshot_hash, status, expires_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, 'open', $13, $14, $14)`,
          [
            o.id, o.payerPrincipalId, o.creationKey, o.productCode, o.productVersion, o.productLabel, JSON.stringify(o.productTerms),
            o.amountMinor, o.currency, o.mode, o.beneficiaryCount, o.snapshotHash, o.expiresAt, o.createdAt,
          ],
        );
        /* Access rows FOR SHARE in id order (stable lock order); the 0019 insert trigger checks them again. */
        for (const item of [...evidence].sort((a, b) => (a.accessId < b.accessId ? -1 : a.accessId > b.accessId ? 1 : 0))) {
          const access = await client.query(
            `SELECT id, principal_id, learner_id, relationship_type, status FROM principal_learner_access WHERE id = $1 FOR SHARE`,
            [item.accessId],
          );
          const row = access.rows[0] as Row | undefined;
          const view = row
            ? { id: row.id as string, principalId: row.principal_id as string, learnerId: row.learner_id as string, relationshipType: row.relationship_type as string, status: row.status as string }
            : null;
          if (!evaluateGuardianV1(o.payerPrincipalId, item.learnerId, view).ok) throw beneficiaryRefusal();
          await client.query(
            `INSERT INTO payment_obligation_beneficiaries (obligation_id, learner_id, access_id, policy_code, relationship_type, authorized_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [o.id, item.learnerId, item.accessId, item.policyCode, item.relationshipType, item.authorizedAt],
          );
        }
        /* Seal: sealed_at NULL -> value once; the deferred 0019 seal check recomputes count + hash at COMMIT. */
        const sealed = await client.query("UPDATE payment_obligations SET sealed_at = $2 WHERE id = $1 RETURNING *", [o.id, o.createdAt]);
        await this.appendObligationEvent(client, o.id, "created", null, "open", o.createdAt, { productCode: o.productCode, amountMinor: o.amountMinor }, "payer", o.payerPrincipalId);
        return { created: true, obligation: toObligation(sealed.rows[0]) } as CreateObligationResult;
      });
    } catch (error) {
      const { code, constraint } = error as { code?: string; constraint?: string };
      if (code === "23505" && constraint === "payment_obligations_payer_creation_key_unique") {
        /* A concurrent request with the same creation key committed first. */
        const winner = await this.findObligationByCreationKey(o.payerPrincipalId, o.creationKey);
        if (winner) return { created: false, existing: winner };
      }
      throw ledgerError(error);
    }
  }

  async findObligation(id: string): Promise<PaymentObligation | null> {
    const result = await this.pool.query("SELECT * FROM payment_obligations WHERE id = $1", [id]);
    return result.rows[0] ? toObligation(result.rows[0]) : null;
  }

  async findObligationByCreationKey(payerPrincipalId: string, creationKey: string): Promise<PaymentObligation | null> {
    const result = await this.pool.query(
      "SELECT * FROM payment_obligations WHERE payer_principal_id = $1 AND creation_key = $2",
      [payerPrincipalId, creationKey],
    );
    return result.rows[0] ? toObligation(result.rows[0]) : null;
  }

  async listBeneficiaries(obligationId: string): Promise<BeneficiaryEvidence[]> {
    const result = await this.pool.query("SELECT * FROM payment_obligation_beneficiaries WHERE obligation_id = $1 ORDER BY learner_id", [obligationId]);
    return result.rows.map(toEvidence);
  }

  async listReceipts(obligationId: string): Promise<PaymentReceipt[]> {
    const result = await this.pool.query("SELECT * FROM payment_receipts WHERE obligation_id = $1 ORDER BY recorded_at, id", [obligationId]);
    return result.rows.map(toReceipt);
  }

  async listExceptions(obligationId: string): Promise<FinancialException[]> {
    const result = await this.pool.query("SELECT * FROM payment_exceptions WHERE obligation_id = $1 ORDER BY opened_at, id", [obligationId]);
    return result.rows.map(toException);
  }

  async listObligationEvents(obligationId: string): Promise<ObligationEvent[]> {
    const result = await this.pool.query("SELECT * FROM payment_obligation_events WHERE obligation_id = $1 ORDER BY sequence", [obligationId]);
    return result.rows.map(toObligationEvent);
  }

  async cancelObligation(obligationId: string, payerPrincipalId: string, at: Date): Promise<ObligationTransitionResult> {
    try {
      return await this.tx(async (client) => {
        const o = await this.lockObligation(client, obligationId);
        if (!o || o.payerPrincipalId !== payerPrincipalId) throw new PaymentError("OBLIGATION_NOT_FOUND", "Unknown payment obligation.");
        if (o.status !== "open") return { applied: false, obligation: o };
        if (await this.hasActiveAttempt(client, obligationId)) {
          throw new PaymentError("OBLIGATION_PAYMENT_IN_PROGRESS", "A payment for this obligation is in progress; it cannot be cancelled now.");
        }
        if ((await client.query("SELECT 1 FROM payment_receipts WHERE obligation_id = $1 LIMIT 1", [obligationId])).rows[0]) {
          throw new PaymentError("OBLIGATION_NOT_PAYABLE", "Money was received for this obligation; it needs review.");
        }
        const moved = await this.moveObligation(client, o, "cancelled", "cancelled", at, {}, {}, "payer", payerPrincipalId);
        return { applied: true, obligation: moved };
      });
    } catch (error) {
      throw ledgerError(error);
    }
  }

  /* SKIP LOCKED: an obligation busy in a checkout or verification is left for the next sweep. Due-ness uses the database clock (the 0019 guard does too). */
  async expireObligation(obligationId: string, at: Date): Promise<ObligationTransitionResult> {
    try {
      return await this.tx(async (client) => {
        const locked = await client.query(
          "SELECT *, now() >= expires_at AS due FROM payment_obligations WHERE id = $1 FOR UPDATE SKIP LOCKED",
          [obligationId],
        );
        const row = locked.rows[0] as Row | undefined;
        if (!row) {
          const current = await this.findObligationWith(client, obligationId);
          if (!current) throw new PaymentError("OBLIGATION_NOT_FOUND", "Unknown payment obligation.");
          return { applied: false, obligation: current };
        }
        const o = toObligation(row);
        if (o.status !== "open" || row.due !== true || (await this.hasActiveAttempt(client, obligationId))) {
          return { applied: false, obligation: o };
        }
        return { applied: true, obligation: await this.moveObligation(client, o, "expired", "expired", at, {}) };
      });
    } catch (error) {
      throw ledgerError(error);
    }
  }

  async listExpirable(at: Date, limit: number): Promise<PaymentObligation[]> {
    const result = await this.pool.query(
      "SELECT * FROM payment_obligations WHERE status = 'open' AND expires_at <= $1 ORDER BY expires_at, id LIMIT $2",
      [at, limit],
    );
    return result.rows.map(toObligation);
  }

  /* ---------- attempts bound to obligations ---------- */

  override async create(input: NewPaymentAttempt): Promise<CreateResult> {
    try {
      return await this.tx(async (client) => {
        const o = await this.lockObligation(client, input.obligationId);
        if (!o) throw new PaymentError("OBLIGATION_NOT_FOUND", "Unknown payment obligation.");
        if (
          o.payerPrincipalId !== input.payerPrincipalId ||
          o.amountMinor !== input.amountMinor ||
          o.currency !== input.currency ||
          o.mode !== input.mode
        ) {
          throw new PaymentError("OBLIGATION_MISMATCH", "The payment does not match its obligation (payer, amount, currency or mode).");
        }
        if (o.status === "settled") return { created: false, conflict: "obligation_succeeded" } as CreateResult;
        if (o.status === "review") throw new PaymentError("OBLIGATION_NEEDS_REVIEW", "A payment for this obligation needs review before another attempt.");
        if (o.status !== "open" || input.createdAt.getTime() >= o.expiresAt.getTime()) {
          throw new PaymentError("OBLIGATION_NOT_PAYABLE", "This obligation is no longer payable.");
        }
        /* Same precedence as the memory ledger: evidence, then the active-attempt conflict. */
        if (!(await this.evidenceStillValid(client, o))) throw beneficiaryRefusal();
        /* Under the obligation lock this read is authoritative: every attempt insert takes the same lock (store: FOR UPDATE, 0019 trigger: FOR SHARE). */
        if (await this.hasActiveAttempt(client, o.id)) return { created: false, conflict: "obligation_active" } as CreateResult;
        return this.insertAttempt(client, input);
      });
    } catch (error) {
      const conflict = createConflict(error);
      if (conflict) return conflict;
      if (sqlState(error) === "PF001") return { created: false, conflict: "obligation_succeeded" };
      throw ledgerError(error);
    }
  }

  override async transition(attemptId: string, request: TransitionRequest): Promise<TransitionResult> {
    try {
      return await this.tx(async (client) => {
        /* obligation_id is immutable (0018 guard), so reading it without a lock is safe. */
        const ref = await client.query("SELECT obligation_id FROM payment_attempts WHERE id = $1", [attemptId]);
        if (!ref.rows[0]) throw new PaymentError("PERSISTENCE_ERROR", "Unknown payment attempt.");
        const o = await this.lockObligation(client, ref.rows[0].obligation_id as string);
        if (!o) throw new PaymentError("PERSISTENCE_ERROR", "Attempt is not bound to an obligation.");
        const current = await this.lockAttempt(client, attemptId);
        if (!this.transitionAllowed(current, request)) return { applied: false, attempt: current } as TransitionResult;
        const updated = await this.applyAttemptTransition(client, current, request);
        if (updated.status === "succeeded" || updated.status === "needs_review") {
          await this.applyAttemptOutcome(client, o, current.status, updated, request.event.type, request.at);
        }
        return { applied: true, attempt: updated } as TransitionResult;
      });
    } catch (error) {
      throw ledgerError(error);
    }
  }

  async recordPostSuccessObservation(attemptId: string, observation: PostSuccessObservation, at: Date): Promise<void> {
    const kind = decidePostSuccessObservation(observation.observedStatus, observation.failures);
    try {
      await this.tx(async (client) => {
        const ref = await client.query("SELECT obligation_id FROM payment_attempts WHERE id = $1", [attemptId]);
        if (!ref.rows[0]) throw new PaymentError("PERSISTENCE_ERROR", "Unknown payment attempt.");
        const o = await this.lockObligation(client, ref.rows[0].obligation_id as string);
        if (!o) throw new PaymentError("PERSISTENCE_ERROR", "Attempt is not bound to an obligation.");
        const attempt = toAttempt((await client.query("SELECT * FROM payment_attempts WHERE id = $1", [attemptId])).rows[0]);
        if (attempt.status !== "succeeded") throw new PaymentError("PERSISTENCE_ERROR", "Post-success observations apply to succeeded attempts only.");
        if (!kind) return;
        const receipt = await client.query("SELECT id FROM payment_receipts WHERE attempt_id = $1", [attemptId]);
        await this.openException(client, o, kind, attemptId, (receipt.rows[0]?.id as string | undefined) ?? null, at);
      });
    } catch (error) {
      throw ledgerError(error);
    }
  }

  async listClosedUpdatedSince(since: Date, limit: number, page?: ClosedAttemptPage): Promise<PaymentAttemptRecord[]> {
    const after = page?.after ?? null;
    const result = await this.pool.query(
      `SELECT * FROM payment_attempts
        WHERE status IN ('failed', 'needs_review', 'succeeded') AND updated_at >= $1
          AND ($2::timestamptz IS NULL OR updated_at <= $2)
          AND ($3::timestamptz IS NULL OR (updated_at, id) > ($3, $4::text))
        ORDER BY updated_at, id LIMIT $5`,
      [since, page?.until ?? null, after?.updatedAt ?? null, after?.id ?? null, limit],
    );
    return result.rows.map(toAttempt);
  }

  /* ---------- internals (always on the caller's transaction) ---------- */

  private async lockObligation(client: PoolClient, obligationId: string): Promise<PaymentObligation | null> {
    const result = await client.query("SELECT * FROM payment_obligations WHERE id = $1 FOR UPDATE", [obligationId]);
    return result.rows[0] ? toObligation(result.rows[0]) : null;
  }

  private async findObligationWith(client: PoolClient, obligationId: string): Promise<PaymentObligation | null> {
    const result = await client.query("SELECT * FROM payment_obligations WHERE id = $1", [obligationId]);
    return result.rows[0] ? toObligation(result.rows[0]) : null;
  }

  private async hasActiveAttempt(client: PoolClient, obligationId: string): Promise<boolean> {
    const result = await client.query(`SELECT 1 FROM payment_attempts WHERE obligation_id = $1 AND status IN ${ACTIVE_SQL} LIMIT 1`, [obligationId]);
    return result.rows.length > 0;
  }

  /* Every beneficiary's access row, locked FOR SHARE in id order, still satisfies guardian_v1 for this payer. */
  private async evidenceStillValid(client: PoolClient, o: PaymentObligation): Promise<boolean> {
    const result = await client.query(
      `SELECT b.learner_id AS beneficiary_learner_id, a.id, a.principal_id, a.learner_id, a.relationship_type, a.status
         FROM payment_obligation_beneficiaries b
         JOIN principal_learner_access a ON a.id = b.access_id
        WHERE b.obligation_id = $1
        ORDER BY a.id
          FOR SHARE OF a`,
      [o.id],
    );
    if (result.rows.length !== o.beneficiaryCount) return false;
    return result.rows.every((row: Row) =>
      evaluateGuardianV1(o.payerPrincipalId, row.beneficiary_learner_id as string, {
        id: row.id as string,
        principalId: row.principal_id as string,
        learnerId: row.learner_id as string,
        relationshipType: row.relationship_type as string,
        status: row.status as string,
      }).ok,
    );
  }

  /* (1) receipt (records, decides nothing), (2) settlement decision, (3) its effects. Same order as the memory ledger. */
  private async applyAttemptOutcome(
    client: PoolClient,
    o: PaymentObligation,
    from: PaymentAttemptStatus,
    attempt: PaymentAttemptRecord,
    eventType: string,
    at: Date,
  ): Promise<void> {
    const receipt = await this.recordReceipt(client, attempt, at);
    const beneficiariesAuthorized = attempt.status === "succeeded" && o.status === "open" ? await this.evidenceStillValid(client, o) : true;
    const outcome = decideObligationOutcome({
      obligationStatus: o.status,
      attemptFrom: from,
      attemptTo: attempt.status,
      eventType,
      verificationFailures: attempt.verificationFailures ?? [],
      observedStatus: attempt.observedStatus,
      receipt: receipt ? { exact: receiptMatchesObligation(receipt, o), currencyMatches: receipt.currency === o.currency } : null,
      beneficiariesAuthorized,
    });
    let current = o;
    if (outcome.settle) {
      if (!receipt || !receiptMatchesObligation(receipt, o)) throw new PaymentError("PERSISTENCE_ERROR", "Settlement requires an exact receipt.");
      current = await this.moveObligation(client, o, "settled", "settled", at, { receiptId: receipt.id, attemptId: attempt.id }, { settledReceiptId: receipt.id, settledAt: at });
    } else if (outcome.obligationTo) {
      current = await this.moveObligation(client, o, outcome.obligationTo, "review_required", at, { attemptId: attempt.id, cause: eventType });
    }
    for (const kind of outcome.exceptions) {
      await this.openException(client, current, kind, attempt.id, receipt?.id ?? null, at);
    }
  }

  private async recordReceipt(client: PoolClient, attempt: PaymentAttemptRecord, at: Date): Promise<PaymentReceipt | null> {
    const candidate = receiptCandidate(attempt);
    if (!candidate) return null;
    const existing = await client.query("SELECT * FROM payment_receipts WHERE attempt_id = $1", [attempt.id]);
    if (existing.rows[0]) {
      const found = toReceipt(existing.rows[0]);
      if (found.providerReference !== candidate.providerReference) {
        throw new PaymentError("PERSISTENCE_ERROR", "A receipt for this attempt already exists with another provider reference.");
      }
      return found;
    }
    const inserted = await client.query(
      `INSERT INTO payment_receipts
         (id, attempt_id, obligation_id, provider, mode, merchant_context, provider_reference, amount_minor, currency, verified_at, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        randomUUID(), attempt.id, attempt.obligationId, attempt.provider, attempt.mode, this.merchantContext,
        candidate.providerReference, candidate.amountMinor, candidate.currency, attempt.confirmedAt ?? at, at,
      ],
    );
    return toReceipt(inserted.rows[0]);
  }

  private async moveObligation(
    client: PoolClient,
    o: PaymentObligation,
    to: ObligationStatus,
    eventType: string,
    at: Date,
    detail: ObligationEventDetail,
    patch: { settledReceiptId?: string; settledAt?: Date } = {},
    actorType: ObligationEvent["actorType"] = "system",
    actorPrincipalId: string | null = null,
  ): Promise<PaymentObligation> {
    /* Mirrors the 0019 obligation guard: allowed transitions only; operator-only ones are never performed by the system. */
    if (!canTransitionObligation(o.status, to) || isOperatorOnlyTransition(o.status, to)) {
      throw new PaymentError("PERSISTENCE_ERROR", `Obligation transition ${o.status} -> ${to} is not allowed.`);
    }
    const updated = await client.query(
      `UPDATE payment_obligations
          SET status = $2, updated_at = $3,
              settled_receipt_id = coalesce($4, settled_receipt_id), settled_at = coalesce($5::timestamptz, settled_at)
        WHERE id = $1 AND status = $6
        RETURNING *`,
      [o.id, to, at, patch.settledReceiptId ?? null, patch.settledAt ?? null, o.status],
    );
    if (!updated.rows[0]) throw new PaymentError("PERSISTENCE_ERROR", "Obligation changed under its row lock.");
    await this.appendObligationEvent(client, o.id, eventType, o.status, to, at, detail, actorType, actorPrincipalId);
    return toObligation(updated.rows[0]);
  }

  private async openException(
    client: PoolClient,
    o: PaymentObligation,
    kind: FinancialExceptionKind,
    attemptId: string,
    receiptId: string | null,
    at: Date,
  ): Promise<void> {
    const id = randomUUID();
    const inserted = await client.query(
      `INSERT INTO payment_exceptions (id, obligation_id, attempt_id, receipt_id, kind, blocks_fulfilment, dedupe_key, status, opened_at, opened_by)
       VALUES ($1, $2, $3, $4, $5, $6, $3, 'open', $7, 'system')
       ON CONFLICT ON CONSTRAINT payment_exceptions_dedupe_unique DO NOTHING
       RETURNING id`,
      [id, o.id, attemptId, receiptId, kind, EXCEPTION_BLOCKS_FULFILMENT[kind], at],
    );
    if (!inserted.rows[0]) return;
    /* No status change: from/to stay null, so the one-"settled"-event index is never touched. */
    await this.appendObligationEvent(client, o.id, "exception_opened", null, null, at, { kind, exceptionId: id, attemptId, receiptId });
  }

  /* Next sequence under the obligation row lock (or inside the creating transaction). */
  private async appendObligationEvent(
    client: PoolClient,
    obligationId: string,
    eventType: string,
    from: ObligationStatus | null,
    to: ObligationStatus | null,
    at: Date,
    detail: ObligationEventDetail,
    actorType: ObligationEvent["actorType"] = "system",
    actorPrincipalId: string | null = null,
  ): Promise<void> {
    await client.query(
      `INSERT INTO payment_obligation_events (id, obligation_id, sequence, event_type, from_status, to_status, actor_type, actor_principal_id, detail, created_at)
       SELECT $1, $2, coalesce(max(sequence), 0) + 1, $3, $4, $5, $6, $7, $8::jsonb, $9
         FROM payment_obligation_events WHERE obligation_id = $2`,
      [randomUUID(), obligationId, eventType, from, to, actorType, actorPrincipalId, JSON.stringify(detail), at],
    );
  }
}
