# FILUMIRE subscriptions — local test-mode implementation

Date: 11 October 2026. Source: C:\Users\tabi\Desktop\filumire\FILUMIRE_WEBSITE.

This is a local implementation, not a deployment or completed external payment integration. No production settings, DNS, separate learner application, FILUMIRE_CORE, external database or live payment account were changed. No real payment, refund or authentication email was sent.

## Confirmed source and preservation

package.json identifies filumire-website. PRODUCTION_RELEASE.md maps this checkout to Vercel project filumire-website and production deployment dpl_7YwQSnhu85B1GFbsa6Yd76eU4zWr, serving filumire.com. The earlier hosting audit independently confirmed that domain/project mapping. The unrelated GitHub repository was not used.

Baseline SHA-256 hashes and original versions of edited files are retained under .local-backups/subscriptions-test-mode-2026-10-11. All existing curriculum, localisation assets, native contact API/SMTP/form, family/schools pages and public files have unchanged hashes. Only the existing files listed below were modified for subscription discovery, locale adapters and safe configuration. package.json and package-lock.json are unchanged.

## Implemented locally

- English/French /pricing, /account and /account/subscription routes; provisional-price and test-mode notices throughout. Account pages are excluded from indexing, use private/no-store responses and suppress referrers.
- Individual GH₵30/month for one learner; Family GH₵60/month for up to three; institutional pricing retains /contact?inquiry=school-pilot and its French equivalent. No annual or termly price was added.
- Versioned configuration in src/lib/subscriptions/plans.ts. Orders snapshot price, GHS currency, duration and learner allowance. Catalogue revisions cannot retroactively change existing orders.
- Passwordless parent-owned accounts with email-possession verification, guardian attestation, browser-bound one-time links, hashed tokens/sessions, 15-minute link expiry, 14-day sessions, logout and durable request limits. Sign-in secrets use URL fragments, not query strings. Confirming a link requires a deliberate POST and the requesting browser’s HttpOnly challenge cookie.
- Local persistent server-side SQLite records for accounts, households, eligibility, trials, learner profiles, per-learner progress, payment orders, access periods, refund requests and webhook receipts. No browser storage is used for billing authority.
- Reviewer-controlled household eligibility: parents cannot assign their own eligibility key. A unique reviewer-assigned key and retained trial-use record prevent reuse of the same approved household eligibility. Review of actual household identity is an operational dependency, not automatically proven by an email address.
- Trial activation occurs only after verified sign-in, eligibility approval and confirmed learning readiness. Expiry is exactly activation + 168 hours. Expiry is checked on access requests. It never calls a payment API, deletes profiles or deletes recorded progress.
- Paystack one-time hosted checkout requests card and Ghana Mobile Money channels. Server-side verification checks reference, amount, currency, customer email, channel, provider ID and test domain. Live keys, live mode and production payment execution are refused. No recurring subscriptions, card-authorisation reuse or automatic MoMo deductions are implemented.
- Raw-body HMAC SHA-512 webhook validation; durable receipt hashes; transactionally unique grants prevent repeated or concurrent callback/webhook delivery from extending access twice. Pending verification remains retryable.
- Manual renewal extends remaining trial/paid access; expired subscriptions restart from server confirmation. Calendar-month arithmetic clamps month-end dates safely. Cancellation marks the subscription to end after the paid period and preserves remaining access.
- Parent billing history with pagination, payment references, amounts, methods, statuses, purchased access periods and refunds. Pending/failed attempts can be rechecked. Checkout returns to the matching locale. Cancellation/initialisation failures never invent a successful payment.
- Refund review requests are parent-owned and never execute money movement. Signed refund notifications are independently reconciled with Paystack refund and original transaction records. Only confirmed full refunds revoke their own grant; partial refunds retain access. A refund request or processing notification is not represented as completed.
- Learner/profile ownership and access checks. Each learner has separate progress records. Reads remain available after expiry; expired or foreign progress writes are refused. Existing learning-platform progress was not imported, copied or changed.

## Important completion boundaries

The public website still has no connected learning-session platform. Full learning features cannot be delivered by billing code alone. FILUMIRE_WEBSITE_LEARNING_READY remains false by default, so real trial activation and checkout remain disabled until the actual full learning flow is connected and verified. Enabling this flag alone does not establish that integration.

The persistent SQLite adapter is explicitly LOCAL DEVELOPMENT ONLY. It refuses VERCEL=1 and VERCEL_ENV=production. It must not be deployed as storage for Vercel Functions. A PostgreSQL schema is supplied for review; a dedicated owner-approved development database, its production-quality transaction adapter and PostgreSQL validation remain outstanding. No migration was applied to any external database.

Package downloads for better-auth and pg failed with EACCES while fetching registry.npmjs.org. No dependency was installed or added to the lockfile. Local development uses Node 24 built-in SQLite/crypto and a passwordless implementation. Managed/library authentication and its database integration should be reviewed before any hosted release; no such provider has been provisioned.

Actual Paystack test checkout, Mobile Money/card test acceptance, callback/webhook delivery and provider-side refunds have NOT been verified. Automated provider tests use clearly synthetic fixtures and intercepted HTTP transports. They are not real Paystack successes.

