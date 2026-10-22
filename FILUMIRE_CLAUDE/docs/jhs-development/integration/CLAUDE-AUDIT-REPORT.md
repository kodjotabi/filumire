# Basic 7–9 (Codex) pre-integration audit — 2026-10-22

Auditor: Claude (independent). The audit itself made no changes. R1–R5 were later applied on the user's instruction (see §7). No commits, merges, pushes or deployments.
Target: `C:\Users\tabi\Documents\Codex\filumire-jhs-integration\FILUMIRE_CLAUDE` (branch `feat/jhs7-9-development`, HEAD `29854417`, uncommitted).
Original: `C:\FILUMIRE\filumire-batch1\FILUMIRE_CLAUDE\.worktrees\jhs7-9-development` (same HEAD, 88 inherited uncommitted changes).
FILUMIRE_CORE was not read (standing rule). Git status shows it unchanged in both trees.

## Verdict

**READY FOR INTEGRATION** as a *gated private-presentation scope* (default off). No critical defects found.
This is not approval to deploy, to treat Basic 7–9 as a curriculum release, or to enable the flag on any hosted target. Five corrections are recommended with integration (R1–R5 below). None blocks a gated merge. R6, the intermittent Basic 4–6 offline test failure, is confirmed to predate Codex's work: an inherited issue to fix separately.
After all audit runs, a re-hash of both trees matched the first inventory exactly. The original worktree still has its 88 uncommitted changes.
**Update (same day):** R1–R5 have been applied in the Codex workspace and the full verification set passes (§7). The verdict stands: READY FOR INTEGRATION, gated and local rehearsal only. Integration itself still awaits approval.

## 1. File inventory — PASS

Independent SHA-256 walk of both FILUMIRE_CLAUDE trees (excluding node_modules, .next, .git, .worktrees):
2,257 original files → 2,322; **65 added, 10 modified, 0 removed**. FILUMIRE_WEBSITE, filumire-investor-demo, .claude and root .gitignore are byte-identical.
Codex's `files-changed.json` lists 73 of these 75. The 2 it omits: `apps/learner/.env.production.local` (git-ignored, fictional values, disclosed in the handover) and `files-changed.json` itself. No undisclosed change found.
No commits, stash or ref changes in either repository (reflogs checked). `node_modules` is a junction to `C:\FILUMIRE\filumire-batch1\FILUMIRE_CLAUDE\node_modules` (shared; no dependency changes found).

| Area | Files |
|---|---|
| Gate / registry | `packages/curriculum/jhs-private-policy.ts`, `jhs-private-manifest.json` (42 rows), `packages/curriculum/index.ts` (+12), `packages/curriculum-framework/index.ts` (3 getters overridden when enabled) |
| Seeding | `services/content-store/jhs-private.ts`, `seed.ts` (+1 call), `apps/learner/instrumentation.ts` |
| Placement | `services/learner-context/placement.ts` (GET options), placement `route.ts` (+GET), `account-client.ts`, `GuardianPlacement.tsx`, `family/page.tsx` (+1 line) |
| Summaries | `adult-summary`, `teacher-summary` (call `seedContent()` per request) |
| Layout / fonts | `layout.tsx` (local fonts, notice, `force-dynamic`), `PrivatePresentationNotice.tsx`, `local-fonts.css`, 11 woff2 + OFL + provenance |
| Tests / scripts | `jhs-private-integration`, `jhs-private-journeys`, `jhs-private.browser.mjs`, `jhs-primary-browser.mjs`, `jhs-integration-audit.mjs`, `start-jhs-private.ps1` |
| Evidence docs | `docs/jhs-development/integration/**` (handover, JSON results, screenshots incl. retained failures) |

Font binaries: all 11 hashes match the original build's `.next/static/media` files (provenance claim verified).

## 2. Area results

