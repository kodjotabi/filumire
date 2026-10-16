# Website-to-learner integration — read-only assessment

- **Date:** 15 October 2026. Follows A5 (commit `42804443`).
- **Scope:** source in `filumire-batch1/FILUMIRE_CLAUDE` at `integration/phase1-foundation`, plus the committed integration-six and Phase 7–8 reports.
- **Not inspected directly:** the website source (`Desktop/filumire/FILUMIRE_WEBSITE`), because it is outside the isolated workspace. Website statements below come from `INTEGRATION_SIX_FINAL_REPORT.md` and `INTEGRATION_SIX_RELEASE.md`.
- **No changes:** no database query, application code change or deployment was made for this assessment.

## Summary

The learner app has a complete **email/password identity, family and learner-access model** with PostgreSQL adapters. The A5 grants cover every table this model writes.

The **website is connected only by navigation links**. There is no identity handoff, no shared account and no mapping from website billing accounts to learner-app guardians.

**Subscriptions and entitlements are not durable.** They exist only as a memory-only local mock, and today learning is unrestricted for everyone signed in.

The smallest useful next step is to run the learner app's own guardian→learner journey against `integration-test` as `filumire_app`. The website and payments stay out of it.

## 1. Account registration

| Area | Status | Where |
|---|---|---|
| Guardian email registration (declaration, notice consent, scrypt hash, session issued) | Implemented, Postgres transactional | `api/account/register`, `services/account/index.ts` `registerGuardian`, `store.ts` `createGuardianAccount` |
| Teacher registration | Implemented | same route, `accountType: "teacher"` |
| Production gate | Implemented: production accepts sign-ups only with `FILUMIRE_ACCOUNT_REGISTRATION=open` | `isRegistrationOpen()` |
| Rate limiting | Implemented, Postgres-backed (`auth_rate_limits`) | `services/account/rate-limit.ts` |
| Consent record | Implemented but provisional: notice version `filumire-test-notice-2026-10-draft`, method `self_declared_checkbox`, status `unverified` | `services/account/index.ts` |
| Email verification / recovery | **Missing** (reports: "external email recovery pending") | — |
| Phone registration / OTP login / recovery | **Mock only**: memory maps, mock SMS, requires `FILUMIRE_LOCAL_FAMILY_ACCESS=mock`, refuses production/Vercel; **no DB tables** | `services/family-access/*`, `api/account/phone` |

## 2. Identity mapping

There are two identity entry points, and nothing links them:

1. **Built-in accounts.** The `account_credentials.login_identifier` (email or learner username) belongs to a `principals` row. Sessions are HS256 JWTs (`FILUMIRE_AUTH_JWT_SECRET`) with a revocable `auth_sessions` row, cookies are HttpOnly and `SameSite=Strict`, sessions expire after 8 h idle or 7 days at most.
2. **External IdP.** `POST /api/session/issue` takes an RS256 bearer token checked against `FILUMIRE_EXTERNAL_AUTH_JWKS/ISSUER/AUDIENCE`. It calls `resolveOrCreatePrincipalForExternalIdentity`, which writes `principals` + `external_identities`, races safely and deletes the losing principal.

Gaps:

- An external principal is created with **no learners and no way to link** to an existing guardian account. `/session/issue` therefore returns 403 ("No authorised learner") for any new external identity. It is a dormant path, and nothing in the website reports shows that the website issues these tokens.
- `/api/session/issue` has **no rate limit**, unlike the account routes. It is low risk while the env vars are unset (the route returns 500/401), but it matters before it is enabled.
- **Website billing accounts are a separate store.** Per the reports it is SQLite, which cannot run on Vercel, with simulated email/Paystack. The release review requires mapping a guardian to a billing identity through *verified ownership/consent, not email equality*. **No mapping exists.**
- **No cross-domain handoff.** A future approved OIDC/broker flow is documented (PKCE, state/nonce, exact callbacks, server exchange), but none is implemented. `safeAccountReturnPath` covers same-origin return paths only.

## 3. Learner access

| Area | Status |
|---|---|
| Guardian adds a learner (max 10): creates principal, learner, `self` + `guardian` links, learner credential, profile and consent in one transaction | Implemented (`addLearnerForGuardian`, `store.ts:575-605`) |
| Learner sign-in, and guardian selects a learner (learner-bound session); every request re-checks `isPrincipalAuthorizedForLearner` | Implemented (`session/login`, `session/select-learner`, `identity.resolveSignedInSession`) |
| Teacher access through a hashed one-time link code; guardian can revoke | Implemented (`teacher_link_codes`, `principal_learner_access` status updates) |
| Sign out / sign out other devices / password reset revokes sessions | Implemented |
| Runtime as least-privilege role | **Ready from A5 grants.** Every Postgres write in `services/` (including upserts on `principal_learner_access`, `learner_states`, `learner_learning_context`, the `principals` race DELETE and the rate-limit DELETE) matches the granted privileges. The app uses one `DATABASE_URL` pool (`services/database.ts`, max 10), but the role's connection limit is 20. |
| Proven on PostgreSQL | Only against **localhost `filumire_test`** (`scripts/test-private-preview-postgres.mjs`, 7 suites, hard-refuses other hosts). **Never run against Neon or as `filumire_app`.** |

