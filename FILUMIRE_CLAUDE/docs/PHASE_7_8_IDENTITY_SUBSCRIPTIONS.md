# Phase 7 + 8 — Identity, phone access and subscriptions

Date: 2026-10-11. Scope: local `FILUMIRE_CLAUDE` only; existing uncommitted Phases 1–6 preserved.

## Outcome and operating boundary

Implemented a local, memory-only prototype using mock SMS and signed mock payment events. Existing email/password login, family profiles, teacher links, sessions and learning APIs remain authoritative. No public website connection, deployment, Git operation, database query/migration, real SMS or payment was performed by this phase.

New features require `FILUMIRE_LOCAL_FAMILY_ACCESS=mock`, memory persistence and a non-production runtime. They also reject Vercel environments. The production build displays an unavailable notice for `/family-access`; its new APIs return 503. Existing registration/login continue normally. No environment files were changed. Do not enable the prototype on Preview or use real personal data.

## Existing architecture audit

| Existing implementation | Reuse and finding |
| --- | --- |
| `services/account/index.ts`, `store.ts`, `password.ts` | Guardian/teacher email registration, learner usernames, scrypt password hashes, consent records, credential lockout and guardian-only learner management. Reused existing credentials and principals; no second account database. Existing account kind is a single guardian/learner/teacher role, not a general multi-role system. |
| `services/identity/index.ts`, `services/auth-session/index.ts` | Existing JWT issuer/audience, HttpOnly SameSite=Strict cookies and revocable server sessions. Eight-hour idle / seven-day maximum lifetime preserved. New phone login issues these same sessions. |
| `services/principal/index.ts` | Guardian, self and teacher learner-access links. Reused; a plan or school fixture cannot create learner permissions. |
| `services/account/rate-limit.ts`, `apps/learner/app/api/account/http.ts` | Existing account request limiting, JSON-only requests, safe cookies and no-store responses. Existing PostgreSQL limiter remains unchanged. |
| `services/persistence-provider.ts`, memory/PostgreSQL adapters | Existing provider selection and transactional evidence infrastructure preserved. New records have no PostgreSQL adapter; mocks fail closed rather than using ephemeral billing/phone state with PostgreSQL. |
| `services/database-schema.ts` | Existing payment attempts, attempt events, obligations, beneficiary authorisation evidence, receipts, exceptions and obligation events. Includes payer/amount/currency binding, immutable success constraints and sandbox-only obligations. No executable payment service/adapter was found in this application. Referenced handoff documents and migrations 0018/0019 are not present in the inspected application paths; their deployed status is not established here. Preserve these declarations and reuse their contracts for future durable billing, rather than creating a competing payment ledger. |
| Existing Phases 1–6 | Learning continuity, assessment authority, mastery, adaptive interventions, bilingual content, mock FILU, summaries and browser speech remain unchanged. |

## Phone and account workflows

- Ghana local `0200000001`, international `+233200000001`, spaced/hyphenated and `00233` formats normalise to one E.164 identifier. Syntax validation accepts nine national digits beginning 2 or 5; it does **not** certify allocation, carrier, ownership or a person's age. No carrier inference is made. A real provider/allocation policy needs review before production.
- Mock SMS accepts four explicit fictional fixture numbers only (`FICTIONAL_PHONES`). These are development identifiers, not a claim that the numbers are globally reserved. The provider has no transport or external calls.
- Phone-only registration creates a guardian using the existing principal/account/consent store. It does not fabricate an email or merge identities based on display names. An unknowable randomly generated password is hashed into the existing credential model; OTP is the initial access method. Recovery can establish a password.
- Linking an existing email account requires its authenticated guardian session, current password and a phone OTP bound to that exact principal/session. Email credentials, learners and progress are preserved. An occupied phone cannot be transferred or silently merged. This prototype supports one verified phone per guardian.
- Phone login requires a previously verified binding and active guardian credentials. Teacher and learner phone linking/billing are rejected. Teachers retain existing email login and learner permissions.
- Recovery only resets a guardian credential for a previously verified binding. It revokes all old guardian sessions before updating the password and clears credential lockout state; the browser must sign in again. It cannot reset a child or unrelated family's account.
- Concurrent phone and principal reservations prevent duplicate registration and two simultaneous phone aliases being attached to one adult. These in-process guards are not a substitute for database uniqueness and transactions.
- Authentication changes clear existing device learner profile, lesson-closure/conversation context and speech through `clearLearnerProfileFromDevice`. No phone or OTP is stored in browser storage.

### OTP security

Cryptographically random six-digit codes; HMAC digests bound to challenge, purpose, phone and actor; five-minute expiry; five attempts per challenge; atomic single consumption before asynchronous account changes; resend cooldown of 60 seconds. Resending invalidates the prior challenge. Phone-wide request limits apply across purposes, browsers and addresses (five/hour); address budgets are 20 challenges/hour and 30 verifications/minute, with existing HTTP request limiting layered on top. Expired entries are cleaned and memory maps are bounded.

