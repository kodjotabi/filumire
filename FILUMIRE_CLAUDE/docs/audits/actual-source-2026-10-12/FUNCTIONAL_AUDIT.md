# FILUMIRE learner functional audit — actual local source

Date: 12 October 2026. Scope: the requested local learner application and its supporting services. No deployment, database mutation, DNS operation, public website change or source refactoring was performed.

## Confirmed source and comparison

- Verified C:/Users/tabi/Desktop/filumire-responsive/FILUMIRE_CLAUDE exists and contains apps/learner.
- Git repository root: C:/Users/tabi/Desktop/filumire-responsive; origin: https://github.com/kodjotabi/filumire.git.
- Branch: filumire-interface-testing. Local HEAD: a59b9fdf12380bc261f364fbafe1b03d41a02741 (10 October 2026), “Strengthen teacher invitations and shared-device sign-out for Section 7”.
- GitHub branch still resolves to f6c8e7d4945735d6203b19b87223cd3793f6440e. That commit is an ancestor of local HEAD; local HEAD contains 18 subsequent commits.
- The initial working tree contained 16 modified tracked learner files plus numerous untracked implementations, tests and documentation. These are part of the audited source, not a clean release represented by HEAD.
- Tracked working-tree comparison with f6c8e7d: 89 files, 13,924 insertions, 1,951 deletions; untracked files are additional. Existing work was preserved.
- The previous GitHub-only audit did NOT examine the latest local implementation. It remains evidence about its older remote snapshot, not a valid inventory of this local application.

## Verification limits and classifications

“Working and verified” below means source inspection plus automated tests and/or the isolated local HTTP flow; it does not assert deployed operation. HTTP verification used the real production-built application with deliberately isolated in-memory persistence, test-only credentials and an inert database URL. No successful OTP delivery was simulated or claimed. Browser tooling could not open a browser, so clicking every rendered control and hearing real device voices remain outstanding. Database checks were metadata-only, inside a read-only transaction.

| Feature / interaction | Classification | Actual implementation and remaining gap |
|---|---|---|
| Guardian email/password registration and login | Working and verified in isolated local API | Validation, scrypt password hashes, real cookie sessions, duplicate/error handling, guardian identity. Production registration defaults closed unless explicitly enabled. |
| Teacher registration and login | Working and verified in isolated local API | Real teacher accounts and role checks; invitation linking verified. |
| Learner account creation/login | Implemented; service tests and account journey coverage | Guardian creates learner username/password accounts; grade validation and selection are present. No broad claim of deployed authentication. |
| Login abuse protection | Working in isolated tests; deployed configuration dependent | Shared rate limits, atomic failed-login lockout, five failures/15 minutes, eight-hour sliding session with seven-day cap. PostgreSQL mode requires the migration and permissions. |
| Password change / guardian learner password reset | Implemented; account security tests | Authenticated management exists. |
| Forgotten-password recovery without a session | Incomplete | Email recovery is not a complete provider-backed workflow. Local mock phone recovery is not production recovery. |
| Ghana phone parsing and validation | Working in isolated tests | Normalizes local and +233/233/00233 syntax; broad Ghana mobile pattern. Does not prove every currently allocated prefix or number ownership. |
| Phone registration/login/recovery and OTP delivery | Blocked by external configuration / production implementation incomplete | Only explicitly gated local MockSmsProvider and in-memory phone binding exist. Production endpoint honestly returns unavailable; no real SMS provider, durable production binding or delivery verification. |
| Ask FILU question and follow-up | Working and verified in isolated local API | Actual approved-curriculum answers, continuity and bilingual responses. Default provider is CurriculumConversationProvider; old mock-only assessment was inaccurate. This is bounded curriculum retrieval, not a general-purpose LLM. |
| FILU context and safeguards | Implemented; tests | Authenticated learner context, signed scoped history, assessed-answer protection, safety categories, bounded input/output, rate limits, timeouts and unavailable/retry states. Safety requires further educational evaluation beyond these tests. |
| FILU durable cross-device conversation | Incomplete | Device sessionStorage and signed short-lived history exist; no durable database conversation archive. |
| English/French read-aloud | Implemented; automated playback/selection tests, device verification pending | Lesson, question, summary and FILU response controls use local browser speech voices; unsupported/unavailable languages are handled honestly. Availability depends on installed voices. |
| Play/pause/resume/stop/replay/mute/speed | Implemented; automated tests | Speech playback lifecycle and cancellation are present. |
| Volume slider, microphone input | Not implemented | No microphone capture/recognition flow; no adjustable volume control. |
| Dedicated pronunciation assessment and learning sound cues | Not implemented | Reading text aloud is not pronunciation scoring. No dedicated response cues were found. |
| Learning session / answer submission | Working in isolated local HTTP journey | Real session and assessment response verified. Broader adaptive/content tests have failures; see validation evidence. |
| Learner progress | Implemented; progress/continuity tests | Activity, mastery and curriculum totals are separate; server overview refresh and restored step handling are present. Old blanket “progress is fake/missing” conclusions do not apply. |
| Offline / interrupted answer handling | Implemented; pending-submission tests | Request identity and reconciliation exist. Device storage may fail; do not promise durable queued submission under full storage or across devices. |
| Learner profile / language / class setup | Implemented; tests | Profile API persistence, name/avatar/language updates, validated class selection, bilingual navigation. Real database durability and visual form confirmation still require targeted environment testing. |
| Parent learner management and summaries | Working and verified in isolated local API | Add/select learners, actual summaries, bilingual parent text, account controls. |
| Teacher invitation/link/revoke/access | Implemented; invitation/link verified in local API | Hashed expiring one-time codes, role enforcement and link-management service tests. |
| Parent/teacher messages | Working core API; implemented but defective error/retry interaction | Real send/read/reply and same-ID idempotency verified. UI clears draft before successful refresh and retries may generate a new request ID; malformed JSON handling and message-length bounds need review. |
| Teacher observations/interventions/review | Implemented; tests, content gap | Real authorized service/API paths. One trusted-rubric learner review test returns missing content (404). |
| Settings/help/notifications | Incomplete | Some controls explicitly marked coming soon. These should be identified as unavailable during demonstration. |
| Dedicated feedback form | Not implemented | No complete learner feedback submission workflow found. |
| Privacy | Implemented draft notice | The local guardian/privacy page exists; earlier “absent” claim is superseded. |