| # | Area | Result | Evidence |
|---|---|---|---|
| A | All 12 B7–9 grade/subject combos via real app | PASS | Reproduced `jhs-private.browser.mjs`: **48/48** (12 combos × EN/FR × 390/1280px) on my own fresh build. Manual UI walk: B9 Computing, FR. |
| B | Guardian placement / learner / parent / teacher | PASS | API probes 39/40 (1 = my wrong 201-vs-200 expectation). UI-only placement (no extra PATCH) → learner onboarding shows locked "Basic 9" → dashboard → lesson. |
| C | Teaching, correction, assessment, intervention, retention, transfer, progress | PASS (automated) | Journey suite reproduced, 168/168, byte-identical `journeys.json`. Browser: teach → wrong answer → explanation → guided retry → pending review → teacher decision → parent progress → relogin resume. |
| D | EN/FR, mobile/desktop | PASS with minor defect | FR lesson body `lang="fr"`, notice clears 248px sidebar, no overflow. Minor: placement subject names and topic breadcrumb remain English in FR (R4). |
| E | AuthN, authZ, learner-data isolation | PASS | Placement GET/POST refused for other guardian, unlinked teacher, learner (with valid Origin), other learner, anonymous, cross-site. Adult/teacher summaries 403 cross-learner; teacher code single-use; linked teacher limited to linked learner. Out-of-scope `competencyId`/`subjectId`/`levelId` queries → 404. |
| F | Basic 4–6 unaffected; incomplete JHS inaccessible | PASS with notes (R1, R3; R6 pre-existing) | 625 sources, 42 registered, 583 unregistered. Mode off and `VERCEL_ENV=production`: only Basic 4–6 offered, CCP placement refused, no notice. B4–6 topic counts identical on/off. B4–6 browser regression: see §3. Notes R1, R2. |
| G | Tests, TS, build | PASS | Suites 49/49, 20/20, 10/10, 1/1. `tsc` root + learner exit 0. `next build` exit 0. Server starts on 127.0.0.1. |
| H | Persistence / config / deployment | NOT VERIFIED (disclosed) | Memory only. No PostgreSQL write, restart durability or hosted test. Schema: plain text columns, no curriculum FKs (static check only). |
| I | Claims vs evidence | PASS | All numeric claims reproduced. Discrepancies: §4. |

## 3. Basic 4–6 browser regression

- Interface matrix (12 primary grade/subject combos, mobile EN and desktop FR): **24/24 PASS**.
- Offline cases: **11/12 across three runs.** Run 1 was 3/4, and runs 2 and 3 were each 4/4. The intermittent failure: at 1280px FR, after a language switch, a queued answer's `queuedAt` was rewritten (`…19.265Z` → `…19.279Z`). The response was still saved. Codex reported 4/4 from a single run.
  None of the 75 changed files is in this code path (`sw.js`, `offline.html` and `learn/page.tsx` are inherited changes).
- **Attribution (follow-up run, same day): the failure predates Codex.** The original worktree's own production build (`mjLde_kjtaNiq_69ozjN7`, newer than all its app and service sources) was served from an isolated scratch copy, with memory-only storage and JHS off. The inherited script `audit-basic4-6-offline.browser.mjs` was identical in both trees.

  | Build | Valid runs | Cases | Failures | Where |
  |---|---|---|---|---|
  | Original (pre-Codex) | 10 | 40 | **6** | 1280 FR ×5, 1280 EN ×1 |
  | Codex (JHS on), fresh server | 10 | 40 | 0 | — |
  | Codex, earlier runs in this audit | 3 | 12 | 1 | 1280 FR |

  Every failure is the same assertion ("language changes preserve every queued submission field"). Original runs 11–15 hit the registration rate limit before any case ran: the script reuses one fictional IP range per run. They are excluded.
  Likely mechanism (`learn/page.tsx:716` and `:763-768`, inherited): on submit the answer is queued with `queuedAt`. When the request then fails offline, the same submission (same `clientRequestId`) is written again with a new `queuedAt`. The test can capture the queue between those two writes. Every observed diff was in `queuedAt` only, and the answer was kept. The Codex build's lower rate in this sample does not show a fix; it is timing-dependent.

