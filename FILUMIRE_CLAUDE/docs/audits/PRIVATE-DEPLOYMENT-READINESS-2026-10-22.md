# Private deployment readiness — five reviewers on filumire.com — 2026-10-22

Read-only assessment. No merge, push, configuration, DNS, database or deployment change was made. Voice work is suspended and the voice system is unchanged.

## 1. Repository comparison (completed)

| Ref | Where | Relationship |
|---|---|---|
| `3a4a8663` (consolidated) | `filumire-batch1`, `feat/jhs7-9-development`; local only | **Fast-forward of GitHub `filumire-interface-testing` (`5459e405`)**: parent `29854417`, grandparent `5459e405`. Also contains `filumire-edututor` (`217dc67b`). |
| GitHub `kodjotabi/filumire` | `main` `26d81ef6`, `filumire-interface-testing` `5459e405`, `filumire-edututor` `217dc67b` | `main` is an unrelated two-commit deployment history ("initial", "Trigger deployment"). |
| `ae1e72de` (`filumire-six-corrections-20261013-website`) | Local only: `C:\FILUMIRE\filumire` (plus 635 uncommitted entries) and a branch in batch1. **Never on GitHub.** | 41 commits, 30 Aug → 9 Oct 07:10. |

**`ae1e72de` is superseded for application source.** `3a4a8663`'s line begins with `99e00b2e` (9 Oct 09:54), a declared "source-only snapshot" of that work. All 91 files that now differ were identical to `ae1e72de` at that snapshot and changed only afterwards; 1,164 more files are still identical.

The snapshot deliberately excluded these, which still exist only on `ae1e72de`:
- payment code (`services/payments`, `packages/payments`, migration `0018_payment_attempts`, 10 payment tests);
- `drizzle` migrations `0000–0018` with their schema and meta;
- handoff docs, logs and scratch backups (`_backups/`, `validation-*.log`, `temp-*.mjs`).

No conflict prevents adopting `3a4a8663`. Payments stay out of scope.

**Canonical repository:** GitHub `kodjotabi/filumire`, with `3a4a8663` as the new head of the application line (`filumire-interface-testing` lineage). Keep `ae1e72de` as a preserved archive branch; do not merge it.

## 2. Deployment blockers

| # | Area | Status | Evidence |
|---|---|---|---|
| B1 | **PostgreSQL durability** | **BLOCKER** | Never tested against a real database. Migration readiness for `filumire-preview` is recorded as **NO-GO**: branch isolation, a recovery point and history reconciliation are unverified. 0019–0021 are pending there (`auth_rate_limits` and `teacher_link_codes` missing); 0022–0024 follow. `3a4a8663` cannot build a fresh database by itself: its ledger treats 0000–0018 as a pre-existing baseline. Production's database binding is a write-only secret and its schema is uncertified. |
| B2 | **Access for exactly five reviewers** | **BLOCKER (decision)** | The app has no allowlist or invitations; registration is simply open or closed. Vercel protection is `all_except_custom_domains`, so a custom domain would be **public**. Vercel Authentication on All Deployments restricts access to Vercel team members, so the five reviewers would need to be added (seat and plan implications must be confirmed). |
| B3 | **Existing public exposure** | **Finding** | `https://filumire-learner.vercel.app` serves the **old** production learner build (`f6c8e7d4`) publicly: `/` and `/login` return 200 with no protection wall; newer APIs return 404. |
| B4 | **Basic 7–9 availability** | **Decision** | By your earlier "local rehearsal only" decision, the app refuses it on any Vercel build (`jhs_mode_on_vercel`). For reviewers to see Basic 7–9 online, that decision must change explicitly. Scope: 42/625 journeys; educator and French approval 0. |
| B5 | **Environment and project configuration** | **BLOCKER** | Production needs `FILUMIRE_PERSISTENCE=postgres`, a new `FILUMIRE_AUTH_JWT_SECRET` (≥32 characters), an allowlisted non-owner database role, and `FILUMIRE_ACCOUNT_REGISTRATION` closed. The deploy guard requires `FILUMIRE_APPROVED_PRODUCTION_SHA` and an approved branch, which defaults to `main`, the unrelated history. The Vercel root/install settings are unconfirmed; production Node is 22 versus 24 locally. `learn.filumire.com` isn't attached and doesn't resolve. |
| B6 | **Push equals deploy risk** | **Caution** | The GitHub repository feeds the Vercel project, with a Preview override bound to `filumire-interface-testing`. **Pushing that branch, or possibly any branch, can trigger an automatic deployment.** Check Vercel's Git and ignored-build settings before any push. |
| B7 | **Website** | **Needs setup** | The code is fine: typecheck, 69/69 unit tests, and build plus link check pass with its own dependencies. The consolidated tree lacks `FILUMIRE_WEBSITE/node_modules` (`npm ci` needed). It is a separate Vercel deployment; its "learning ready" and portal links stay off until approved. |
| B8 | **R6 offline test** | **Not a blocker** | A pre-existing test race: the answer and request ID are preserved and evidence is recorded exactly once. Fix the test separately. |

**Completed and passing on `3a4a8663`:**
- TypeScript (root and learner); offline suites 49, 20, 10, 2 and 11 (Basic 4–7), journeys, deploy guard 51, `test:voice` 2.
- Learner production build.
- Browser: Basic 7–9 48, Basic 5 8, Basic 4–6 24, offline 12.
- API isolation probes; website checks.
- Local commit, recovery archive and bundle.

## 3. Recommended next action (each step needs your approval)

