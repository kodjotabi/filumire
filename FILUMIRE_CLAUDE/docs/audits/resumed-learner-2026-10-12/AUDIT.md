# Resumed FILUMIRE Learner audit — 12 October 2026

## Scope and preservation

Terminal reads and workspace writes were verified before corrections. The source snapshot `existing-work.zip` contains 9,542 existing files from the repository parent, including modified, untracked, hidden and ignored work, local configuration, documentation, assets and stored preview artifacts. Every archived file matched its source SHA-256 before edits. Generated `node_modules`, `.next` and `.turbo` directories and Git internals were excluded. `history.bundle` preserves the complete available Git history and refs; `git bundle verify` passed. The archives are locally ignored because the source snapshot includes private configuration.

To recover into a separate directory, clone `history.bundle`, then extract the corresponding source folders from `existing-work.zip` over that clone. Keep the new clone's `.git` directory rather than the archived worktree pointer. Reinstall dependencies and rebuild there. Do not extract over the working project merely to inspect the snapshot.

Final preservation comparison: 9,542 archived files checked; exactly 14 existing files changed for these corrections. All other archived files were unchanged, including public website source, services, packages, database/migration files, environment files and prior unrelated work. New audit evidence lives in this directory. No commit, push, deployment, database operation or persistent environment change was performed. No curriculum button was added.

## Corrections

| Finding | Correction |
| --- | --- |
| Ask FILU desktop grid still described the older help/chat/input panels; the current conversation had no assigned grid area. | Assigned the actual conversation to `chat`, removed the obsolete grid rows, and allowed the conversation column to shrink. Mobile remains in normal document order. |
| Ask FILU's introduction implied an always-available human-like learning buddy. | English/French introductions now describe help with the current lesson. The existing AI limitations and child privacy notice remain visible. |
| The French privacy notice used awkward plural wording for a child's name and address. | Corrected agreement and phrasing while preserving the instruction to keep personal details private. |
| Clear conversation appeared even with no messages; expired authentication provided guidance without a sign-in destination. | Show Clear only when a conversation or pending request exists; keep cancellation available during a request. Add a language-preserving sign-in link for expired authentication. |
| Learning, Progress and Challenges navigation dropped the selected subject. | Preserve and safely encode the subject in those navigation destinations, with regression coverage for reserved characters in subject IDs. |
| Sign-out was buried below Profile settings. | Expose Sign out in authenticated dashboard headers and loaded lesson headers. Use the existing shared revocation/cleanup path, show a busy state and show failed revocation honestly. |
| Profile's fallback sign-out silently ignored failure and redirected as if revocation had succeeded. | Reuse shared `signOut`, redirect only after success or an already-expired session, and display failure. The existing supplied dashboard handler remains intact. |
| Profile offered two controls for the same name-edit flow. | Remove the duplicate control beside the name; keep the existing editable name setting and form. |
| Reading required finding voice setup in Profile. | Add a labelled local-device voice selector beside lesson/question/summary/FILU reading controls. Preferences retain existing learner/language isolation, rate and mute settings. No remote voice or automatic substitution is introduced. |
| Audio offered duplicate Read/Replay actions and inactive Pause/Stop buttons. | Keep one Read/Replay action; show Pause/Resume and Stop while playback is active. Profile preview reuses its existing selector rather than rendering a second one. |
| Voice setup repeated technical API explanation. | Remove that extra product-facing paragraph; retain voice availability, accent/gender limitations and local-only privacy explanation. |
| Challenges' View all destination opens the subject list. | Rename the English/French link to See all subjects / Voir toutes les matières. |
| Learner sign-in's password-recovery button only displayed an unavailable-feature notice. | Replace it with expandable recovery guidance; no email recovery service is implied or added. |
| Learner sign-in fields and password-visibility control used small mobile targets. | Use at least 44px targets, 16px input text and visible field/summary keyboard focus. |
| Setup's Continue link could send another update while saving. | Guard the click handler during saving and expose the busy state. Required onboarding remains intact. |

Interface wording, English/French strings, visible navigation destinations and control handlers were inspected. A typo-pattern scan found no additional common misspellings in learner components. This is not a certification of every authored lesson's grammar or educational quality; authoritative curriculum materials were not rewritten.

