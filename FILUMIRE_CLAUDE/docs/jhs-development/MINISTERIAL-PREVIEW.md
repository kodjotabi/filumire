# Ministerial preview — 23 October 2026

This is an unpublished, fictional-learner development demonstration in `feat/jhs7-9-development`. It is not a claim of complete Junior High curriculum delivery or approval to enrol real JHS learners. The 625 mapped physical source entries retain their IDs and printed codes; 14 have draft bilingual representative journeys, 611 await authoring, and none is educationally release-approved.

## Coverage

| Grade | English | Mathematics | Science | Computing | Draft / mapped |
|---|---:|---:|---:|---:|---:|
| Basic 7 | 1 / 53 | 1 / 74 | 3 / 53 | 1 / 55 | 6 / 235 |
| Basic 8 | 1 / 49 | 1 / 58 | 1 / 46 | 1 / 39 | 4 / 192 |
| Basic 9 | 1 / 51 | 1 / 52 | 1 / 58 | 1 / 37 | 4 / 198 |

`preview-competency-matrix.json` contains all 625 IDs, hierarchy, source pages/codes, remaining source flags, content IDs and separate authored/API/browser/release states. `preview-coverage-summary.json` gives all twelve combinations. A verified draft is not an approved full subject. Printed code strings overlap across subjects; validation joins use internal competency IDs.

## Architecture and preservation

- Explicit runtime framework `curriculum-gh-nacca-ccp-2020`, education system `education-system-gh-jhs-ccp` and runtime structures for Basic 7–9. Version `curriculum-version-gh-nacca-ccp-2020` remains inactive; all three source grades remain hidden/unsupported in normal application processes.
- All 625 source registrations, including duplicate printed codes and lossless Basic 8–9 source mapping records. Basic 8–9 adds 707 source hierarchy nodes to the existing Basic 7 400.
- Authenticated guardian placement endpoint: `POST /api/account/learners/:learnerId/placement`, with `{ curriculumVersionId, gradeId, subjectId }`. Active guardian relationship, supported target and compatible runtime initial competency are required. It changes only the active context, in one persistence write. It creates no evidence and rewrites no history. Hidden JHS targets are rejected in normal operation. A supported primary context is the return path. No new staff role or staff self-authorisation is introduced.
- Source mapping does not create teachable competencies. Only an explicit non-deployed, in-memory test adapter registers the representative definitions. Production seeds and routes do not import representative teaching content. No automatic learner migrations, database migrations, payment changes or changes to mastery rules.
- The old Science adapter remains isolated for regression compatibility; the representative preview instead uses the real CCP framework identity while preserving its competency/content IDs and assessment policies.

## Start and recover

From this worktree's `FILUMIRE_CLAUDE` directory:

```powershell
powershell.exe -NoProfile -File scripts/start-jhs-preview.ps1
```

Open `http://127.0.0.1:3281`. `preview-live-routes.json` lists exact English/French links for each indicator after startup. The server binds only to loopback, requires test flags and memory persistence and refuses a Vercel environment. It uses fictional learners and a fictional signing secret; PostgreSQL points at an unreachable local address. Do not copy real credentials into it or expose the port through a tunnel. No browser package is required merely to serve it; Node, existing tsx/esbuild/React dependencies and the existing repository installation are required.

If 3281 is occupied, do not stop another process: set `$env:FILUMIRE_PREVIEW_PORT='3282'` before running the command. Stop only this preview console with Ctrl+C and restart the same command. Memory evidence disappears on restart; this is intentional. Each topic link currently creates a fresh fictional learner, so navigation between links is not a persistent real learner account demonstration. API journey tests separately cover interruption/resumption and retained evidence. Reload the selected link to reset a fictional example. Recovery needs no deletion, checkout reset, database action or deployment.

The source snapshot is `preview-snapshot/manifest.json`, `tracked.patch` and `additions.tar`. It records exact HEAD, branch, working state and source hashes, with the inherited uncommitted lineage preserved. It excludes credentials, dependencies, build caches and official PDF duplicates. To reconstruct, use a separate disposable checkout of that recorded revision, review `tracked.patch`, then extract `additions.tar` inside its `FILUMIRE_CLAUDE` directory. Despite its filename, that bounded delta archive includes exact raw bytes for both modified and added files, preserving Windows line endings; it is not a duplicate project folder. Verify every manifest hash with `node scripts/verify-jhs-preview-snapshot.mjs`; do not apply it over any existing worktree's uncommitted work. Install the lockfile dependencies there if necessary. Original PDF references are recorded in `lineage-manifest.json`; use `FILUMIRE_CCP_SOURCE_ROOT` for a different location when running source tests. Reconstructing from a commit is documentation only: no checkout, commit or merge was performed here.

## Demonstration script

