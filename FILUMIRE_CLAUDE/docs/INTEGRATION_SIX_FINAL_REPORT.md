# FILUMIRE six-finding final correction report

Validated 13 October 2026 against current local FILUMIRE_CLAUDE and
C:/Users/tabi/Desktop/filumire/FILUMIRE_WEBSITE sources, including uncommitted work.
No older GitHub source substituted. **No deployment performed.** Production,
domains, DNS, real learner records, billing and SMS remain unchanged.

## Six original issues

| Issue | Correction and verification | Remaining limitation |
|---|---|---|
| Website–learner integration | One approved learner origin; bilingual Start Learning/Log In/Subscribe/role entries and guardian return. Original F artwork in white public-home circle; learner Home stays internal. Eight actual local browser journeys pass. | Live links remain approval-gated; source not deployed. |
| Deployment mismatch | Correct existing projects/team, learner monorepo root, Node 22 and install command in unapplied proposal; website standalone Node 24. Both builds pass; current-source packages byte-verified. | Older production unchanged; intended learner domain not assigned in inspected configuration. Preview verification/domain/production approval pending. |
| Parent authentication | Educational entry uses learner guardian auth and role-limited Family return. French signed-in redirect fixed. Existing isolated sign-in/sign-out/ownership checks pass; legacy billing implementation preserved. | No automatic legacy billing account merge. Verified linking/external email recovery pending. |
| Subscriptions | Truthful inactive pricing/account journey and authenticated readiness API; no fake access grants. Test-mode entitlement architecture documented; Paystack safeguards retained. | Hosted storage, verified immutable guardian mapping, bridge and entitlement policy unconfigured. No payment/trial/subscription granted. |
| Ask FILU | Home no longer activates/replays assessments. Answered stale flags use existing evidence. Signed guardian-confirmed append-only recovery preserves eligible unanswered history; six browser cases reproduce failure, recover ordinary answers and protect resumed tests. | Affected family inspected read-only, not recovered/deployed. Their actual Preview session is **not declared fixed**. Unknown provenance and pending reviews stay protected. |
| Security | Origin/sibling-site checks, bounded JSON streams, protected adaptive GET/POST, logout/no-store, role-safe redirects, signed guardian recovery and fresh-delivery scoring gate. Both audits zero advisories; regressions pass. | Targeted checks are not a full penetration test or hosted production verification. |

## Safe historical recovery

Read-only authorised Preview inspection found two linked learners with five
active unanswered diagnoses. Original auth sessions were expired/revoked.
No actual learning_presented events were found; legacy adaptive events do not
prove an assessment was never displayed. No real recovery or database write
was performed; private identifiers/credentials are omitted.

Old Home requests created diagnoses. Preventing new diagnoses did not repair
persisted rows. The new mechanism requires an authenticated owning guardian
and explicit preservation confirmation. Child/foreign requests are denied.
Only eligible contexts with verifiable ended sessions can be recovered.
Unknown provenance, current presentation and pending teacher review fail closed.

Recovery appends a bounded, domain-separated HMAC proof to the existing event
store, binding original intervention/competency/session/timestamp. Requests are
idempotent. No schema migration. Original interventions, evidence, progress,
curriculum pointer and original sessions are not rewritten/deleted. Recovery
itself adds a separate event. Browser checks verify original-history SHA-256
before/after is unchanged.

The engine creates fresh attempts rather than completing/cancelling/reusing
recovered records. Actual scored delivery is recorded before returning content.
Old recovered IDs cannot be scored, including after fresh delivery; omitting an
ID cannot bypass delivery. Valid new delivery can derive a new attempt ID and
use the existing evaluator. New live presentation overrides recovery; in-flight
context changes reject stale tutor answers. Pending reviews remain protected.

Signing uses the existing auth secret with domain separation. No auth configuration
changed. Future key rotation needs a proof-verification/key-retention strategy.

## Files changed and why

Private changes-from-preserved-source.json separates changes from earlier user
work. No deleted source/config files or changed environment files were found.

**Learner runtime**

- apps/learner/app/api/learning/route.ts: display-only Home, origin/bounded submission checks, actual delivery and fresh-attempt scoring gate.
- apps/learner/services/learning-client.ts and app/dashboard/page.tsx: dashboard without adaptive activation/pending replay.
- services/edututor/conversation-context.ts and assessment-recovery.ts: existing evidence, signed append-only recovery, provenance/live-delivery/pending-review safeguards and fingerprints.
- services/adaptive-engine/index.ts: exclude recovered attempts while preserving other learning logic.
- apps/learner/app/api/account/learners/[learnerId]/tutoring-recovery/route.ts and components/filumire/TutoringRecovery.tsx: ownership-protected endpoint and bilingual guardian confirmation.
- apps/learner/services/account-client.ts, app/login/page.tsx and app/family/page.tsx: safe return/language and recovery access.
- apps/learner/app/api/account/http.ts and api/session/logout/route.ts: origin/body/session hardening.
- apps/learner/app/api/account/access/route.ts: truthful readiness, no access grants/paywall.
- PublicHomeLink.tsx, LearnerHeader.tsx, AccountShell.tsx, learner-interface.css and public/filumire-f.svg: approved accessible public navigation; Home/welcome preserved.

**Website runtime**

