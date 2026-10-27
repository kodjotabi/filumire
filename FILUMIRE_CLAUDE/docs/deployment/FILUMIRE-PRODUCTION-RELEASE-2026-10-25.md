# FILUMIRE production release — 25 October 2026

**Status: BLOCKED — the release is validated and committed locally; production is unchanged.** The learner improvements pass local checks, but a guarded production build cannot accept the new release branch while its commit and branch approval pins still name the old deployment. The production database has also not been independently rechecked from this release, and authenticated live journeys remain outstanding. No new Vercel deployment was created.

## Release identity and scope

- Release branch: `release/production-2026-10-25`
- Release commit: `c0ef6232b8f9b629fe4b333c47e3cbbc8a74a8a4`
- Parent commit: `8adafed2c69f59fbbc40d022aa6d69bbc84c1ae7`, an import of the currently verified production source
- Files in the release commit: 53
- GitHub remote branch: does not yet exist (`git ls-remote` returned no matching ref)
- Push: none
- Production deployment: none

The release contains the My Learning layout correction, screened bilingual FILU help for five labelled actions, the existing JHS assessment and teacher-evidence adapters, and regression coverage. It does not include the unreviewed draft banks or assessment-task authoring package. The production Vercel project remains `filumire-learner` (`prj_jozdDNN1pW1q5Ez66e32RvXhbYwC`) with root `FILUMIRE_CLAUDE/apps/learner`; the production domain is `app.filumire.com`. No website files or the separate `filumire.com` Vercel project are part of the release.

## Production baseline and safeguards

At inspection, `app.filumire.com` pointed to `dpl_9VwuF4RxQEJjD9j1Fj2ztyTCa99d`. Its deployment metadata named commit `a27fd614b9f48279ba360d92f19376b8eba7cf6f` and branch `filumire-interface-testing`. Production was built from a frozen, dirty source overlay rather than that Git commit alone. I verified all 1,408 frozen source files against both the archived manifest and the live Vercel file tree; the source manifest SHA-256 is `55829383d0302de556e0f758364b086c56e93938cbbfe705dc2dd28e238e6095`.

The current production build guard requires `FILUMIRE_APPROVED_PRODUCTION_SHA` to equal the actual build commit and `VERCEL_GIT_COMMIT_REF` to equal `FILUMIRE_PRODUCTION_BRANCH`. Current production values are the old commit `a27fd614b9f48279ba360d92f19376b8eba7cf6f` and branch `filumire-interface-testing`; the release uses commit `c0ef6232b8f9b629fe4b333c47e3cbbc8a74a8a4` on `release/production-2026-10-25`. Those mismatches intentionally stop the Vercel production build. I did not fake deployment metadata, override build variables, weaken the guard, or change environment settings. Advancing the two release-control pins is required before deployment, and conflicts with the instruction to preserve production environment configuration.

The 42 existing restricted JHS topics and their fingerprints remain intact, with the existing 1,848 records. Learner progress and assessment identifiers were not migrated or rewritten. The new approved manifest and release catalogue are empty. All 544 new curriculum drafts and 1,044 bilingual assessment tasks remain pending and inaccessible to learners; all 39 source-blocked indicators remain excluded. Fifty build trace files were checked for imports of review banks, candidate banks or the isolated assessment package; none were found. The existing education and French approval evidence checks remain in force.

The release preserves production account, persistence, adaptive progression, mastery, retention, learner-context and deployment-guard files against the verified production source. Reviewer allowlisting and its six-person limit remain intact. A focused fictional-account regression confirms the existing supplemental reviewer can sign in and access their learner while duplicate, excess, malformed and removed reviewers fail closed.

## Changes

My Learning now puts Recommended Next above the subject cards. Science, Computing, Mathematics and English retain their existing presentation and appear in that order in a single evenly spaced desktop row; tablet and mobile layouts use two and one columns. Subject labels remain on one line. Home styling and unrelated pages were left outside this layout change.

During a scored activity, FILU now provides screened conceptual explanations, analogous examples, hints, simpler explanations and separate unscored practice prompts in English and French. It screens the local response against answer keys in every protecting assessment pool. Direct-answer requests and appended answer, translation or instruction-override requests do not enter the quick-action path. Provider calls stay disabled for protected contexts; teacher review and unknown contexts remain closed; the new assistance does not write marks, progress or evidence. The existing refusal remains for answer requests.