Challenge creation performs no account-existence lookup. Failed authentication returns generic codes, never provider diagnostics or credentials. New routes require JSON, reject unknown authority fields, validate Origin when present and return no-store responses. Existing JSON handling limits bodies to 16 KiB after reading them; production deployment still needs a reviewed ingress/streaming size limit. No new CORS permissions were added.

The mock outbox is bounded, in-process and accessible only to the server test harness (`takeCode`); OTPs are never returned by the API or logged. The local form requires the test-harness code, so it is not an independently usable SMS experience. Phone security audit events contain only principal, action and timestamp (bounded to 1,000). No phone/code/password is included.

## Trial and entitlement model

Server-owned states: FREE, TRIAL_PLUS, ACTIVE_PLUS, ACTIVE_FAMILY and SCHOOL_LICENSE. Client flags cannot grant access, eligibility or school membership.

**Provisional local eligibility:** a newly registered guardian plus a verified phone. Email registration records eligibility, but an unverified email alone starts no trial. Linking its first verified phone activates the trial. Existing families cannot claim a new trial merely by linking a phone. Exact fourteen-day periods and phone-identity claims prevent restarting a trial for the same principal/verified identity within this local process. Cross-restart, phone recycling and determined multi-number abuse are not solved by memory storage; durable claims and an approved eligibility/recovery policy are required.

Adult API/UI includes start/expiry dates, a notice during the final three days, an expiry notice and Free access afterwards. No card details, automatic payments or notification delivery services are used. Notices are shown when the adult refreshes account access; no scheduled SMS/email notifications are claimed.

Existing learning remains unrestricted at every state. No new quotas, arbitrary seat limits or paid feature gates were introduced. The existing ten-learner guardian limit is unchanged. Plan differences and final feature/usage limits require approval. Viewing status, cancellation, expiry and payment events do not touch learning state or interrupt the current activity. Future feature enforcement must preserve an activity already underway.

`getLearnerEntitlement` requires existing learner authorisation and an active guardian-owner link, or an explicitly provisioned school fixture covering that learner. It returns status only with the enforcement marker, not adult trial/billing dates. Family plans grant no cross-family access. A school fixture must explicitly include the learner in its licensed cohort; an ordinary teacher link alone is insufficient. Fixtures grant no teacher links or real institution membership; they are server-test-only and have no enrolment API.

## Mock billing architecture

`PaymentProvider` verifies events server-side. The signed mock fixtures match checkout ID, payer, amount and currency to the trusted purchase. Browser checkout responses cannot activate access. Request idempotency is principal-bound; conflicting retries fail. Event IDs are deduplicated, conflicting replay/tampered signatures fail, and terminal transitions are checked.

Positive test fixtures cover monthly Plus and annual Family configuration, paid-through renewal/cancellation, failed confirmation, refunds and Free downgrade. An old refund cannot remove a different valid purchase. The checkout aggregate is not an accounting ledger: production must retain existing immutable payment attempts and receipts, recording refunds/reversals as separate financial events/exceptions.

The application has **no default prices**, payment processor, billable call or purchasable plan. Tests inject obviously fictional minor-unit prices. The UI explains that approved choices are pending. Renewals require a new explicitly authorised checkout; cancellation preserves paid-through access. Grace periods, automatic renewal mandates, partial refunds, pending/unknown provider outcomes and reconciliation remain provider/policy dependencies; none are silently assumed.

Ghana Mobile Money and cards can be separate approved provider adapters under the same server verification contract. Do not store card data, OTPs, payment credentials or unnecessary payer contact information. No provider has been selected or activated.

## Future website integration contracts — preparation only

| Concern | Contract |
| --- | --- |
| Entry points | Existing `/register`, `/login`, `/family`, `/adult`, `/teacher` remain application journeys. No public website was edited. Phone prototype POST `/api/account/phone` supports start/verify and register/login/link/recover. |
| Identity | Reuse existing `principalId` and guardian/self/teacher access links; the website must not create another account database or accept browser-supplied identity/mastery/permissions. Multi-role adult accounts require a separately approved role design. |
| Adult entitlement reads | GET `/api/account/subscription` resolves the existing server session and requires an active guardian; returns snapshot, configured choices and that principal's local billing history. |
| Billing commands | POST `/api/account/subscription` accepts cancel or an explicitly authorised checkout. No browser verification/event-signing endpoint exists. |
| Trial eligibility | Registration records eligibility server-side; only trusted verified ownership can start it. No public `eligible=true` or arbitrary trial-start endpoint. |
| Return journeys | `safeAccountReturnPath` permits known application paths, carries EN/FR preference and strips arbitrary token/redirect parameters. Absolute URLs, protocol-relative paths, backslashes, controls and unknown paths are rejected. Prepared helper only; existing login redirects were not rewritten. |
| Cross-domain handoff | Not implemented. A later approved identity broker/OIDC authorisation-code flow must use PKCE, state/nonce, exact callback allowlists, short-lived one-time codes and server exchange. Do not put sessions in URLs, browser storage or broad domain cookies. Existing learner JWT audience/issuer remain unchanged. |
| Sign-out | Existing session revocation is the authority. A future broker must explicitly define platform-wide logout/revocation; current local logout is not cross-domain SSO logout. |