Browser automation returned “No browser is available.” Visual/mobile layout, hydration, clicks, email-link navigation and the hosted checkout journey remain unverified. Server-rendered HTTP checks are not browser interaction passes.

## Validation

| Check | Result |
|---|---|
| Automated regression tests | PASS: 57 tests; 30 existing and 27 subscription/security tests |
| TypeScript | PASS after final build, run sequentially |
| Next.js local production build | PASS, Next.js 15.5.27 |
| New routes/API default guards | PASS: six bilingual pages return 200; three unconfigured APIs return 503 with safe error codes |
| Existing website HTTP/link check | PASS: 39 page variants, 121 links, 21 images, 32 generated assets, 14 enquiry/category combinations; recovery passes |
| Persistence | PASS: trial and eligibility records read through a second database connection |
| Existing corrections | PASS: baseline hashes unchanged for curriculum/artwork/contact and all other unlisted existing source files |
| Real external payment/email/platform flow | NOT RUN: credentials/infrastructure/connection missing |
| Browser QA | UNAVAILABLE |

Tests cover exact trial boundaries, one-time and concurrent activation, eligibility reuse, retained profiles/progress, plan snapshots, failed/pending transactions, payment mismatch/live-mode refusal, webhook signatures and duplicates, concurrent callbacks, early/expired renewals, month ends, learner limits, cancellation, partial/full refunds, retryable refund confirmation, parent sessions, one-time links, expiry, guardian consent, origin/body limits, rate limits and ownership isolation.

Evidence: tmp/subscription-tests.log, tmp/subscription-build.log, tmp/subscription-http-checks.json and tmp/subscription-link-checks.json. An initial independent TypeScript command overlapped a build that regenerated .next/types; the final sequential TypeScript run passed. The first existing-link run used port 3158 despite metadata being configured for 3147; the matching-origin rerun passed without changing website metadata.

## Local setup and commands

Node 24 is required. Default settings remain disabled in .env.example; no .env.local was created.

Configure local-only values securely when authorised: FILUMIRE_SUBSCRIPTIONS_ENABLED=true, FILUMIRE_BILLING_STORAGE=sqlite-local, FILUMIRE_BILLING_ORIGIN matching the local server, and a high-entropy FILUMIRE_AUTH_SECRET of at least 32 characters. Local records are stored under .data/subscriptions.sqlite and excluded from Git. Protect this folder and its WAL/SHM companions as private data; it is not an export or backup policy.

Authentication email sending additionally requires separately authorised FILUMIRE_AUTH_EMAIL_ENABLED=true and the existing approved Zoho SMTP host/sender/credentials. The new authentication mail transport does not alter contact routing. Do not enable it or send test messages until that operation is authorised.

PAYSTACK_MODE must remain test. Supply PAYSTACK_SECRET_KEY=sk_test_… through secure local configuration only; never through chat, public variables, source or browser code. A supplied live key is rejected. No real test transaction was requested in this session.

Keep FILUMIRE_WEBSITE_LEARNING_READY=false until the learning flow is connected and its complete feature access verified. Once a verified parent requests eligibility review, a local authorised reviewer can use scripts/approve-trial-household.mjs with that parent email and a stable approved opaque household reference. Set FILUMIRE_TRIAL_REVIEWER and reuse the same household reference for duplicate requests; never use national IDs or raw phone numbers. Approval does not start the trial. Review data is private. The review process and identity-key retention need an owner-approved policy.

Run from this website directory:

- npm test
- npm run build
- npm run typecheck (after build; do not run concurrently with build)
- npm start -- --hostname 127.0.0.1 --port 3147
- node scripts/check-subscriptions.mjs http://127.0.0.1:3147 (expects default disabled services)
- node scripts/check-links.mjs http://127.0.0.1:3147

No validation server is intentionally left running at handoff.

## Required dependencies and owner decisions

1. Securely supply a Ghana Paystack test key and approve test-only checkout/webhook configuration. An externally reachable test webhook URL and its hosting/testing approval are required; no deployment is authorised by this implementation.
2. Approve a dedicated FILUMIRE_WEBSITE development database/provider and provisioning scope; restore dependency-download access and implement/test the hosted transaction adapter. Do not reuse school, core or learner credentials/databases.
3. Approve authentication-provider/library choice and the scope of transactional verification emails. Validate real mail delivery without changing the working contact implementation.
4. Confirm the permitted learning-platform entitlement handoff. Work on the separate learner platform remains outside this task. Full trial access cannot be declared complete before that connection is verified.
5. Approve household eligibility evidence/reviewer procedure, privacy retention, refund handling and support policies. Refund requests currently require manual review; there is no public money-moving refund API.
6. Approve a later hosted preview/security/browser QA stage if desired. Production deployment, DNS changes, live payments and automatic renewal require separate authorisation and remain out of scope.

## Existing files changed

- src/components/pages/access.tsx
- src/lib/constants.ts
- src/lib/locale.ts
- src/lib/pages.tsx
- src/lib/translations.ts
- src/middleware.ts
- .env.example
- .gitignore

All remaining implementation files are new and confined to this website, principally src/lib/subscriptions, src/components/subscriptions, the new routes, tests/subscriptions.test.mjs and local scripts.