## 4. Findings

No critical or high findings.

| ID | Sev. | Finding | Required correction |
|---|---|---|---|
| R1 | Medium | `layout.tsx` sets `export const dynamic = 'force-dynamic'` on the **root** layout for all deployments, including mode-off Basic 4–6. Original build prerendered 10 routes (`/`, `/login`, `/dashboard`, `/learn`, `/family`, …); new build prerenders 0. | Render only the notice dynamically (e.g. server component reading the flag inside a dynamic boundary), or accept and document the CDN/cost impact before merge. |
| R2 | Medium | Production gate only checks `VERCEL_ENV`. On any non-Vercel host, or a Vercel Preview with the flag set, drafts are exposed. Re-disabling the flag would leave already-placed learners with a CCP context that no longer resolves. By code reading, the learning API then returns 404 until a guardian re-places them; this was not tested. | Add an explicit allow-list/host check or deploy-guard rule, and define the rollback path for placed learners before any hosted enablement. |
| R3 | Low | `GuardianPlacement` is rendered on every family card even with JHS off, so Basic 4–6 guardians gain a new class/subject form (scope change outside JHS). | Render it only when `isPrivateJhsEnabled()`, or approve it as a primary feature. |
| R4 | Low | FR: subject names in the placement form and the curriculum breadcrumb on `/learn` are English. | Localise names, or record as a known limitation. |
| R5 | Low | `seedContent()` now runs on every adult/teacher summary and placement request: ~33 ms CPU with mode on, ~5 ms off (measured). Test `learner cannot use guardian placement` asserts 400 without an Origin header, so it can pass on the CSRF check alone (behaviour itself verified correct with a valid Origin). BOM now sits on line 2 of `curriculum-framework/index.ts`. | Seed once (instrumentation already does), tighten the test, move the import below the BOM. |
| R6 | Low (pre-existing, not Codex) | Intermittent offline test failure at 1280px (§3). Reproduced on the original pre-Codex build (6/40) and on Codex's (1/52). Cause: `queuedAt` is rewritten on network failure while the test reads the queue. The answer and `clientRequestId` are kept. | Not a Codex integration blocker. Separate inherited fix: write `queuedAt` once, or make the test wait for the settled queue. Also vary the test's IP range so repeated runs avoid the rate limit. |

## 5. Proposed fixes for R1–R5 (not applied)

All are shared-engine changes with no thresholds or tests weakened. All paths are in the Codex workspace's `FILUMIRE_CLAUDE`.

**R1 — restore static pages.** `apps/learner/app/layout.tsx`, `PrivatePresentationNotice.tsx`, new `apps/learner/app/api/presentation-scope/route.ts`.
- Remove `export const dynamic = 'force-dynamic'` and the server-side `isPrivateJhsEnabled()` check from the root layout.
- Add a GET route, `dynamic = 'force-dynamic'` on this route only, returning `{ enabled, authored: PRIVATE_JHS_SCOPE.length, mapped: CCP_SOURCE_REGISTRATIONS.length }`. This also replaces the hard-coded `625`.
- The notice becomes a client component that fetches this route once and renders nothing when disabled or offline. The service worker already never caches `/api/*`, which the offline test asserts.
- Trade-off: the notice appears after hydration rather than in the first HTML, and does not show offline.
- Test: the prerender manifest lists the original 10 routes again. The notice appears with JHS on and is absent with JHS off. Re-run the layout-only browser test (4 cases).