## Validation

All commands use fictional fixtures and memory persistence. Existing configuration files were not changed.

| Runner/check | Result |
| --- | --- |
| `node scripts/test-section7.mjs` | PASS — existing 20 suites |
| `node scripts/test-learning-continuity.mjs` | PASS — 6 suites |
| `node scripts/test-learning-presentation.mjs` | PASS — 8 suites |
| `node scripts/test-tutoring-conversation.mjs` | PASS — 6 suites |
| `node scripts/test-lesson-closure.mjs` | PASS — 8 suites |
| `node scripts/test-african-voice.mjs` | PASS — 3 suites |
| `node scripts/test-learner-interface.mjs` | PASS — 3 suites |
| `node scripts/test-family-access.mjs` | PASS — 4 suites |
| Instructional journeys (included above) | PASS — 36 journeys, 4,418 checks |
| `npx tsc --noEmit --project apps/learner/tsconfig.json` | PASS |
| `$env:FILUMIRE_PERSISTENCE='memory'; npm run build:learner` | PASS — Next.js production build, new prototype/API production guards enabled |

58 suite executions across the runners, with some existing journey suites reused by more than one runner. Initial new-test failures were fixture issues (Node environment-property descriptors and wrong assessment field names); corrected without changing learning logic. No outstanding test failures.

New tests cover syntax, expiry, cooldown, purpose/session binding, attempt/IP/phone limits, provider failures, concurrent/replayed submissions, takeover/alias protection, adult/child/teacher isolation, email regression, server trial eligibility, exact expiry, unchanged profiles/mastery/evidence, trusted payments, cancellation/refund/downgrade, school boundaries and safe redirects. SSR/accessibility labels and bilingual copy contracts are covered; French live interaction, scrolling/keyboard behaviour and real browser/device journeys are **not** validated. No connected browser or installed browser automation was available in the preceding local interface work. No real SMS, payment or PostgreSQL integration success is claimed.

## Files changed in this phase

Modified: `apps/learner/app/api/account/register/route.ts` — guarded local-only eligibility hook.

Created:

- `services/family-access/{phone,otp,index,subscriptions,integration}.ts`
- `apps/learner/app/api/account/phone/route.ts`
- `apps/learner/app/api/account/subscription/route.ts`
- `apps/learner/app/family-access/page.tsx`
- `apps/learner/components/filumire/FamilyAccessPrototype.tsx`
- `tests/family-phone-otp.test.ts`, `family-subscriptions.test.ts`, `family-access-api.test.ts`, `family-access-render.test.ts`
- `scripts/test-family-access.mjs`
- This report.

## Concrete approval boundary: durable storage and policy

No migration file was created or executed. Before extending these workflows to PostgreSQL/Preview, approve this **design proposal**, then separately review any resulting SQL before execution:

1. Verified phone identities referencing existing guardian principals: unique keyed lookup digest, encrypted E.164 delivery value, verified-at/status fields, unique active guardian binding, revocation history and no automatic identity transfer. No new account database.
2. Short-lived OTP challenges: keyed digests, purpose/actor binding, expiry/attempt/resend/consumed fields and atomic consume. Reuse `auth_rate_limits` for distributed budgets. Dedicated server secrets/key rotation and an approved expiry/cleanup policy; no plaintext OTP storage or logs.
3. Durable new-family eligibility and one-time trial claims: principal/verified-identity uniqueness, trusted registration provenance, start/expiry timestamps and policy version. Initial proposal retains a minimal keyed claim to prevent repeat trials; retention/deletion/number-recycling and rights requests need privacy approval before implementation.
4. Family subscriptions and versioned plan configuration referencing existing principals and verified payment obligations/receipts. Reuse existing sandbox financial records and immutable event constraints, not a new financial ledger. Entitlement updates must be atomic/idempotent with verified settlement and must never delete learner state.
5. Approved institution membership/licensing roles and expiry rules; a teacher role alone must not confer institutional billing authority or unrelated learner access.

Separately required: approved Free/Plus/Family/School feature and seat policies, prices/intervals/grace/refund/renewal rules, eligibility and SIM-swap/recycled-number recovery safeguards, adult consent/privacy/retention review, SMS/payment provider selection and credentials, real-device/browser validation, and a separately authorised website handoff/deployment phase. These are genuine production dependencies, not reasons to replace existing FILUMIRE learning functionality.

The local mock phase is complete. Preview phone login, durable subscriptions and public website integration are not ready and remain disabled pending those approvals.