The integration adapters retain teacher-observed performance evidence, original-work requirements and rubric-only scoring. New curriculum approvals remain empty. Runtime assessment, persistence, mastery and retention rules were not replaced.

## Validation

- Full offline release catalogue: **230/230 passed**. One additional restored learner-removal test passed, for **231 distinct passing checks**. Ten database-only suites were excluded from the offline catalogue because it uses an unreachable database and memory storage.
- Security: **52/52 named offline suites passed**, including the restored learner-removal safeguard.
- TypeScript: root and learner-app checks passed.
- ESLint: **20 changed application files; zero errors and zero warnings**. React hook and unsafe dynamic-code rules were included.
- Production build: learner application build passed and generated all 36 static pages, with offline memory-only build settings. The build emitted a Next.js workspace-root warning because the isolated worktree and its parent both contain lockfiles; it did not fail compilation or tracing.
- Local browser checks: **30/30** for login, Home, My Learning, Recommended Next, English/French FILU actions, answer refusals, signed chat history and logout; **24/24** broader learner assessment and lesson journeys across four subjects, Basic 4–6, and English/French.
- My Learning widths: **320, 390, 600, 768, 1024, 1280 and 1440 px** in both languages passed for card order, layout, labels and horizontal overflow.
- Curriculum preservation: all 42 fingerprints and 1,848 existing records matched; 544 pending and 39 blocked indicators stayed absent from learner registration; approval catalogue remained empty; a saved progress fixture was unchanged.
- Live public checks: English and French login pages returned 200; unauthenticated session, learning, tutoring, teacher and adult endpoints returned 401. The website home returned 200. Existing production response headers included HSTS. No authenticated live learner, parent, teacher or reviewer session was used.
- Recent production runtime logs: no error or fatal entries were returned in the available 30-minute window.
- Source preservation: the Basic 7–8 original worktree (2,926 recorded files) and Basic 9 original worktree (2,732 recorded files) retain their recorded hashes, branches and HEADs. The isolated assessment candidate matches its recorded preservation check; its approval ledger and manifest remain empty.

The three recorded baseline failures were stale expectations in tests, not runtime faults. The voice-render test expected outdated voice labels; the server-render test expected audio controls before a local voice is available; the progression test expected 79 B5 Computing indicators where the current registry contains 82. Their assertions now match current copy, text-only server rendering, and complete registry coverage. The full release catalogue passes with all three corrected. The production snapshot also had an impossible five-reviewer assertion and tests that assumed old JHS banks; the reviewer test now checks the six-person cap, and the JHS tests use current verified banks and source fingerprints. No production safeguards were relaxed.

## Production checks still required

These checks have not passed and stop release approval:

1. Approve the release commit and branch in the production guard while retaining its equality checks. Current values conflict with this release; they were not changed.
2. Run the guarded production build against the actual production environment. This is where the existing guard opens a read-only database transaction to verify the migration ledger and grade-lock schema. No migration is included, but database connectivity and this live schema check have not been repeated for this release.
3. Use an authenticated reviewer and learner session to verify the live learner journey, assessment persistence, parent and teacher access, reviewer access, English/French switching, FILU assistance, and zero unapproved topics. Only unauthenticated live checks and local fictional-account journeys were performed.
4. Recheck the production project, domain, environment and reviewer configuration immediately before the guarded deployment. They were inspected and unchanged during preparation.

## Final deployment attempt — authoritative status (25 October 2026)

This update supersedes the earlier deployment-status statements above. The release branch `release/production-2026-10-25` at `c0ef6232b8f9b629fe4b333c47e3cbbc8a74a8a4` was pushed successfully. A protected Preview deployment was created as `dpl_33N6nFaNyJt4U3EzRpguGCf2rjqy` (`ERROR`), URL `https://filumire-learner-glgtye46t-tabicrentsil-6879s-projects.vercel.app`.

The guarded build refused with `database_url_invalid` before Next.js compilation or authenticated preview verification. Vercel environment metadata confirms that the Preview `DATABASE_URL` is scoped to Git branch `filumire-interface-testing`, not the release branch, so the release Preview build did not receive a usable URL. This gate was not bypassed.

No production pin was changed. The production alias remains on rollback target `dpl_9VwuF4RxQEJjD9j1Fj2ztyTCa99d`. No production build, read-only production database verification, authenticated live verification, or promotion occurred. The release status is **BLOCKED / NO-GO** until Preview database configuration is correctly available for the release branch and the guarded preview plus authenticated checks pass.