**R2 — fail-closed gate and a rollback path.** `packages/curriculum/jhs-private-policy.ts`, `scripts/deploy-guard.mjs`, learning API, dashboard.
- Gate: off Vercel, unchanged (local rehearsal). On Vercel, enabled only when `VERCEL_ENV === 'preview'` and an explicit `FILUMIRE_JHS_PREVIEW_APPROVED === '1'`; production is never enabled.
- Deploy guard: refuse a Vercel production build when `FILUMIRE_JHS_MODE` is set at all (`jhs_mode_in_production`). Refuse a preview build that sets it without the approval variable.
- Document that non-Vercel hosting of the flag is unsupported.
- Rollback: when a learner's stored context names a curriculum or grade that is no longer available, the learning API returns a specific `409 class_unavailable` instead of a generic 404. The dashboard then shows "Ask your parent or guardian to choose your class." No silent migration and no evidence rewrite, consistent with the placement contract.
- Tests: deploy-guard cases for both refusals. A memory test where a learner is placed with JHS on, the flag is turned off, and the result must be `class_unavailable`, unchanged evidence, then a successful guardian return to Basic 4–6.

**R3 — show placement only where it applies.** `GuardianPlacement.tsx`.
- Render the form only when the choices include a draft (JHS) grade, or when the learner's current context is not among the choices (the rollback case above).
- With JHS off, Basic 4–6 family cards then look exactly as before.
- Test: family page with JHS off has no "Class and subject" section. The JHS-on browser test is unchanged.

**R4 — French subject names.** `GuardianPlacement.tsx`.
- Label options through the existing `subjectLabel()` (`components/filumire/subjects.ts`), keyed by discipline: the CCP subject id suffix `english|mathematics|science|computing`. The display name "English Language" is not in that map today. Grade names are already identical in both languages.
- Breadcrumb: strand and sub-strand titles come from the English-only official source and are already tagged `lang="en"`. This is inherited behaviour, so I propose recording it as a known limitation rather than translating official titles.
- Test: French family page shows Anglais / Mathématiques / Informatique / Sciences.

**R5 — hygiene.**
- *Seeding cost:* per-call `seedContent()` is an existing project idiom (learning, revision, closure, tutoring). The added cost is the fingerprint re-verification. Memoise it in `seedPrivateJhsContent()`: verify all 42 once per module instance, set a flag only after a fully successful pass, and afterwards only re-register and re-save. Keep the per-call sites, because Next bundles routes separately and instrumentation alone may not seed every route instance. The existing fingerprint-mismatch test still applies, since mutation happens before the first successful seed.
- *Weak test:* in `tests/jhs-private.browser.mjs`, send the learner's placement attempt with a valid `origin` header and assert the guardian-relationship error, so it can no longer pass on the CSRF check alone.
- *BOM:* in `packages/curriculum-framework/index.ts`, delete the stray U+FEFF at the start of line 2.
- Test: `jhs-private-integration` and `tsc`. A timing check should show repeat `seedContent()` with JHS on close to the ~5 ms with it off.

**After all five:** run the full offline suites, both TypeScript checks, the production build, the 48-case JHS browser matrix, the 24 Basic 4–6 journeys, and the offline cases.

**Open decisions for you:**
- (a) Who applies the fixes and where: the Codex workspace is outside this session's standing work boundary.
- (b) R2: is a Vercel *preview* presentation wanted at all, or local rehearsal only? Local-only is simpler: refuse on any Vercel build.
- (c) R1: is a notice that appears after hydration acceptable?

## 6. Unverified claims and outstanding risks

- Durable PostgreSQL behaviour, migrations and restart durability: not tested (Codex disclosed).
- Hosting protection of a private presentation (who can reach it) is undefined.
- Practical/oral activities were reviewed with fictional responses only. No educator or French-language approval exists (0/42).
- Coverage: 11 of 12 combos have **1** topic each; B7 Science has 31. The "42/625" notice is accurate.
- Offline cold-start delivery of JHS content is not established.
- Audit side effects: rebuilt the ignored `apps/learner/.next`. Reran `jhs-private-journeys`, which rewrote `journeys.json` to an identical hash. Browser evidence went to the scratchpad. The memory server on 127.0.0.1:3291 used fictional accounts only.

