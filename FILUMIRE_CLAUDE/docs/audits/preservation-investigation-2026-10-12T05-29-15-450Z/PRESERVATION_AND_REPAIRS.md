# FILUMIRE preservation and repair investigation

12 October 2026. Requested application: C:/Users/tabi/Desktop/filumire-responsive/FILUMIRE_CLAUDE. Read the existing FUNCTIONAL_AUDIT.md. No application code, existing documentation, environment file or database schema/data was changed. All proposed repairs await approval.

## Preservation status

Branch: filumire-interface-testing. Commit: a59b9fdf12380bc261f364fbafe1b03d41a02741. Repository root: C:/Users/tabi/Desktop/filumire-responsive. Sixteen tracked files remain modified, with no staged changes. At capture there were 1,456 tracked and 112 untracked individual files repository-wide; 1,321 tracked and 111 untracked files belong to FILUMIRE_CLAUDE. The extra untracked repository file is outside the application. Exact paths and statuses are recorded in WORKING_TREE.txt and PRESERVATION_MANIFEST.json.

All 1,456 tracked paths exist: no tracked source, asset, configuration or documentation path is missing. A physical application scan hashed 1,436 files, including binary assets, package-lock.json, configurations, documentation and ignored local environment files. The hashes record contents without exposing credentials. Dependency/build/deployment artifact directories node_modules, apps/learner/.next and .vercel were explicitly accounted for and excluded from content hashing; this is not a claim that their contents or generated snapshots were exhaustively verified. Git history lives in the repository parent's .git, not inside FILUMIRE_CLAUDE. Existing .env.local and .env.preview-accounts.local are ignored and must not be missed by a backup.

The missing authoritative fixture discussed below is not a tracked file in the current branch, so its absence does not indicate that this investigation deleted existing work. Git status remained identical during investigation before adding these separate report artifacts.

### Recommended backup procedure — not executed

1. Stop local dev/build/test processes and pause editing briefly to obtain a consistent snapshot. Record branch, HEAD, full status and hashes as above.
2. After approval, copy the entire parent repository directory filumire-responsive into a NEW, timestamped backup directory outside the repository. Confirm the destination is empty and never use a mirroring or deletion option. Include .git, every working-tree file, hidden files, ignored .env files, untracked files, .claude, and the FILUMIRE_CLAUDE folder. A clone or Git bundle alone omits uncommitted and ignored work.
3. Prefer a complete directory copy. If disk space demands excluding reproducible node_modules/.next artifacts, make that exception explicit and retain package locks; retain .vercel metadata/deployment snapshots if needed for provenance. Do not delete originals.
4. Compare file counts, byte sizes and SHA-256 hashes between source and backup; check the backup's HEAD, refs and working-tree status using read-only Git commands. Store the backup on an approved local/encrypted destination because it contains credentials.
5. Optionally create an additional git bundle --all after approval, verify the bundle and retain the full directory copy. The bundle supplements Git history preservation; it does not replace the copy of uncommitted files. Do not reset, clean, stash, commit, push or overwrite anything as part of backup.

No backup was made. This report is a preservation inventory, not a backup guarantee.

## Nine failures, individually investigated

Diagnostic variants were compiled/evaluated only in subprocess memory with memory persistence and an inert localhost database URL. Original files were not rewritten. These are hypothesis checks, not a claim that the original failing suites now pass.

