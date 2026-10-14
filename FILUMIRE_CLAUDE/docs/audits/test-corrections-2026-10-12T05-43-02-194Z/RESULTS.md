# FILUMIRE backup and test corrections

Completed 12 October 2026. Source: C:/Users/tabi/Desktop/filumire-responsive/FILUMIRE_CLAUDE. Branch filumire-interface-testing; HEAD a59b9fdf12380bc261f364fbafe1b03d41a02741. No commit, push, history rewrite, deployment, schema/data modification, persistent environment change, Vercel change or DNS change was performed.

## Complete backup and verification

Backup: C:/Users/tabi/Desktop/filumire-backups/filumire-responsive-2026-10-12T05-34-55-550Z

Copied the entire repository parent, including .git, .claude, hidden files, ignored environment configurations, untracked work, assets, documentation, node_modules, .next and stored .vercel deployment artifacts. Copying and verification completed BEFORE test edits.

- Source and backup regular-file count: 23,053 each.
- Bytes: 3,342,898,171 (approximately 3.34 GB).
- Every regular file was compared with SHA-256: zero mismatches.
- Two directory links preserved and checked. Their original absolute targets remain intact; if running the backup at another location, rebase links in a separate restored copy. The linked target folders themselves are included in the backup.
- Backup Git HEAD and full working-tree status match the source at backup time.
- Verification evidence: backup-verification.json here, and a sibling verification JSON beside the backup.

## Independent policy review before corrections

Checked policy contracts independently of the failing assertions. Repository history contains the recorded 7 October product-owner decision in f07f6e01: docs/handoff/4B_CHATGPT_MASTERY_MESSAGE.txt. It requires unchanged 0.8 mastery/confidence thresholds, independent correct evidence and retention/transfer gates. Archived pre-Tranche-4B services already use TRANSFER_FAILURE_PRACTICE and assessment-0.9. Existing mastery-v1, mastery-reuse-4b, pedagogical-policy-transition, evidence-context-v1 and no-premature-advancement suites all passed BEFORE edits. These contracts also pass in the final broad run. No application policy, threshold or scoring implementation was changed.

## Files changed

Nine existing test files were modified; one new test fixture was added:

| File | Correction |
|---|---|
| tests/adaptive-gate-response.test.ts | Seed content; build cumulative independent evidence and verified retention; assert failed transfer blocks advancement and triggers established corrective practice. |
| tests/api-learning-retention-transfer-flow.test.ts | Seed content before checking the complete retention/transfer/advancement flow. |
| tests/assessment-evidence-hardening.test.ts | Correct policy version assertion to assessment-0.9. |
| tests/assessment-external-evidence.test.ts | Correct policy version assertion; retain trusted provenance and fail-closed checks. |
| tests/learner-state-hardening.test.ts | Account for unspecified independence (0.86 estimate) and pass cumulative history for subsequent evidence. |
| tests/learner-pending-teacher-review.test.ts | Use explicit test-only rubric content; preserve pending queue/no-premature-evidence/idempotency checks. |
| tests/teacher-review-end-to-end.test.ts | Use test-only rubric fixture while preserving the full learner-to-teacher-to-evidence flow. |
| tests/teacher-trusted-review.test.ts | Use test-only rubric fixture; preserve authority, provenance, idempotency and revoked-access checks. |
| tests/learner-interface-render.test.ts | Explicit React.createElement props generic resolves root TS2769. |
| tests/fixtures/trusted-rubric-content.ts | New shared test-only oral assessment fixture, explicitly labelled as non-authoritative test content. |

Detailed before/after hashes are in changed-files.json. Test fixtures are intentionally isolated test inputs; production content was not restored or modified.

### Ghana B4 English fixture remains blocked

Reviewed f07f6e01450a30d0b34ecf83db264635abb36d39, which contains the historical 131-indicator file, an extracted English text and a review listing. This commit is not an ancestor of current HEAD. The accompanying curriculum source README identifies a Mathematics PDF, not the English source; no verified English PDF identity/checksum or reproducible extraction provenance was established. Agreement with current specifications does not independently establish curriculum authority. The historical fixture was therefore NOT restored and the coverage test was NOT weakened, rewritten to compare implementation against itself, or reported as passing.

## Final validation

Inventory: all 165 top-level *.test.ts/*.test.mjs suites classified. Ran all 155 runnable suites (including private-preview guard tests) in fresh isolated processes: 155 PASS, zero FAIL. The eight corrected formerly failing suites all pass. Ten suites were explicitly blocked rather than attempted against a real configured database or counted as passed.

| Check | Result |
|---|---|
| Full runnable suite | 155/155 PASS |
| Root TypeScript, no emit/incremental output | PASS |
| Learner TypeScript, no emit/incremental output | PASS |
| Learner Next production build | PASS (Next 15.5.23) |
| Application/configuration preservation | All 1442 pre-existing files checked; only nine approved test files changed. |
| Git history preservation | HEAD unchanged. |

Tests/build used temporary subprocess isolation: memory persistence, an inert localhost database URL and test-only signing material. No environment files or deployed settings were altered. The documented OS-user-info startup workaround from the earlier audit was used for tsx in this host. Normal ignored build outputs were regenerated after the backup. Separate browser harnesses were not run; device/browser verification remains outside this automated test pass.

Blocked suites:
- api-auth-postgres-lifecycle.test.ts: requires an approved disposable PostgreSQL test database; production-writing tests prohibited.
- b4-english-adaptive-coverage.test.ts: unverified authoritative curriculum fixture provenance.
- evidence-postgres-roundtrip.test.ts: requires an approved disposable PostgreSQL test database; production-writing tests prohibited.
- evidence-v1-postgres-atomic-persistence.test.ts: requires an approved disposable PostgreSQL test database; production-writing tests prohibited.
- evidence-v1-postgres-persistence.test.ts: requires an approved disposable PostgreSQL test database; production-writing tests prohibited.
- learner-state-postgres-concurrency.test.ts: requires an approved disposable PostgreSQL test database; production-writing tests prohibited.
- learner-state-postgres-semantic-concurrency.test.ts: requires an approved disposable PostgreSQL test database; production-writing tests prohibited.
- pilot-measurement-v1.test.ts: requires an approved disposable PostgreSQL test database; production-writing tests prohibited.
- teacher-observation.test.ts: requires an approved disposable PostgreSQL test database; production-writing tests prohibited.
- teacher-pending-review-postgres.test.ts: requires an approved disposable PostgreSQL test database; production-writing tests prohibited.

## Remaining readiness limits

Test corrections do not resolve the previously reported authentication environment split or establish current deployed login operation. PostgreSQL integration/durability, authoritative English coverage and real browser/audio operation remain unverified. Production phone OTP, microphone, pronunciation assessment and complete account recovery remain separate implementation gaps from the earlier audit. No new service was purchased or provisioned.

Evidence files in this folder: all-runnable-tests.log, test-results.json, root-types.log, learner-types.log, build.log, backup-verification.json, policy-verification.json, changed-files.json, preservation-check.json and working-tree-final.txt.