## Page and form inventory

Inspected local pages: landing, login, register, dashboard, learn, adult, family, teacher, family-access and privacy. Dashboard contains learning, subject, challenge, progress, profile and FILU views. Reviewed backing API/client validation, submission, persistence and errors for account registration/sign-in, learner creation and setup, profile editing, account security, teacher linking, parent/teacher messaging, learning answers and FILU questions. Family-access is a gated prototype, not a production feature. Browser rendering/control operation remains unverified; this is not a claim that every visible button has passed a click test.

## Authentication / auth_rate_limits investigation

The login handler consumes a rate limit before verifying credentials. PostgreSQL mode inserts into auth_rate_limits; a missing relation therefore breaks login before password validation and can produce the reported error. drizzle/0020_auth_rate_limits.sql defines the table and expiry index. Teacher features also need the later account-kind and teacher-link schema changes.

Saved preview readiness documents captured on 10 October report missing auth_rate_limits and teacher_link_codes in the preview database. This establishes a plausible historical schema/configuration mismatch, not the present deployed state.

Fresh read-only metadata inspection of the database configured in apps/learner/.env.local returned database filumire_test, read-only transaction enabled, both auth_rate_limits and teacher_link_codes present with expected columns, and a guardian/learner/teacher account-kind constraint. The missing-table error was not reproduced there. This check does not prove index grants, operational login, migration completeness or deployed environment identity.

Root .env.local and learner .env.local specify different database connections and different persistence settings (root memory; learner PostgreSQL). The root connection failed the read-only connection attempt with PostgreSQL 28P01 (invalid authentication). The root configuration also lacks the learner's configured signing secret. Do not assume which connection the reported application used.

Conclusion: a missing rate-limit migration is supported by historical preview evidence, but the current reported failure's environment and exact root cause are NOT fully established. Check the failing deployment/runtime connection and read-only schema/permissions before proposing an approved migration. No table, data, migration or grant was changed.

## Prioritised implementation plan

