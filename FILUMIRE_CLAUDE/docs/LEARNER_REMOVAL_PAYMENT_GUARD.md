# Learner removal: pending-payment guard (design only, not implemented)

Status 27 October 2026: requirement for the payments activation tranche. Nothing in payments, migrations or configuration
is changed by this note. Payments are not live: obligations (migration 0019) are not applied and no app route calls the
payment services, so there is no risk today.

Adapted from the 22 October design on `claude/learner-removal` (preserved on `safeguard/2026-10-27/learner-removal`).
That worktree's own removal route was not integrated. This note now targets the guardian removal that release already has.

## Problem
A guardian can remove a learner (`DELETE /api/account/learners/[learnerId]` → `removeLearnerForGuardian` →
`accountStore.removeLearnerAccount`) while a payment naming that learner as beneficiary is in progress. Removal revokes
every access row for the learner, including the guardian's. Beneficiary evidence references that guardian access row.
- **Today's backstop:** settlement re-checks the beneficiary access rows. A successful charge after revocation settles
  with exception `beneficiary_authorization_revoked` (`packages/payments/obligation.ts`, `decideObligationOutcome`).
- **Why a guard is still needed:** that outcome is a manual-review case (money taken, access gone). The guard prevents
  it from arising.

## Scope
- Only guardian removal of a learner is checked.
- **A teacher leaving a learner** (`DELETE /api/account/teacher-links/[learnerId]` → `leaveLearnerAsTeacher`) never
  consults the guard. Teacher links can never be beneficiary evidence
  (`payment_obligation_beneficiaries_relationship_check: relationship_type = 'guardian'`).
- Likewise, a guardian removing a teacher (`removeTeacherFromLearner`) is out of scope.

## "Pending" definition
Read-only, using existing tables. Block when an obligation has a beneficiary row whose `access_id` is the removing
guardian's access row, and either:
1. `obligation.status = 'open'` and it has an attempt in `ACTIVE_STATUSES` (`'created'`, `'pending'`, `'unknown'`); or
2. `obligation.status = 'review'` (a human decision is needed first).

Allowed: `'open'` with no active attempt (no money moving; a later checkout is refused because the evidence is revoked),
and `'settled'`, `'cancelled'` or `'expired'`.

## Shape
1. **Seam.** `removeLearnerForGuardian(..., guard?: LearnerRemovalGuard)`, with
   `LearnerRemovalGuard.check(accessId) -> { allowed: true } | { allowed: false, reason: "payment_pending" }`.
   - The default guard allows (payments inactive).
   - `services/account` does not import payments.
2. **Owner of the real guard.** The payments tranche provides `PaymentLearnerRemovalGuard` in `services/payments`,
   wired in only when obligations are enabled.
3. **Route responses.**
   - Blocked: 409 `{ code: "PAYMENT_PENDING", error: "A payment for this learner is still being processed. You can
     remove them once it has finished." }`.
   - Guard error: 503. Nothing is revoked (fail closed).
4. **UI.** The Family page removal dialog shows the 409 message.

## Race closure (PostgreSQL)
`PostgresAccountStore.removeLearnerAccount` already runs in one transaction. It holds an advisory lock for the learner
and selects the guardian's access row `FOR UPDATE`. Run the pending check inside that transaction, after the row lock and
before the revocation updates, using plain reads and no obligation locks.
- **Attempt created first:** ledger attempt creation takes the access row `FOR SHARE`, so a later removal sees the
  attempt and is blocked.
- **Removal first:** an attempt that starts while the removal is running waits for it, then sees `'revoked'` and is
  refused (existing behaviour).
- **Lock order:** the removal takes no obligation locks, so the ledger's lock-order claim still holds. The comment in
  `postgres-ledger.ts` needs a one-line update, with sign-off from the payments owner.
- **In-memory store:** check and revoke with no `await` between them.
- **Backstop:** `beneficiary_authorization_revoked` remains for anything that slips through.

## Tests to add with activation
- open with a pending attempt → 409, and the learner keeps all access;
- review → 409;
- open without an attempt → removed;
- settled → removed;
- teacher leave and guardian-removes-teacher never consult the guard;
- guard throws → 503, nothing revoked;
- PostgreSQL interleaving of removal and attempt creation, in both orders: exactly one wins, and no
  `beneficiary_authorization_revoked` exception is created.

## Decisions needed (at payments activation)
- Approve the definition (block `'review'` too?).
- Approve the 409 wording.
- Payments owner: approve the lock-order comment change and own `PaymentLearnerRemovalGuard`.