## 7. Fixes applied (2026-10-22, on instruction)

Decisions given: **local rehearsal only** (refuse the setting on any Vercel build); a notice that appears after page load is acceptable.
Applied in `C:\Users\tabi\Documents\Codex\filumire-jhs-integration\FILUMIRE_CLAUDE`, uncommitted.
Backups: `handoff/backup-before-jhs-audit-fixes/` holds 14 `.bak` files and `SHA256SUMS`, following the project's `backup-before-<name>` convention.

| ID | Change | Files (+/- lines) |
|---|---|---|
| R1 | Root `force-dynamic` removed. The notice is a client component reading the new `GET /api/presentation-scope` (`{enabled, authored, mapped}`; 625 no longer hard-coded). | `layout.tsx` (+2/-7), `PrivatePresentationNotice.tsx` (+16/-1), new `api/presentation-scope/route.ts` (15) |
| R2 | `isPrivateJhsEnabled()` is false whenever `VERCEL` or `VERCEL_ENV` is set. Deploy guard refuses any Vercel build with `FILUMIRE_JHS_MODE` (`jhs_mode_on_vercel`). A stored class that is no longer offered now gets `409 class_unavailable` from the learning API (dashboard, lesson and submission paths), with no migration or evidence rewrite. The dashboard shows a localized "ask your parent or guardian" message. | `jhs-private-policy.ts` (+4/-2), `deploy-guard.mjs` (+3/-1), `api/learning/route.ts` (+31), `learner-interface.ts` (+11), `learning-client.ts` (+4/-1), `dashboard/page.tsx` (+6/-1) |
| R3 | The placement form renders only when a draft (Basic 7–9) class is offered, or when the stored class is no longer offered; in that case it starts on the first offered class. | `GuardianPlacement.tsx` |
| R4 | French subject names via the shared `subjectLabel()`. The breadcrumb's official English strand titles are recorded as a known limitation (they carry `lang="en"`). | `GuardianPlacement.tsx` (+22/-6 with R3) |
| R5 | The 42-journey integrity check is memoised per module after a fully successful pass (repeat seed with JHS on: ~33 → 4.8 ms). The browser test's learner refusal now sends a valid Origin and asserts the guardian error. The browser test waits for the post-load notice. The stray BOM is removed. | `jhs-private.ts` (+14/-2), `jhs-private.browser.mjs` (+5/-1), `curriculum-framework/index.ts` (+1/-1) |
| Tests | Vercel refusal cases (production, preview, `VERCEL=1`) and an in-process guardian rollback in `jhs-private-integration`. Four deploy-guard cases. New route-level `jhs-private-rollback` suite: a learner on, then off, gets 409 with context and evidence unchanged, then is returned to Basic 5. | `jhs-private-integration.test.ts` (+27/-6), `integration-phase1-foundation.test.mjs` (+5), new `jhs-private-rollback.test.ts` (117) |

**Verification after fixes**
- Offline suites 49/49, 20/20, 10/10, 1/1 (`learner-interface-copy`), 1/1 (journeys; `journeys.json` hash unchanged), `jhs-private-rollback` 1/1.
- Deploy-guard foundation: 51 checks.
- `tsc` root and learner: exit 0.
- `next build`: exit 0. The prerender manifest again lists the original 10 routes.
- Browser: Basic 7–9 48/48; Basic 4–6 24/24; offline 12/12 over 3 runs.
- API probes: enabled 39/40 and disabled 29/30. In both, the single miss is the auditor's 201-vs-200 expectation, as before.
- Manual UI: French placement shows Anglais / Mathématiques / Informatique / Sciences, and the notice appears after load. With JHS off, the family card has no placement form and no notice, and `/api/presentation-scope` returns `{enabled:false}`.