## 4. Subscriptions and entitlements

| Area | Status |
|---|---|
| Entitlement states FREE / TRIAL_PLUS / ACTIVE_PLUS / ACTIVE_FAMILY / SCHOOL_LICENSE, 14-day trial, signed mock payment events, cancel/refund/downgrade | **Memory-only mock** (`services/family-access/subscriptions.ts`). Lost on restart. Local flag only. |
| `GET/POST /api/account/subscription` | Returns 503 outside local mock mode |
| `GET /api/account/access` | Returns `billing.operational: false`, `entitlementBridge: "not_configured"`, `learningAccessPolicy: "existing_authorisation"` |
| Feature gating | **None.** Learning is unrestricted for any authorised learner. This is intentional: no unapproved paywall. |
| Durable subscription/entitlement/trial-claim tables | **Missing.** No migration exists. The design proposal is in `PHASE_7_8_IDENTITY_SUBSCRIPTIONS.md` § "Concrete approval boundary". |
| `payment_*` tables (attempts, obligations, receipts, exceptions) | Schema only. No runtime code uses them, and A5 deliberately gives `filumire_app` **no access**. |
| Website Paystack flow | Website side only, SQLite and simulated. The reports say it grants no learner access. |
| Prices, plans, provider, policy | **Not decided.** No default prices exist. |

## 5. Summary: what to build vs what is in place

**In place (learner app):** registration, consent capture, sessions and revocation, family/learner/teacher access, rate limiting, PostgreSQL adapters, least-privilege grants on Neon.

**Missing:**

1. Learner-app flows proven on Neon as `filumire_app`.
2. Email verification and recovery.
3. Website-to-learner identity handoff (OIDC/broker).
4. Mapping from website billing account to guardian.
5. Durable entitlement and subscription storage, plus the policy behind it.
6. An entitlement bridge from verified payments.
7. Durable phone/OTP.
8. A rate limit on `/session/issue`.
9. Approved consent notice and verification.

## 6. Recommended smallest safe end-to-end test

**The learner app's own guardian→learner journey on `integration-test`, running in-process as `filumire_app`.** There is no website, no deployment, no payments and no external IdP.

Steps (fictional data, unique run prefix, e.g. `a6-<timestamp>`):

1. Pre-flight, read-only as owner: same checks as A5 (endpoint, branch, schema hash `20f33302…`, ledger 5/5, grants unchanged), plus row counts for all 29 tables.
2. Run the existing route handlers in-process with `FILUMIRE_PERSISTENCE=postgres`, `DATABASE_URL` = the **app** URL, and a test-only JWT secret:
   - guardian registers by email
   - guardian adds one learner
   - learner signs in
   - one learning-overview read
   - guardian selects the learner
   - `/api/account/access` reports `entitlementBridge: "not_configured"`
   - `/api/account/subscription` returns 503
   - sign out, then the old session is rejected
3. Negative checks: a second guardian cannot see or reset the first learner, and a learner cannot reach adult endpoints.
4. Post-check as owner (read-only):
   - Only the expected tables gained rows: `principals`, `account_credentials`, `account_profiles`, `guardian_consent_records`, `learners`, `learner_profiles`, `principal_learner_access`, `auth_sessions`, `auth_rate_limits`, and any learning rows the overview creates.
   - Payment tables and the migration ledger are unchanged.
   - The schema hash is unchanged and the A5 grants are still 191/191.
5. Record evidence without credentials or fictional passwords.

The quickest way to do this is the existing `tests/account-registration-journey.test.ts` (439 lines; it already covers steps 2–3). It needs a **new guarded runner**, because `test-private-preview-postgres.mjs` refuses every host except localhost. The runner would allow only `ep-rough-water-b8fcf7pe`, require the user to be `filumire_app`, and refuse the denied endpoints.

**Needs your approval before running:**

- **It writes data.** It will create persistent fictional rows on `integration-test`. This is the first application data on the branch, and nothing cleans it up afterwards: `filumire_app` has no DELETE on most tables, by design. The existing `resetRateLimits()` also clears all of `auth_rate_limits`.
- **It needs one new script** (the guarded runner) in `scripts/`. No application code changes.

Defer website handoff, billing mapping, entitlements and phone access until their designs are approved. They have nothing durable to test yet.
