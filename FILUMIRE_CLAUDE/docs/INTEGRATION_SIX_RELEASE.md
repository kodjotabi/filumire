# FILUMIRE integration release review

See [INTEGRATION_SIX_FINAL_REPORT.md](INTEGRATION_SIX_FINAL_REPORT.md) for all six
issues, changed files, verification and remaining limitations.

**Prepared locally, not deployed. Production unchanged.**

Dedicated branches: filumire-six-corrections-20261013 and
filumire-six-corrections-20261013-website. Worktrees share Git refs/history.
Private original snapshots/diff/status/comparison/logs are retained under
.vercel/integration-six-2026-10-13/. Snapshots contain private configuration:
do not publish them. No deletion, environment change, record reset, commit/push.

## Architecture

Keep two applications. Public website owns information/pricing/entry; learner
owns educational guardian/teacher/learner identity, sessions, relationships,
permissions and progress. Share language through navigation, not identity claims
or cookies. Guardian Family returns are role-allowlisted; legacy billing stays
separate. Approved-origin gate stays closed until destination is reachable and
approved. Learner F returns to public home; Home stays dashboard.

The SQLite billing adapter cannot run on Vercel. Hosted storage needs approval.
Map immutable educational guardian to billing identity through verified ownership/
consent, not email equality/browser IDs. Retain legacy records. Future test
grants require verified Paystack test reference/domain/currency/amount/identity,
signed callbacks, idempotency, expiry/cancellation/refund/reconciliation and a
monotonic grant/revocation ledger with approved policy. Redirects/mock payments/
learningReady flags cannot grant access. No bridge or live billing activated.

## Recovery

Home is display-only. Existing evidence identifies answered stale flags.
Signed guardian-confirmed append-only recovery handles eligible verifiably ended
history; unknown provenance/live delivery/pending reviews stay protected. Original
interventions/state/evidence remain intact. Actual lesson creates/records fresh
attempts; old recovered IDs cannot be scored. Context races invalidate stale
answers. Preserve existing signing key; rotation needs proof verification retention.
No auth infrastructure change.

Affected family inspected read-only: two learners/five legacy diagnoses. Equivalent
persisted-history fixtures verified; actual family recovery was not executed or
deployed. Their Preview session is not declared fixed.

## Verified source

33 learner suites, 67 website tests, 14 browser cases, three TypeScript checks and
both production builds pass. Additional recovery/race/returning/omitted-ID checks
pass. Current dependency audits zero vulnerabilities.

One identity-suite PostgreSQL-only direct table assertion was explicitly skipped:
no disposable PostgreSQL write fixture is configured. Existing databases were not
used for write tests. All other checks ran in isolated memory/SQLite; the 11 core
scripts ran through the sanitized runner, not private environment files.

Browser uses actual production-built handlers and isolated memory. Website tests
use isolated SQLite/simulated providers. Long text synthetic; no real sound/
external email/payment/SMS delivery or affected-session success inferred.

Byte-verified runtime manifests, zero known secret matches:

- Learner 1,162 files: d817571f687b21f8bebdc1c87ae58dfb257d5c95ec9934fe6a08df940007f6b5.
- Website 167 files: f357672285f1ab0f211d7d1753bbacd1ac8ab4e6e2d1104c8e56fd5f31905861.

Packages exclude private envs/databases/backups/caches/test servers/fixtures.
Previous packages retained; identical website package reverified without overwrite.

## Release gate

config/integration-production.proposed.json is unapplied: learner existing
project/team, Node 22, root FILUMIRE_CLAUDE/apps/learner, install cd ../.. && npm ci;
standalone Node 24 website. Preserve auth issuer/audience/key, production secrets,
registration policy and Vercel Authentication.

Future Preview must build exact source with correct public origins. Local build
artifacts contain loopback origins: do not promote. Verify protected Previews and
authorised affected guardian recovery before production proposal. No deployment
authorised by these documents. Domain/DNS/public links/production, hosted billing/
verified mapping/entitlement policy, live billing/SMS/migrations/production auth
remain separately approved actions.

Codex F2's five warnings are inaccessible through available tools and remain
uninspected. Three test-only styled-JSX warnings, earlier SQLite experimental and
Git normalization notices investigated. Final builds/browser logs report no
warnings/application errors; this is not verification of unseen F2 entries.