Curriculum safeguards remain unchanged: the 42 existing restricted topics are preserved; the approval catalogue remains empty; all 544 new drafts and 1,044 bilingual assessment tasks remain unapproved and inactive; all 39 source-blocked indicators remain excluded. No rollback was necessary.

## Preview scope correction attempt (25 October 2026)

The existing sensitive Preview `DATABASE_URL` (`gRM8jb6O1VSKXpR5`) was changed from branch scope `filumire-interface-testing` to `release/production-2026-10-25`. The Vercel edit request changed only `gitBranch` and omitted `value`; no plaintext value was pulled or displayed. Production `DATABASE_URL` and the two production release pins were not edited.

The rebuilt CLI-uploaded Preview deployment `dpl_2TuQG1Dp5t6pBPJgoJj7psauUbpU` (`ERROR`, `source=cli`) again stopped at the guard with `database_url_invalid`. The CLI deployment has release metadata but no Git source (`target` is null), so Vercel did not provide the branch-scoped Preview variable to that build. No guarded database transaction or authenticated Preview journey ran. Broadening `DATABASE_URL` to all Preview branches was not done. Status remains **BLOCKED / NO-GO**; use a Git-backed Preview deployment for this branch or obtain authorization for a broader Preview scope before retrying. Production remains on rollback target `dpl_9VwuF4RxQEJjD9j1Fj2ztyTCa99d`.

## Git-backed Preview attempt (25 October 2026)

The Vercel project remains connected to GitHub repository `kodjotabi/filumire`, with root `FILUMIRE_CLAUDE/apps/learner`. The ignored-build command was narrowly updated to allow build continuation for both the existing `filumire-interface-testing` branch and `release/production-2026-10-25`; other branches still follow the existing skip behavior.

Git-backed deployment `dpl_GZYfSmuyL9thy3pcv12tWedHPtjH` cloned `kodjotabi/filumire`, branch `release/production-2026-10-25`, commit `c0ef6232b8f9b629fe4b333c47e3cbbc8a74a8a4`. The `DATABASE_URL` scope was present for that branch, but the guard stopped with `database_allowlist_missing_preview`. Metadata shows the only `FILUMIRE_DB_HOSTS_PREVIEW` value remains scoped to `filumire-interface-testing`; it was not changed. The database URL was therefore not used for a connection, and the read-only transaction and authenticated checks did not run. No production pin or alias changed. Status is **BLOCKED / NO-GO** pending an authorized Preview allowlist for the release branch; the 42-topic restricted baseline and all unapproved/blocked curriculum safeguards remain intact.

## Preview allowlist correction and release verification (25 October 2026)

The existing `FILUMIRE_DB_HOSTS_PREVIEW` value was read through the project environment API (it is a host list, not a credential). It contains `ep-icy-scene-b816974r.c-14.us-east-1.aws.neon.tech`, distinct from the Preview-configured production host. A new encrypted Preview variable entry (`df9RsvJxC6VlQZn4`) was added for `release/production-2026-10-25` with a value verified equal to the preserved `filumire-interface-testing` entry (`LCp8dUITsjYe33ju`). The previous branch entry remains unchanged. `DATABASE_URL` remains branch-scoped to the release branch with its value omitted from the scope update.

Git-backed Preview `dpl_98FyhNodSFS5XWtpSfgR61MhRDze` cloned `kodjotabi/filumire`, release branch, exact commit `c0ef6232b8f9b629fe4b333c47e3cbbc8a74a8a4`, and reached `READY`. The narrow ignored-build exception was applied to this release branch only, preserving the prior behavior for other branches. The deployment guard passed: `mode=preview`, `persistence=postgres`, `gradeLockSchema=verified`. This confirms the database host passed the Preview allowlist and production-host exclusion, and the schema checks completed inside the guard's read-only transaction. The Vercel protected-preview login page returned HTTP 200; unauthenticated session and learning APIs returned HTTP 401 as expected.

Authenticated application journeys remain unverified: no in-app browser session is available, and no authorized FILUMIRE application test account/session was available. I did not create persistent accounts or learner records in the Preview database. Production promotion was not performed. Current production remains on `dpl_9VwuF4RxQEJjD9j1Fj2ztyTCa99d`; status **BLOCKED / NO-GO** pending authenticated Preview journeys. Curriculum approval remains empty, with 544 drafts and 1,044 assessment tasks pending and all 39 source-blocked indicators excluded.