## Ask FILU and learning protections retained

The saved forensic report was used to recover the earlier observed Ask FILU issues. Current suites rechecked interactive curriculum questions and follow-ups, representative teaching in Mathematics/Science/Computing/English, bilingual metadata, practice feedback, retry/client handling, context/session isolation, tampering, authentication and rate limits. Safety and scored-activity tests remain intact. No additional manual observations were supplied during this audit.

FILU remains a deterministic curriculum tutor, not an unrestricted generative model. Conversation practice does not award mastery, marks or official evidence. Official learning continues through the established assessment, teacher review, retention/transfer and adaptive decision flows. Shared-device cleanup, local-only speech and disclosure filtering were preserved. No safety filter, provider, evidence policy, threshold or curriculum service was changed.

## Verification

- Full runnable regression inventory: 155 suites. Initial run: 154 passed; one source-contract assertion expected Profile to contain the logout URL directly. Updated it to check the shared sign-out call and the shared client's actual revocation endpoint; the full test, including its authorization and messaging checks, then passed. Final outcome: all 155 runnable suites passed across the broad run and corrected rerun.
- Final focused rerun: 9/9 passed, covering account sign-out failures, voice rendering/playback, Ask FILU navigation, interface completion, bilingual copy, layout contracts, accessible rendering and progress rendering.
- Root TypeScript: passed (`--noEmit --incremental false`).
- Learner TypeScript: passed (`--noEmit --incremental false`).
- `git diff --check`: passed. Git's CRLF conversion warnings are informational.
- All test subprocesses used memory persistence, an unreachable loopback database URL and test-only signing material. Local configuration files were not edited. The original sandbox allowed terminal execution but still blocked the compiler subprocess with `spawn EPERM`; the affected checks were run with the granted execution approval, without changing application code to work around it.

- Learner Next production build: passed. Compilation, type/lint checks, page generation and route packaging completed. The tutoring route is present in the generated route inventory.
- Real local production HTTP checks: 17/17 passed against the freshly built app on loopback. Covered English/French sign-in documents and honest recovery guidance, hidden development access in production, anonymous tutoring denial, fictional guardian registration and learner creation, password sign-in, authenticated session, real learning initialization, subject overview, English/French FILU metadata and replies, privacy omission, cross-origin rejection, server sign-out and rejection of the revoked session cookie. All account/learning records were fictional and in memory. The local server was stopped afterwards.

## Remaining limitations

- Browser discovery returned no available browser, including after its documented connection checks. Visual viewport checks, actual pointer/keyboard interactions, screenshots, screen-reader operation and hearing installed device voices could not be performed in this session. Responsive results are source/style and server-rendered contracts, not browser-computed dimensions. Prior browser results are not presented as a new pass.
- Nine PostgreSQL suites were not run under the no-database-change constraint: account lifecycle, evidence round-trip, atomic evidence persistence, evidence persistence, both learner-state concurrency suites, pilot measurement, teacher observation and teacher pending review. No live database durability or deployed authentication claim follows from memory tests.
- `b4-english-adaptive-coverage.test.ts` remains blocked by the missing verified authoritative English curriculum fixture. It was not weakened or replaced with a self-comparison.
- Real phone OTP delivery, complete adult email-password recovery, microphone input and pronunciation assessment remain outside the implemented capability. No provider, paid service or database change was introduced.
- English/French voice availability and accents depend on installed local device voices. Unsupported devices must continue showing text and honest unavailable-audio guidance.
- Rule-based disclosure filtering and deterministic question recognition have the limitations documented in the existing FILU forensic report. This audit does not certify all possible child-safety scenarios or all authored curriculum passages.
- No public website edit, deployment or withdrawal reversal was performed. The requested curriculum button remains absent.

Evidence: `snapshot-verification.txt`, `snapshot.txt`, `preservation-comparison.json`, `regression-results.json`, `regression.log`, `focused-regression-results.json`, `focused-regression.log`, `root-types.log`, `learner-types.log`, `build.log`, `http-results.json` and `http-server.log`. Reusable isolated verification runners are `run-checks.mjs` and `http-smoke.mjs`.