**Limits:** the rollback tests' learners had no recorded evidence, so "evidence unchanged" is checked on an empty set. Database durability and hosted access remain unverified (§6). R6, the inherited offline-test race, is unchanged.

## 8. Integration executed (2026-10-22, on approval)

Executed per `JHS-B7-9-INTEGRATION-PLAN-2026-10-22.md` into the **original** worktree `C:\FILUMIRE\filumire-batch1\FILUMIRE_CLAUDE\.worktrees\jhs7-9-development`. The changes are uncommitted: nothing staged, HEAD still `29854417`.

1. **Freeze check:** all 2,257 original files matched Codex's capture baseline hash-for-hash. Worktree status counts were 89 / 54 / 33 / 88.
2. **Manifest:** exactly as planned. 16 modified, 66 added; 16 excluded (`apps/learner/.env.production.local` and the Codex-side fix backups).
3. **Backups:** `FILUMIRE_CLAUDE/handoff/backup-before-jhs-integration/` holds 16 `.bak` files (0 mismatches against the originals), `SHA256SUMS`, `MODIFIED-FILES.txt` and `ADDED-FILES.txt`, the rollback deletion list of 73 paths.
4. **Copy:** 82 files, 0 hash mismatches. Added on top: this report as `docs/jhs-development/integration/CLAUDE-AUDIT-REPORT.md`, and 5 post-fix result files under `docs/jhs-development/integration/post-fix/`.
5. **Tree check:** no content differences from the Codex workspace. One-sided files are only the planned exclusions and additions; this was unchanged again at the end.
6. **Verification in the original:**
   - `tsc` root and learner: pass.
   - Suites: 49/49, 20/20, 10/10, 2/2 (`learner-interface-copy`, `jhs-private-rollback`), journeys 1/1 (`journeys.json` hash `05689ccd…` unchanged), deploy-guard foundation 51.
   - Build: exit 0, build id `04UP-HfAzo2_YAxMS_Kim`, 10 prerendered routes, `/api/presentation-scope` the only dynamic one.
   - Browser: Basic 7–9 48/48; Basic 4–6 24/24; offline 12/12 over 3 runs.
   - API probes: on 39/40, off 29/30; the miss is the known auditor 201-vs-200 expectation.
   - Manual: French family page correct, notice shown when on. With JHS off, no notice, no placement form, and the scope endpoint returns `{enabled:false}`.
7. **Final:** sibling worktrees unchanged (89 / 54 / 33). The integration worktree now shows 116 status entries; `git status` folds new directories. All servers stopped.

**Deviations, both disclosed:**
- **Build environment.** The first build failed with `DATABASE_URL is required` because the excluded `.env.production.local` had supplied memory-only settings. I rebuilt with those settings as process environment variables only: `FILUMIRE_PERSISTENCE=memory`, an unreachable `DATABASE_URL`, a random fictional JWT secret, and **no** `FILUMIRE_JHS_MODE`. No file was written. Any local build of this worktree needs the same variables, or a real database configuration.
- **Old build output.** The failed build cleared the original's previous ignored `.next` output (pre-Codex build `mjLde_kjtaNiq_69ozjN7`). A copy survives in this session's scratchpad (`origcopy`). The new build replaced it.
- **Tooling paths.** The original has no `node_modules` of its own, so `tsc` and `next` were run by absolute path from `filumire-batch1/FILUMIRE_CLAUDE/node_modules`. `scripts/start-jhs-private.ps1` (relative `node_modules` path) would not start from this worktree as-is; the servers were started with the same environment directly.

**Rollback:** restore the 16 `.bak` files from `handoff/backup-before-jhs-integration/` (check `SHA256SUMS`) and delete the paths in `ADDED-FILES.txt`.

**Next (yours):**
- Commit on `feat/jhs7-9-development`.
- Reconcile the sibling worktrees later (overlapping files listed in the plan).
- No push or deployment.
