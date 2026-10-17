# Local development status — 17 October 2026

Checkout: `FILUMIRE_CLAUDE`, branch `dev/local-filumire-dev-db`. This is a source
and offline-test review, not a new hosted-system or database audit. Existing
uncommitted work and H1/H2 safeguards are preserved. No further Claude audit was
requested.

## Completed and evidence boundaries

- Built-in guardian/learner/teacher identity, learner access and persistent
  learning journeys are implemented. Historical A6 and local development evidence
  record successful journeys; see `NEON_INTEGRATION_TEST_A6_EVIDENCE.md` and
  `LOCAL_FILUMIRE_DEV_EVIDENCE.md`. Those runs predate migration 0023 and do not
  establish compatibility of today's targets.
- Guardian grade attribution/locking and navigation corrections are present.
  H1's foundation-test correction matches six reviewed manifest entries. H2 adds
  the build compatibility gate and cached, fail-closed runtime schema checks;
  see `GRADE_LOCK_RELEASE_SAFETY.md`. Passing offline checks is not release approval.
- The integration assessment's missing `/api/session/issue` rate limit is now
  addressed locally. Requests consume the existing limiter before external-token
  verification, principal resolution or session creation. The address budget is
  30 attempts per fifteen minutes, matching password login but with its own scope.
  Unverified token claims never select limiter keys. All responses use `no-store`.
  The existing token verification, authorisation and secure-cookie contracts remain.

## Work still unfinished

1. Verify migration 0023 and the actual build gate on each intended target after
   explicit approval. No current target database or remote build configuration was
   inspected. Existing migration/recovery/security approvals remain required.
2. The current grade-setup/navigation matrix now passes in isolated headless
   Chromium: EN/FR at 320/390/768/1280px, including guardian locks, learner choices,
   sign-in/out, refresh, redirects and parent/teacher views. Five local UI/redirect
   findings were corrected; see `GRADE_SETUP_NAVIGATION_BROWSER_REPORT.md`.
   Physical-device, virtual-keyboard and other-browser validation remains open.
3. The historical first-radio accessible-name issue did not reproduce in the
   current diagnostic's Chromium accessibility tree. No guessed label fix was
   made. Actual assistive-device/voice validation remains incomplete.
4. Email verification/recovery, website identity handoff, verified billing-account
   mapping, durable phone/OTP and durable subscriptions/entitlements remain
   unfinished or disabled prototypes. They depend on approved identity, ownership,
   consent, provider, storage and entitlement designs. See
   `WEBSITE_LEARNER_INTEGRATION_ASSESSMENT.md` and
   `PHASE_7_8_IDENTITY_SUBSCRIPTIONS.md`. No external identity provider, billing,
   SMS or learning paywall was enabled by this task.

## Why the authentication task came next

The assessment explicitly identifies the missing session-issuance rate limit, and
the route still lacked it at review. Unlike the release/database and durable
identity/billing work, this gap could be closed with existing local infrastructure
and no new schema, provider or policy integration. It limits invalid-token work
and authenticated issuance alike. Limiter errors refuse issuance rather than
silently allowing requests.

The shared limiter stores hashed address keys and uses the existing PostgreSQL
atomic backend when configured. This task tests it in memory only. Hosted proxy
header trust and distributed PostgreSQL behavior were not reverified. Multiple
users behind one address share the budget; operational tuning remains a future
deployment concern.

## Local validation and next task

`tests/session-issue-rate-limit.test.ts` runs through `test:identity` and therefore
`npm test`. It forces memory persistence, uses locally generated signing keys,
and stubs database query/connection methods to reject unexpected access. Its six
scenarios cover valid session/cookie contracts, invalid/unlinked identities,
thresholds and address/scope isolation, window expiry, concurrent issuance,
missing-address fallback, storage failure/recovery, and absence of principal or
session writes on throttled requests.

Results for this change: full `npm test` passed with memory persistence and a
fictional database URL, including the new six scenarios, 46 foundation checks,
18 deployment-gate checks and runtime/guardian grade-lock regressions. The existing
identity suite skipped its one PostgreSQL-only direct-table assertion. Root
TypeScript (`--noEmit --incremental false`), six-entry migration-manifest
verification and `git diff --check` passed. No live database, migration, commit,
push or deployment was performed.

The next validation step is the remaining real-device/keyboard/assistive and
cross-browser work in items 2–3, without installing dependencies unless approved.
The local Chromium report does not establish hosted compatibility. Keep migration
execution, live verification and deployment separately approval-gated; no commit
or release is authorised by this status document.