| Original failing suite | Established cause / category | Smallest proposed correction | Diagnostic outcome |
|---|---|---|---|
| adaptive-gate-response | Missing seed setup plus obsolete policy expectation. The empty content store triggers CONTENT_EXHAUSTED_NEEDS_SUPPORT. With seeded content, current policy returns practice / TRANSFER_FAILURE_PRACTICE, not immediate transfer_check. The suite also calls applyEvidence without cumulative history and omits independence metadata, so its supposed mastery setup is unsuitable for current mastery policy. | Seed explicit test content; assert remedial practice after failed transfer under current contract, and build evidence with cumulative history/metadata when testing mastery. Keep a separate exhaustion assertion. | Seeding plus updating the action/reason expectations passes all existing assertions in the diagnostic variant. |
| api-learning-retention-transfer-flow | Missing test content setup. It never calls seedContent; the engine correctly treats unavailable assessment content as exhausted. Its cumulative evidence history is already supplied. | Initialize a deterministic content fixture (seedContent is the minimal current change), retaining all retention, transfer and advancement assertions. | Entire suite passes after seeding, including persisted state and advancement checks. |
| assessment-evidence-hardening | Outdated version assertion: expects assessment-0.8; services/assessment/index.ts emits assessment-0.9. This is a version tag, not a numerical weight. | Update the expected version to 0.9 while retaining strategy, response-mode and outcome assertions. | Entire suite passes with only the version expectation changed. |
| assessment-external-evidence | Same obsolete assessment-0.8 expectation; current version is 0.9. | Update version assertion; preserve trusted evaluator provenance and fail-closed checks. | Entire suite passes, including rejected missing provenance. |
| b4-english-adaptive-coverage | Missing authoritative fixture, not absent generated application content. docs/curriculum-sources/ghana/2019/ENGLISH-B4-indicators-authoritative.txt is absent in this branch. A 131-line fixture exists in repository commit f07f6e01450a30d0b34ecf83db264635abb36d39, which is NOT an ancestor of current HEAD. | Review that historical fixture's authoritative provenance, then restore only the approved fixture as a new file. Do not merge its branch, fabricate the fixture from implementation output, or bypass the independent coverage comparison. | Supplying that exact historical file in memory passes all 131 indicator/spec checks and 1,048 generated-content checks. |
| learner-pending-teacher-review | Stale generated item fixture. Test uses item-gh-b4-english-b4-1-1-1-1-diagnostic-en, removed from the seeded set for this competency when authored content replaces generated records. | Add a dedicated trusted-rubric test fixture with explicit metadata/IDs. Keep current authored production content. Do not swap to a multiple-choice item, which would stop testing teacher review. | Injecting the historical generated rubric fixture only into the test's memory store passes pending queue, no premature evidence, persistence and idempotency checks. |
| teacher-review-end-to-end | Same obsolete generated rubric item; learner submission fails before teacher flow begins. | Use the dedicated rubric fixture shared with the pending-review test. | All learner submission, teacher visibility, trusted review, evidence/state update and queue-clearance assertions pass with that fixture in memory. |
| learner-state-hardening | Outdated mastery assumption. Missing independence defaults to 0.6; current mastery formula is correctness × (0.65 + 0.35 × independence), yielding 0.86 for the supplied correct evidence, not 1. It also omits cumulative history in later evidence calls. | Assert the expected 0.86 for unspecified independence with a tolerance, or explicitly mark independent evidence if the intended scenario is unaided success. Supply history for tests claiming cumulative behaviour. | Changing only the estimate assertion to 0.86 passes all current assertions. Additional history-aware assertions should preserve their original safety intent. |
| teacher-trusted-review | Same stale generated content/item IDs. It creates a pending review manually but the real review endpoint cannot resolve the old content. | Install a dedicated trusted-rubric fixture in test setup and retain authority, revocation, provenance and idempotency assertions. | All current assertions pass with generated rubric content injected only in memory. |

Source anchors: services/adaptive-engine/index.ts:520-595 (exhaustion); services/adaptive-policy/index.ts:177 (failed-transfer practice); services/assessment/index.ts:748 (assessment-0.9); services/mastery/index.ts:108-122 and 426-429 (independence and formula); services/content-store/seed.ts:22-26 (authored replacement); services/content-store/ghana-b4-english-authored-eng-song-stress-rhythm.ts (current authored content).

Conclusion: none of these nine failures establishes a core application regression after the isolated diagnostic checks. They divide into obsolete test contracts and missing/stale test fixtures. This does NOT establish that every production workflow is defect-free. In particular, persisted pending reviews referencing retired content IDs may need compatibility handling; no real learner records were queried to determine whether such records exist. Current authored multiple-choice content does not itself demonstrate oral performance assessment coverage.

The two additional blocked suites from the previous audit (pilot-measurement-v1 and teacher-observation) expressly require PostgreSQL. They are environment restrictions, separate from these nine. No database-writing test was run against a real database.

## Root TypeScript error

Reproduced TS2769 at tests/learner-interface-render.test.ts:25. LearnerLoadingState accepts a defaulted parameter, inferred as an optional props argument. React.createElement overload inference fails to select its props type and reports that language is not part of Attributes. Runtime rendering passes; this is not evidence that the learner loading screen is broken.

