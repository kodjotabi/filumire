# Grade setup and navigation browser validation

17 October 2026. Checkout `FILUMIRE_CLAUDE`, branch
`dev/local-filumire-dev-db`. Current uncommitted H1/H2, session-issuance and
navigation work was included and preserved. No additional Claude audit requested.

## Environment and isolation

The configured in-app Browser reported no available browsers (discovery returned
`[]`). Tests instead use the already-installed Playwright and Chromium headless
shell referenced by existing repository browser runners. Nothing was installed.
This is actual rendered-page/browser testing, not an inference from unit tests.

The original validation created a separate source snapshot under
`.vercel/grade-navigation-2026-10-17/source`, built it with the existing Node 22
runtime and served it only at `127.0.0.1:3217`. The original `.next` output and any
existing development server are untouched. The snapshot excludes `.env*` files;
the child environment is allowlisted and forces memory persistence. PostgreSQL
Pool/Client query/connect methods are blocked by a process preload. The dummy
database URL cannot reach a real server. The browser rejects external requests,
and direct link checks permit only the loopback application with redirects disabled.

The original run used cached Montserrat/Kalam font bytes. The portable runner now
uses licensed repository fixtures through Next's font test-response mechanism;
no generated build, font download or font substitution is needed. The only test-only
Next config adjustment is restricting build tracing to the snapshot. Source files
are otherwise copied unchanged. Service workers are disabled for test isolation.

The browser matrix uses fresh contexts and fictional guardian, learner and teacher
accounts for EN (`en-GB`) and FR (`fr-FR`) at 320, 390, 768 and 1280px. Heights are
844px, except the 768px tablet case at 1024px. These are desktop Chromium viewport
tests, not physical mobile-device or virtual-keyboard tests.

## Browser journeys and assertions

- Sign-in page → guardian registration → family page → create one Basic 5 learner
  and one learner with “Choose later”. Actual form controls are used.
- Family → parent progress → Family tab → parent progress; guardian email sign-in
  returns to Family, and sign-out revokes the session. A signed-out Family visit
  retains `lang` and `returnTo=family` on the login redirect.
- Learner username sign-in → required setup. Guardian-chosen Basic 5 is preselected
  and read-only, and first-time setup has no misleading navigation highlight.
- Direct progress navigation cannot skip onboarding. Ask FILU retains its requested
  destination through setup. Live EN/FR switching updates the URL and interface.
- Separate explicit same-origin API probes from the browser attempt a different
  grade and onboarding completion. Both before and after setup, the server refuses
  them with `invalid_grade`, profile/onboarding data stay unchanged, and the
  overview still reports Basic 5 with guardian attribution. These probes complement
  the UI journey; they are not described as UI actions.
- Dashboard → Continue Learning → actual diagnostic, learning/progress/challenges
  views, profile, refresh and sign-out. Active navigation states and locale persist.
- “Choose later” requires a class, allows Basic 6, saves it without a guardian lock,
  and skips setup after refresh and a new sign-in.
- Teacher registration/sign-in opens the teacher workspace even with a Family
  return hint. A teacher visiting Family is redirected back to the workspace.
  Parent-only tabs stay absent. A simulated logout 503 keeps the session active and
  shows a retry message; retry signs out successfully. Signed-out views show no
  authenticated sign-out controls.
- For visited screens: real Chromium accessibility-tree names, screenshots,
  horizontal extent, header overlap/clipping, avatar containment/touch width,
  heading/note separation, internal-link HTTP status, console, page exceptions,
  failed requests and blocked external requests are collected.

## Defects reproduced and corrected

1. **Narrow learner setup:** at 320px the page was 322px wide; fixed-width avatar
   buttons cut off the fourth avatar, and the no-wrap heading overlapped the note.
   Avatar buttons now fit four flexible columns on phones; the heading wraps and
   the decorative note stays inside the content. Browser assertions cover all three.
2. **Extracted grade field lost scoped styles:** `SetupClassField` renders outside
   the parent's styled-JSX class scope. Label/input/help selectors now reach that
   child while staying scoped under setup. Class controls and the name-clear target
   have 44px minimum height, and grade-help copy uses 12px text.
3. **French adult header:** at 320px the parent page was 357px wide and clipped
   “Se déconnecter”. Parent/teacher header actions can wrap, and narrow headers use
   rows. The sign-out button retains a 44px minimum target height.
4. **French Family redirect:** visiting `/family?lang=fr` while signed out went to
   `/login?lang=en&returnTo=family`. The mount-time callback captured the initial
   English hook state. Redirects now read the current URL/device language after
   fetching the account, including wrong-role redirects.
5. **Ambiguous parent chooser:** the parent progress page showed generic
   “Learner 1/2” labels despite having the authorized account profiles. It now uses
   their saved display names, retaining the existing fallback when unavailable.
   The browser selects both fictional learners and verifies the selected state
   and rendered progress view. No additional profile or permission lookup is added.

The historical first-radio accessible-name report is tested through Chromium's
accessibility tree on the diagnostic, rather than inferred from markup. No guessed
radio-label change was made. Browser-harness timing/selector failures during
development were corrected separately and are not counted as application defects.

## Final results

**PASS for the local Chromium matrix.** Browser version: 151.0.7922.34.
Each row completed 26 checkpoints, including 20 screenshot/layout/accessibility
checks and 38 local-link HTTP checks: 208 checkpoints, 160 captured screens and
304 link checks in total. These are executions, not a count of unique features.