- src/lib/learner-navigation.ts and constants.ts: approved educational authority, locale/role destinations.
- src/components/AccessLink.tsx and layout/Navbar.tsx: bilingual entry/public-home navigation.
- src/components/subscriptions/ParentAccount.tsx: educational guardian gateway and billing readiness.
- LegacyParentAccount.tsx: original implementation preserved, no account/database deletion.
- Pricing.tsx: provisional/nonoperational notice, prices unchanged.
- public/brand/filumire-f.svg: original vector artwork identical to learner asset.

**Verification/review**

Integration-six/legacy-assessment/tutoring-recovery tests and browser suites,
recovery fixtures, website integration-six tests, isolated runners/source
preservation helpers, config/integration-production.proposed.json and reports.
Test-only servers/fixtures are excluded from runtime packages.

## Final tests

| Check | Actual result |
|---|---|
| Learner regression | 33 suites completed successfully, 0 failed: 22 integration/targeted suites plus all 11 standard core suites, including adaptive progression, account journeys, identity, assessment integrity, teacher linking, language and progress. One PostgreSQL-only assertion within the identity suite was skipped (see below). |
| Additional recovery | Passed: omitted old IDs blocked, fresh IDs derived from delivery, live presentation overrides proof, delayed stale answer rejected, returning session retains recovery. |
| Website | 67 passed, 0 failed, 0 skipped; isolated SQLite, simulated email/Paystack. |
| TypeScript | Root/learner/website pass; no emit/incremental cache disabled. Root rechecked after final test additions. |
| Production builds | Learner Node 22 and website Node 24 pass on final runtime source; no warnings in final build logs. |
| Connected browser | 8/8 EN/FR at 320/390/768/1280: login/guardian return, original sidebar, arithmetic/general knowledge/follow-ups, public return, contained illustration, no overflow/page errors. |
| Recovery browser | 6/6 EN/FR at 320/768/1280: failure reproduced, guardian confirmation, unchanged history hash, ordinary answer, new scored lesson and restored restriction. |
| Long response/voice UI | Scroll/control geometry pass; long boundary text is labelled synthetic over actual backend. Audible playback unverified. |
| Dependencies | Official registry audit zero vulnerabilities in both trees; dependencies/lockfiles unchanged. |
| Preservation | Snapshots retained, no deletions/env changes/real record resets. |

Memory fixtures exercise real production-built handlers, not actual affected
session recovery/hosted database writes. External email/payment/SMS/sound delivery
not inferred. Legacy-without-recovery test intentionally reproduces a restriction
and passes fail-closed assertions; not affected-account PASS. Earlier failed
automation/environment runs were corrected/rerun, not counted as passing.

The identity suite's direct PostgreSQL table assertion that an external provider
subject is not automatically inserted as a learner was explicitly skipped because
these checks use isolated memory. No safe disposable PostgreSQL write fixture was
configured, and existing databases were not repurposed for tests. Other identity,
issuance, ownership, revocation and forged-token assertions ran successfully.
Core scripts were executed through the sanitized runner rather than loading
private .env.local or writing to an existing database.

## Five warning investigation

The user identified Codex's terminal status-bar “F2 to view” panel. Available
tools cannot access that diagnostic list. **Those exact five entries remain
uninspected**, not claimed resolved or harmless.

Available FILUMIRE logs were checked independently:

- Three static-render suites emit React's non-boolean jsx attribute warning: raw TSX lacks Next's styled-JSX transform. Existing styles compile in Next; final builds/running-browser logs have no corresponding warning. No suppression or unrelated runtime style rewrite.
- Earlier SQLite experimental warning comes from the existing local node:sqlite adapter, not a vulnerability/failed operation. Final Node 24 build does not emit it. Adapter remains prohibited on Vercel; hosted billing is a real blocker.
- Git LF/CRLF notices concern Windows normalization, not learner state. Current runtime source is byte-verified; no mass conversion.

Final TypeScript/build/browser checks report no application errors. This does
not substitute for inspecting the unavailable five F2 entries.

## Readiness and approvals

Byte-verified current runtime packages; zero known private secret matches:

- Learner 1,162 files: d817571f687b21f8bebdc1c87ae58dfb257d5c95ec9934fe6a08df940007f6b5.
- Website 167 files: f357672285f1ab0f211d7d1753bbacd1ac8ab4e6e2d1104c8e56fd5f31905861.

Old packages and snapshots preserved. Local build artifacts contain loopback
origins and must not be promoted; future Preview needs correct environment origins.
**No deployment/new Preview URL.** Existing Previews still contain previous source.
Previously inspected Vercel Authentication remains enabled; no settings changed.
Local demo validated; live integration, affected session and billing not overall PASS.

Future separate instructions/approval:

1. Protected Preview deployment/verification of exact current sources with correct origins and protection retained.
2. Authorised affected guardian confirms recovery, then direct-sidebar/resumed-assessment verification. No impersonation/reset.
3. Domain/DNS/public-link configuration and exact production promotion after Preview validation.
4. Hosted billing infrastructure/costs, immutable verified account mapping and entitlement policy. No live payments/SMS/migrations/production auth changes in this task.
5. Access to the F2 diagnostic list before exact five-warning classification.

No commit, push, destructive migration, unrelated redesign or production change.
