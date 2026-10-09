/*
 * Payment attempt lifecycle (Payments Phase 2, step 2). The same rules are
 * enforced by the payment_attempts_guard trigger (drizzle/0018).
 *
 *   created ----> pending ----> succeeded (immutable)
 *      |   \         |  \-----> failed ----> needs_review (late success only)
 *      |    \        \--------> needs_review
 *      \--> unknown --> pending | succeeded | failed | needs_review
 *
 * - created: recorded before the provider is called (or no answer yet).
 * - pending: the provider accepted the request. NOT proof of payment.
 * - unknown: the outcome is uncertain (timeout, network error, unusable answer).
 *   Never treated as failed; blocks new attempts for the obligation until reconciled.
 * - succeeded: verified exact match. Never changes; refunds/reversals will be
 *   separate records (step 6).
 * - failed: the provider confirmed failure/abandonment, or authoritatively has
 *   no record after the settle window.
 * - needs_review: money may have moved but something does not match (amount,
 *   currency, reference, reversal, record lost, success after failure). Manual.
 */
export const PAYMENT_ATTEMPT_STATUSES = ["created", "pending", "unknown", "succeeded", "failed", "needs_review"] as const;

export type PaymentAttemptStatus = (typeof PAYMENT_ATTEMPT_STATUSES)[number];

/* Statuses that hold the obligation (a new attempt for it would risk a double charge). */
export const ACTIVE_STATUSES: readonly PaymentAttemptStatus[] = ["created", "pending", "unknown"];

const TRANSITIONS: Record<PaymentAttemptStatus, readonly PaymentAttemptStatus[]> = {
  created: ["pending", "unknown", "succeeded", "failed", "needs_review"],
  pending: ["succeeded", "failed", "needs_review"],
  unknown: ["pending", "succeeded", "failed", "needs_review"],
  failed: ["needs_review"],
  needs_review: [],
  succeeded: [],
};

export function isActiveStatus(status: PaymentAttemptStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/* A same-status update (e.g. recording a verification) is allowed except for succeeded. */
export function canTransition(from: PaymentAttemptStatus, to: PaymentAttemptStatus): boolean {
  if (from === "succeeded") return false;
  return from === to || TRANSITIONS[from].includes(to);
}