| Viewport | English | French |
| --- | --- | --- |
| 320 × 844 | PASS | PASS |
| 390 × 844 | PASS | PASS |
| 768 × 1024 | PASS | PASS |
| 1280 × 844 | PASS | PASS |

Final runs recorded zero unhandled page exceptions, unexpected console messages,
unexpected HTTP errors, failed network transports, blocked external requests,
unnamed controls in the tested accessibility roles, horizontal overflow or clipped/
overlapping header controls. All checked local links returned non-error responses.
Long subject labels wrap inside compact cards; no clipping/overflow is hidden.

Expected negative-path HTTP/console errors were kept in the evidence: 80 × 401
(72 session lookups and eight signed-out teacher summaries), 16 × 400 (rejected
grade changes), and eight simulated logout 503s. There were also 184 warnings
that Playwright blocked service-worker registration. These are deliberately
classified test conditions, not silently dropped application failures.

Other checks passed: full memory-backed `npm test` (including H1/H2 and issuance
rate limits), setup navigation, adult navigation/sign-out, interface render/layout,
grade-aware subject selection, root TypeScript with no emit/incremental cache,
six-entry migration-manifest verification, whitespace checks, and the final
isolated Next.js 15.5.23 production build. The existing PostgreSQL-only assertion
in the identity suite was skipped. Standalone SSR emits its existing styled-JSX
attribute warning; the actual browser and final build did not emit that warning.

Application files changed in this assignment: `apps/learner/app/dashboard/page.tsx`,
`family/page.tsx`, `adult/page.tsx`, and `globals.css`. Added the isolated runner,
browser regression suite, this report and the optional package command; updated
the local next-steps document. Prior changes in those files and elsewhere remain.

## Evidence and rerun

The ignored artifact folder `.vercel/grade-navigation-2026-10-17/` retains
`browser-environment.json`, `isolation.json` (including font hashes), `build.log`,
`server.log`, `browser.log`, `results.json`, and full-page screenshots named by
width/language/stage. Before-fix results and screenshots are preserved separately.
The browser regression file is `tests/grade-navigation.browser.mjs`; its runner is
`scripts/grade-navigation-browser.mjs`.

Rerun with `node tests/grade-navigation-runner.test.mjs` followed by
`npm run test:grade-navigation:browser`. Each invocation builds a fresh source
snapshot and allocates a unique evidence directory; existing output paths are
refused. The old `--test-only` mode is rejected to prevent stale snapshot reuse.
See [portable runner instructions](BROWSER_RUNNER_PORTABILITY.md) for installed
dependency discovery, explicit overrides, offline font fixtures, configurable
output/port, safety regression checks and deployment-permission recommendations.
Historical evidence above remains preserved.

## Boundaries

No Neon/live PostgreSQL, migration, real account/data, external site, deployment,
commit or push was used. The runner closes its browser and stops its own server.
H1/H2 deployment checks and their approval requirements remain in force.

Physical Android/iOS, Safari/Firefox, real screen-reader output, virtual keyboard,
200% text resizing, audible voice, service-worker/offline behavior and hosted
PostgreSQL compatibility remain unverified. French navigation is tested; complete
curriculum translation is not claimed. The external public website links are not
visited. Teacher workspace navigation is covered with an unlinked teacher;
linked-teacher workflows remain covered by existing service tests, not this browser
matrix. Passing this local matrix is not production-release approval.

## Portability follow-up validation — 17 October 2026

The portable runner passed two fresh production-build/browser runs on Windows,
using current Node 24.19.0 and existing Chromium 151.0.7922.34. Playwright resolved
through operator-supplied `NODE_PATH`; an explicit existing Chromium executable
override was needed because that Playwright package's expected managed browser
revision was absent. The missing-revision preflight failed clearly; nothing was
installed or downloaded. No installation paths are embedded in the updated runner.

Both runs passed all eight EN/FR journeys at 320/390/768/1280px, each recording
208 checkpoints, 160 screenshots and 304 local link checks. There were zero
unexpected HTTP/console errors, page exceptions, failed transports, external
requests or unnamed controls. The final run exercised configurable output and
port 3218, including the completed server-readiness safeguard. Both servers stopped.

New ignored evidence directories:

- `.vercel/grade-navigation-Fo8XH1/` (default unique output, port 3217).
- `.vercel/grade-navigation-portable-3819325c89354dc3975980239074b483/`
  (explicit new output, port 3218; final runner).

The original `.vercel/grade-navigation-2026-10-17/` remained byte-for-byte unchanged:
1,814 files (dependency junction excluded), aggregate SHA-256
`aba30d2d8649fb2734d8330742d9ff463247e231c98ce29f8e38684deed851a0`.
Regression checks also verify refusal of existing output directories/evidence.

Passed: portable-runner dependency/resolution/output/network-target/font/PG-blocker
regressions; standard memory-backed `npm test`; adult navigation/sign-out and setup
navigation tests; root TypeScript with no emit/incremental cache; six-entry migration
verification; whitespace checks; both isolated Next production builds. The standard
suite still skips its existing PostgreSQL-only identity assertion. No database,
permission, credential, deployment or application-source changes were made in this
follow-up. Deployment verification under the application role remains blocked by
its intentional ledger denial; the linked portability document recommends a
separate least-privilege verifier without implementing that infrastructure change.