1. **Close the existing exposure first (B3):** set the `filumire-learner` project to Vercel Authentication **All Deployments** (protects custom domains too). Configuration only; no deployment.
2. **Choose the reviewer-access model (B2):**
   - **(a)** Vercel Authentication plus the five reviewers as team members, with registration closed and their FILUMIRE accounts created in a short, owner-run window;
   - **(b)** a small, reviewed app-level allowlist of the five reviewer emails at registration.
   Option (b) is a code change.
3. **Database (B1):** complete the recorded `filumire-preview` gates (isolation, recovery point, history). Apply 0019–0024 with the existing pinned, transactional executor. Then run a **durability test** against that isolated branch only: persistence across restart and redeploy, sessions, evidence and grade lock.
4. **Integrate on GitHub (after confirming B6):** push `3a4a8663` to a **new branch**. Leave `main` untouched and don't fast-forward the auto-deploying branch until ready. Archive `ae1e72de` as its own branch.
5. Decide **Basic 7–9 for reviewers (B4)**, then a protected Preview deployment, end-to-end checks, and only then the custom domain.

## 4. Step 1 done — Vercel Authentication on All Deployments (2026-10-23, owner-approved)

`filumire-learner` → Deployment Protection: the Vercel Authentication scope changed from **Standard Protection** to **All Deployments** and was saved. It persisted after a reload.

Everything else is unchanged and was confirmed before and after:
- Require Log In: on. Password and Trusted IPs: off (plan-gated). OPTIONS allowlist: off. Protected sourcemaps: on.
- Automation bypass secret (added 10 October): kept. No protection exceptions.

The cookie banner was declined (non-essential tracking).

**Verification, cookie-less, from outside the browser session:** `https://filumire-learner.vercel.app` `/`, `/login`, `/dashboard` and `/api/learning?dashboard=1` all return **302 to `vercel.com/sso-api`** (Vercel Authentication), with no learner content. `https://filumire.com` (separate website project) still returns 200. **B3 closed.**

Account note: Hobby plan. Reviewer access (B2) still needs a decision: Pro seats, Shareable Links, or an app allowlist.

## 5. PostgreSQL read-only gates G1–G5 (2026-10-23, owner-approved; no writes)

Evidence (catalog metadata only) is in the session scratchpad: `G1-G5-evidence-2026-10-23.json`. Method: Neon console via Vercel SSO, Vercel dashboard pages, and the pinned script `3977f9c8…` run once on `filumire-preview`. Before running, the editor contents were hashed in the page and matched. All 20 statements succeeded, ending in ROLLBACK.

| Gate | Result |
|---|---|
| G1 isolation | **PASS.** Five branches with one compute endpoint each, none shared. `filumire-preview` (`br-round-resonance-b8fm2nao`, `ep-icy-scene-b816974r`) is a child of `main` (`ep-cold-bird-b8j437np`, the default). No branch is protected. |
| G2 Vercel binding | **PASS for isolation, but changed from the records.** The Neon store is **not connected** to `filumire-learner`. Its integration allows Production only. The project has **no `DATABASE_URL` in any environment**, only three Preview variables (`FILUMIRE_ACCOUNT_REGISTRATION`, `FILUMIRE_AUTH_JWT_SECRET`, `FILUMIRE_PERSISTENCE`). |
| G3 recovery | **PARTIAL.** Point-in-time restore covers **6 hours** (Free plan). Snapshots are root branches only (one of `main`, 12 days old). The backup branch `filumire-preview-pre-migration-20261017` holds preview as at 17 Oct 18:45:13 UTC (the pre-migration, case-B state) and never expires. **There is no copy of the current migrated state.** |
| G4 schema | **CHANGED: no longer case B.** The ledger holds 7/7 rows (baseline plus 0019–0024), applied 17 Oct 19:29 UTC by `neondb_owner`, **every hash equal to `MIGRATIONS.json`**. The 0023 column and validated check and the 0024 view are present. **`filumire_app` exists**: login, nothing elevated, 20-connection limit, privileges **exactly** as `app-role-grants.sql` (56, nothing extra). No triggers or policies, no blocking locks, `read_only=on` throughout. |
| G5 production binding | **None.** Production has no database variables, so reviewers' storage is undecided. |

**Discrepancy to resolve:** W3 is documented (`PREVIEW_W4_APP_ROLE_PLAN.md`: "applied 19:29 UTC; ledger 7/7"). But **W4-2/W4-3 (role creation and grants) were executed without an evidence record in the repository.** The branch's last update (22 Oct 19:52 UTC) suggests that window; this is unconfirmed. The result matches the reviewed grants exactly.

**Next blockers (each needs approval):**
1. Record or confirm the W4 execution, and who ran it.
2. Take a fresh backup branch of the current migrated preview (a write).
3. W5 permission test and W6 read-only deploy guard with the `filumire_app` role.
4. Decide where reviewers' data lives (recommended: a dedicated review branch from the migrated preview), then connect it to Vercel (W7).
5. Durability test on that branch.

### 5a. Correction (2026-10-23, later): G2 and G5 were wrong

The dashboard list read for G2/G5 rendered only three variables. The full read-only listing (13 variables, names and targets only) shows:
- **Production** has `DATABASE_URL` (endpoint unverified), persistence and JWT.
- **Preview** deployments of branch `filumire-interface-testing` have `DATABASE_URL` pointing at `filumire-preview` as `filumire_app`, plus host allowlists (set 18 Oct, W7).

The W4 discrepancy is resolved: a separate local Claude session ran W4-2/W4-3, W5 (207/207), W6 and W7 on 18 Oct under owner approval codes; see `W4-PROVENANCE-AND-BACKUP-PROPOSAL-2026-10-23.md`.

New security item: `filumire_app`'s password was sent in plain text at creation, and its rotation was deferred. Rotate it before reviewer data is stored.