Smallest verified correction is test-only: explicitly supply the props generic to React.createElement, e.g. React.createElement<{ language?: "en" | "fr" }>(LearnerLoadingState, { language }). A virtual TypeScript compiler host reproduced the baseline error and produced zero root errors with this one test-only change. No component signature, tsconfig exclusion or type-safety relaxation is required. The learner-only configuration omits root tests, explaining the previous passing learner check/build.

## Authentication and database findings

| Setting/check | Root .env.local | apps/learner/.env.local |
|---|---|---|
| Persistence | memory | postgres |
| Signing secret | absent | configured, at least 32 characters |
| Registration override | unset | unset |
| Database host | Same host | Same host |
| Database / user / password | Different from learner values | Different from root values |
| Fresh connection result | PostgreSQL 28P01, invalid authentication | Connects successfully to filumire_test |

No credential values or complete connection URLs are included in this report. The exact local split is established: same host, different database names, usernames and passwords, different persistence mode and signing configuration. It is not yet established whether this split was intentional.

A fresh learner connection used BEGIN READ ONLY and ROLLBACK. auth_rate_limits and teacher_link_codes resolve through the configured search_path. auth_rate_limits has its primary key on key_hash and expiry index on window_ends_at. The configured learner role has SELECT, INSERT, UPDATE and DELETE privileges on the limiter table. Teacher-link primary-key, unique-code and learner indexes are also present. Only metadata/privileges were inspected; no login attempt consumed a database rate limit, and no real account rows were read.

Default workspace learner commands run Next from apps/learner and use that application's environment loading. Root test scripts explicitly use --env-file=.env.local; they do not thereby load the learner file. Pre-existing environment variables can override file-loaded values. A process started with root/preloaded settings can therefore differ from the normal learner launch. The persistence provider captures FILUMIRE_PERSISTENCE at module load; changing a file without restarting an existing process does not retarget it.

Both files leave registration override unset, so registration remains closed under NODE_ENV=production. Development/tests permit registration. The missing root signing secret prevents session issuance if that configuration is used; the root database authentication error is independently established, but root memory persistence ordinarily does not consume PostgreSQL rate limits.

The reported missing auth_rate_limits relation is consistent with the saved 10 October preview baseline, but does not match the current learner database. The root connection's 28P01 is a different failure from a missing relation. Without the failing process/deployment's effective environment and error trace, the exact current reported login root cause cannot responsibly be declared solved. No migration is justified solely by the present learner metadata checks.

## Proposed corrections, in priority order — approval required

1. Approve and verify a full repository backup before repairs. Preserve all untracked and ignored work as well as .git.
2. Establish the intended demonstration runtime and database. Align only that environment's approved persistence, connection, signing key and registration policy; restart its process after approved changes. Do not copy root credentials over learner credentials or enable registration blindly. Read-only inspect the actual failing deployment before any schema proposal.
3. Make the small test-only TypeScript generic correction, update the two assessment policy tags, seed the retention-flow fixture, correct failed-transfer expectations/setup, and make mastery tests history/independence-aware. Retain guards and test meaningful behaviour.
4. Add a dedicated trusted-rubric fixture for the three teacher-review suites. Review and restore the independent authoritative English fixture from historical provenance. Rerun targeted suites, root/learner TypeScript and the production build after approved changes.
5. Investigate legacy pending-content compatibility only if real persisted references are established in an approved environment; any application fix should be isolated and separately reviewed.
6. Complete browser and device verification of the demonstrated flows; test PostgreSQL durability/teacher observations in an approved isolated test database. Real phone OTP, microphone, volume, pronunciation assessment and complete unauthenticated recovery remain separate development work from the earlier audit.

## Government demonstration risks

The nine red tests overstate demonstrated application defects, but still leave validation incomplete until corrected and rerun. A wrong/preloaded auth environment, unset production registration override, absent root signing secret or stale root database credentials can stop account workflows. Retired rubric item IDs may block legacy pending reviews; current oral-performance coverage remains a separate curriculum question. English/French audible device voices and every visible control have not been browser-verified. Do not present production OTP or the other incomplete features as operational.

Core learner and family APIs have prior isolated verification. Approval should target the small repairs above and the intended demonstration environment; no deployment, schema modification, folder migration or purchase has been performed or proposed as an automatic next step.