1. Before the government demonstration: reconcile the intended authentication runtime/environment, registration policy and actual failing database; resolve root type-check and adaptive/content test failures; verify sign-in, learner progression, teacher review and all intended forms in an available browser. Schema changes require separate approval.
2. Demonstrate only verified account, curriculum learning, bounded FILU and essential parent/teacher workflows. Verify database restart durability in an approved isolated test environment, plus real device English/French voices and failure states. Preserve the established visual patterns.
3. Production phone access needs provider selection, Ghana delivery coverage, real OTP callbacks/errors, persistent identity binding, recovery protections and abuse controls. Report the concrete provider setup, database changes and costs before implementation. No paid service was provisioned; SMS usage/provider charges are currently unpriced.
4. Complete unauthenticated account recovery and message retry/error handling. Add volume and supported-browser microphone features, then structured pronunciation work and appropriate sound feedback. Browser-only speech adds no provider usage fees; hosted speech/transcription would introduce usage costs requiring an explicit plan.
5. Decide whether broader AI capability and cross-device FILU history are required. Current curriculum retrieval has no external model usage fee. An LLM/hosted voice upgrade would be a significant architecture/service change and needs a reviewed safeguarding/cost plan.

## Government demonstration readiness

Conditional readiness for a restricted local demonstration of core email/password accounts, curriculum learning, FILU curriculum answers and parent/teacher workflows. NOT ready to claim the full requested feature set operational: real phone OTP, microphone, pronunciation assessment, complete recovery and every browser interaction are not verified/complete; root checks and adaptive/content failures remain. No deployment approval was requested or exercised.

## Validation results and evidence

- Learner TypeScript: PASS (tsc --noEmit --incremental false -p apps/learner/tsconfig.json).
- Root TypeScript: FAIL (tsc --noEmit --incremental false -p tsconfig.json). tests/learner-interface-render.test.ts:25 TS2769: React.createElement(LearnerLoadingState, { language }) overload mismatch. Runtime render test passes; resolve the typing issue without assuming a broken visual control.
- Learner production build: PASS, Next 15.5.23, 33 generated pages. Used explicit isolated environment overrides so build could not access the configured database.
- Real local HTTP workflows: 31/31 PASS against the production-built app with memory persistence; included registration, grade validation, learner selection, learning session/assessment, FILU follow-up/French, parent summaries, teacher invitation/link, bidirectional messaging, role denial, sign-out and password login. Production mock-phone endpoint returned expected honest 503 unavailable.
- Broad source suites: 157 attempted; 146 PASS, 9 failures requiring investigation, 2 blocked because they expressly require PostgreSQL. Explicitly named PostgreSQL suites were excluded beforehand. No PostgreSQL-writing tests ran against a real database.
- Host limitation: ordinary shell process setup failed and tsx initially encountered uv_os_get_passwd. Checks ran through the available Node subprocess tool; a documented test-only OS-user-info fallback in this audit folder enabled tsx startup. This fallback does not alter application source, authentication or test assertions. Initial infrastructure launch failures are not counted as feature failures.
- Source integrity: SHA-256 comparison of 1,291 app/service/package/test/script source files found zero changes during audit. Added only this audit/evidence directory; normal build outputs were generated.

### Failing suites requiring review

| Suite | Observed failure |
|---|---|
| adaptive-gate-response | Failed transfer completes with CONTENT_EXHAUSTED_NEEDS_SUPPORT instead of another transfer check. |
| api-learning-retention-transfer-flow | Expected retention check after mastery; got complete. |
| assessment-evidence-hardening | Expected policy weight 0.8 differs from current result. |
| assessment-external-evidence | Trusted evidence policy expectation 0.8 differs. |
| b4-english-adaptive-coverage | Required ENGLISH-B4-indicators-authoritative.txt is absent. |
| learner-pending-teacher-review | Trusted-rubric learner submission returns 404, content not found. |
| learner-state-hardening | Expected empty-state mastery estimate 1 differs. |
| teacher-review-end-to-end | Learner submission returns 404, content not found. |
| teacher-trusted-review | Authorized teacher review returns 404. |

These failures are evidence of unresolved contract/content discrepancies. This audit does not establish whether every expectation is current; distinguish stale fixtures from runtime defects before editing adaptive policy. PostgreSQL-only blocked suites: pilot-measurement-v1 and teacher-observation.

Evidence files: tests-verified-run.log, test-results.json, http-workflows.json, root-types.log, learner-types.log, production-build-retry.log, database-read-only.log, working-tree-final.txt and sandbox-userinfo.cjs. Logs contain isolated test fixture identifiers, not production account records or credentials.