1. Explain the scope: four original subjects in all three JHS grades have representative draft journeys; remaining NaCCA subjects remain in FILUMIRE's curriculum scope for later development.
2. Choose a grade/subject/topic link. Show the displayed explanation and worked example. English register lessons deliberately keep English phrases and require actual English speaking even when instructional support is French.
3. Switch English/French before answering. Complete the two teaching acknowledgements and choose an incorrect practice answer. Show the authored explanation, guided retry and continuation. Switching during retry preserves the original question to preserve assessment identity; it does not translate an outstanding attempt into a new assessment.
4. Complete the guided retry correctly. Show that guided evidence is not independent mastery. Continue to the independent task and its rubric requirements.
5. Submit a clearly labelled fictional/incomplete demonstration response. Show `Awaiting teacher review` and unchanged independent mastery. Do not pretend a written claim proves oral or practical performance. The actual authorised teacher must inspect/hear independent work in a real pilot.
6. Show progress/evidence recording. If demonstrating offline answer queueing, disconnect only after the current question has loaded, answer and reconnect. The browser tests verify synchronisation and preserved question identity. Do not claim the entire Junior High curriculum is cached offline.
7. Show the API journey results for authentic delivery, fictional teacher correction/review, mastery policy, transfer and due retention after 31 simulated days in both languages. Clearly label simulated time and fictional teacher decisions. Full mastery, teacher approval and time travel are not buttons in this browser harness.
8. Repeat representative examples in the other grades/subjects, using the matrix to distinguish authored, technically tested and release-approved. Existing production parent/teacher views are not wired into this isolated fixture account; do not claim a live JHS family dashboard demonstration.

## Validation and limits

The final validation evidence is `preview-validation-final.log`, `representative-journeys.json`, `representative-browser/results.json`, `typescript-final-approved.log`, `production-build-final.log`, `preview-serve-smoke.json` and `preview-source-review/results.json`. `preview-validation-summary.json` aggregates exact counts after completion. Earlier failed diagnostic logs are retained rather than concealed; final results supersede corrected fixture failures.

The browser harness bundles the existing correction panel and pending-submission helper and calls real signed-session learning APIs. It is not the deployed Next.js `/learn` interface. Mobile 390px and desktop 1280px, both languages, wrong answer, correction, retry, offline queue synchronisation and pending review are checked. API fixtures cover independent teacher-reviewed evidence, transfer, interruption and due correct/incorrect retention. Neither fixture decisions nor automated tests approve lesson accuracy or French translation. Full service-worker/cold-start offline JHS delivery, real PostgreSQL persistence, real educator moderation and JHS parent/teacher interface use remain unverified. No production JHS onboarding is enabled.

The earlier Google font loader error occurred in unchanged baseline `next/font` code while parsing a font URL extension. Direct fetch/parser checks returned valid URLs. An instrumented build and subsequent ordinary builds passed without modifying fonts, visuals, dependency files or shared `node_modules`. The original malformed URL was not captured and a cold-cache recurrence has not been ruled out. This is a currently cleared build blocker with unresolved intermittent root cause, not a proven permanent font fix. Preserve the successful local build for rehearsal; first-time rebuilds still require the normal Google font network access. Do not substitute mocked fonts or claim an offline build guarantee.

Pinned source PDFs are unchanged. Literal leading codes were checked on 13 rendered pages for the 14 representative entries, with all four document hashes checked. The existing source-authentication, national assessment-reference, edition and row-specific issues remain open; no missing objective or official assessment rule was invented. Authored rubrics are proposed, not NaCCA-issued rubrics. Educator/French review, approved media for image-based activities, real oral/practical observation and controlled release approval remain required.

Specific source/pedagogy review notes are deliberately unresolved: Basic 7 rounding and Basic 8 place-value indicators specify quantities above a billion although some printed examples are smaller; the drafts follow the indicator range and leave the source examples unchanged. Basic 9 Mathematics calls the indicator “integers” while its exemplars include decimal numbers; both original wording and exemplar expectations are retained. Basic 9 Science uses “molecular formula” across examples that include ionic compounds; the draft distinguishes molecules from ionic formula ratios rather than silently rewriting the official text. Science cover/imprint and body-footer years remain distinct edition evidence. Teacher-approved periodic tables and device images/videos are activity dependencies, not newly bundled or falsely claimed completed media.

Six absent payment suites remain a separate inherited branch dependency and are excluded from this targeted JHS validation. Payment functionality was not changed. Basic 4–6 receives compatibility checks only; the twelve-subject fingerprint regression protects its definitions, bilingual content, mappings and navigation. Other worktrees and production are untouched.

## Next bounded work

Before real learner release, obtain subject/French review for these fourteen drafts, resolve applicable source authenticity/assessment references and complete real teacher/database/offline verification. Then integrate only the reviewed scope into the existing Learner App presentation with authorisation gates. Continue Basic 7 subject batches first, preserving exact IDs and updating the 625-row matrix after each; Basic 8 and 9 follow validated foundations. The representative examples are not a complete prerequisite graph for grade progression.
