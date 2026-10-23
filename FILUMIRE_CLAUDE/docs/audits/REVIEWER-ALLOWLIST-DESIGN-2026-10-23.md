# Reviewer allow-list — five authorised reviewers (2026-10-23; approved and IMPLEMENTED, uncommitted — see §7)

Code reference: commit `3a4a8663`, worktree `filumire-batch1/FILUMIRE_CLAUDE/.worktrees/jhs7-9-development/FILUMIRE_CLAUDE`.

## 1. Entry points found (all must be gated)

| Path | Today | Under this design |
|---|---|---|
| `POST /api/account/register`: `registerGuardian`, `registerTeacher` (`services/account/index.ts:233`, `:292`) | Gated by `isRegistrationOpen()`: production needs `FILUMIRE_ACCOUNT_REGISTRATION=open` | Allowed **only** for a listed email |
| `POST /api/session/login`: `authenticateWithPassword` (`:579`), the only password sign-in, also used by family access | Any active account | Adults: **only listed emails**. Learners: **only if created by a listed guardian** |
| Phone family access (`services/family-access`) | Already impossible in production or on Vercel (`localFamilyAccessEnabled()` requires mock mode, non-production, no Vercel, memory) | Unchanged. Covered by the sign-in rule anyway |
| `POST /api/session/issue` (external identity) | Fails closed unless `FILUMIRE_EXTERNAL_AUTH_JWKS/ISSUER/AUDIENCE` are set | Unchanged. The deploy guard refuses those variables in reviewer mode |
| Learner creation (`addLearnerForGuardian`) and teacher links | Only by an already signed-in guardian | Unchanged: only listed guardians can sign in |

## 2. Behaviour

**New, server-only settings** (Vercel encrypted environment variables, never in the repository or logs):
- `FILUMIRE_ACCESS_MODE=reviewers`, which switches reviewer access on.
- `FILUMIRE_REVIEWER_EMAILS=a@x.org,b@y.org,…`, a list of **1 to 5** emails, normalised with the existing `normaliseEmail` (trimmed, lower-cased).

**When reviewer mode is on:**
- **Registration:** a guardian or teacher account can be created only for a listed email, **even though general registration stays closed**. Any other email gets the existing generic "New accounts are not open yet." error, so the response never reveals who is on the list.
- **Adult sign-in:** guardians and teachers succeed only if their login email is listed. Otherwise the existing generic invalid-credentials error is returned after the normal password work, so timing and responses don't reveal anything.
- **Learner sign-in:** succeeds only if the learner's `createdByPrincipalId` guardian has a listed email. Otherwise the same generic error.
- **Invalid list** (empty, more than five, malformed or duplicate): **fail closed**. Nobody can register or sign in, and the deploy guard refuses the build (§4).

**Mode off:** behaviour is exactly as today (registration open/closed; sign-in unrestricted). All existing suites must pass unchanged.

**Removing a reviewer:** edit the list and redeploy, so their next sign-in fails. To end active sessions immediately as well, rotate `FILUMIRE_AUTH_JWT_SECRET`, which signs everyone out; reviewers then sign in again.

**Accounts already in the production database** (from earlier builds) cannot sign in unless listed.

## 3. Exact changes (≈120 lines; no schema, migration or UI redesign)

1. **New `services/account/reviewer-access.ts`** (about 45 lines):
   ```ts
   const MAX_REVIEWERS = 5;
   export function reviewerModeActive(): boolean { return process.env.FILUMIRE_ACCESS_MODE === "reviewers"; }
   /** Parsed list, or undefined when invalid (fail closed). */
   export function reviewerEmails(): ReadonlySet<string> | undefined {
     // split on ",", trim, normaliseEmail each (reject on error), reject duplicates, require 1..MAX_REVIEWERS
   }
   export function isReviewerEmail(email: string): boolean { const list = reviewerEmails(); return !!list && list.has(email); }
   /** After a correct password: adults by own login, learners by creating guardian's login. */
   export async function isReviewerPrincipal(principalId: string, accountKind: AccountKind): Promise<boolean>
   ```
   - The learner case reads `listAuthorizedLearnersForPrincipal(principalId)` (`self`), then `accountStore.getLearnerProfile(learnerId).createdByPrincipalId`, then `accountStore.getCredentialByPrincipal(guardian).loginIdentifier`.
   - Two store reads, at sign-in only.
2. **`services/account/index.ts`**:
   - `registerGuardian` and `registerTeacher`: replace `if (!isRegistrationOpen())` with `if (reviewerModeActive() ? !isReviewerEmail(email) : !isRegistrationOpen())`. `normaliseEmail` moves above the check; same error and message.
   - `authenticateWithPassword`: after `verifyPassword` succeeds and before resetting counters, add `if (reviewerModeActive() && !(await isReviewerPrincipal(credential.principalId, credential.accountKind))) throw new InvalidCredentialsError();`.
3. **`scripts/deploy-guard.mjs`**, on Vercel builds with `FILUMIRE_ACCESS_MODE=reviewers`:
   - refuse `reviewer_list_invalid` (0 or more than 5, malformed, duplicates);
   - refuse `reviewer_mode_with_open_registration` (`FILUMIRE_ACCOUNT_REGISTRATION=open`);
   - refuse `reviewer_mode_with_external_identity` (any `FILUMIRE_EXTERNAL_AUTH_*` set);
   - refuse an unknown `FILUMIRE_ACCESS_MODE` value.
4. **Recommended alongside:** `robots: { index: false, follow: false }` in `app/layout.tsx` metadata, so a private review is never search-indexed (pages stay static).
5. **`apps/learner/.env.example`:** document both variables, with the no-real-data warning.

## 4. Tests (new `tests/reviewer-access.test.ts`, in the default offline suite list, plus deploy-guard cases)

- **Parsing:** case and whitespace normalisation, duplicates, 0 and 6 entries, malformed entries, all failing closed.
- **Registration:** a listed guardian and a listed teacher succeed; an unlisted email gets the generic closed message; mode off leaves it unchanged.
- **Sign-in:**
  - a listed adult succeeds; an unlisted adult with the correct password gets the generic invalid-credentials error;
  - a learner of a listed guardian succeeds; a learner of an unlisted (pre-existing) guardian is refused;
  - lockout counting still works.
- **Indistinguishable failures:** an unlisted-but-real account and a non-existent account return identical status and body.
- **Regression:** all existing suites with the mode off (49 + targeted + journeys + browser).
- **Deploy guard:** the four refusals above, plus a valid reviewer production configuration accepted.

## 5. Interaction with Vercel protection (decision needed before deployment)

With **All Deployments** on a Hobby plan, the reviewers cannot pass Vercel's login at all, whatever the app does.

**Option 1:** when the gated build is the production deployment, return the scope to **Standard Protection**. Previews and per-deployment URLs stay behind Vercel's login, while the production domains (`learn.filumire.com` and the production `vercel.app` alias) rely on this allow-list plus closed registration.
- Residual exposure: public static pages (`/`, `/login`, `/register`, offline page, assets) are visible; every learner API and page requires a session.

**Option 2:** Vercel Pro seats (cost), keeping All Deployments.

Until the gated build is deployed, **keep All Deployments**.

## 6. Decisions for you

1. **Roles:** one listed email holds one account (guardian *or* teacher). If a reviewer needs both roles, that uses two of the five places. Alternatively, raise the cap with a role per entry, e.g. `email:guardian`.
2. Confirm Option 1 vs 2 in §5.
3. The reviewers' five emails are given only as Vercel environment values at deployment time, never in chat or the repository.

## 7. Implementation (2026-10-23, owner-approved: five emails, one account and one role each; 3 guardians + 2 teachers)

Implemented uncommitted in `filumire-batch1/.../jhs7-9-development/FILUMIRE_CLAUDE` on top of `3a4a8663`. Backups: `handoff/backup-before-reviewer-allowlist/` (7 files, verified).

**Change from §3:** each list entry carries its role, so the approved split is enforced:
`FILUMIRE_REVIEWER_EMAILS=a@x:guardian,b@x:guardian,c@x:guardian,d@x:teacher,e@x:teacher`.
A listed email may only register and sign in in its listed role. The logic lives in `services/account/index.ts`, next to the existing registration gate, which also avoids a circular import.

**Files changed** (155 insertions, 7 deletions, plus a new 190-line test):
- `services/account/index.ts` (+113): `reviewerModeActive`, `reviewerList`, role-checked registration gate, and the post-password sign-in gate.
- `services/family-access/otp.ts` (+2): family access off in reviewer mode.
- `scripts/deploy-guard.mjs` (+21): `unknown_access_mode`, `reviewer_list_invalid`, `reviewer_mode_with_open_registration`, `reviewer_mode_with_external_identity`.
- `apps/learner/app/layout.tsx` (+2): `noindex, nofollow` only in reviewer mode.
- `apps/learner/.env.example` (+7): documented, with a fictional example.
- `scripts/run-offline-suites.mjs`: `reviewer-access` added to the default suite list.
- `tests/integration-phase1-foundation.test.mjs` (+11): deploy-guard cases.

**Verification:**
- **New `reviewer-access` suite: 9/9 sections.** Parsing; registration by role; refusals byte-identical to "closed"; listed adults and their learners sign in; unlisted accounts (including pre-existing ones with correct passwords) look exactly like a wrong password; listed guardian→teacher linking works; removal, wrong role and empty list refuse; lockout unchanged; family access off; mode off unchanged.
- **Mutation checks:** removing the sign-in gate fails the suite; ignoring roles fails the suite. The source was restored byte-for-byte both times.
- **Deploy guard:** 64/64 checks (13 new).
- TypeScript root and learner pass. Offline suites: default **50/50** (now including `reviewer-access`), 20/20, 10/10, 6/6 (including `test:voice`, family access and phone OTP), 11/11 Basic 4–7, journeys 1/1 (hash unchanged).
- **Normal build:** pass, 10 prerendered routes, no `noindex`. Browser on it: Basic 7–9 48/48, Basic 4–6 24/24, offline 4/4.
- **Reviewer-mode build:** carries `noindex, nofollow`. Live HTTP smoke test **9/9**: listed guardian and teacher register (case-insensitive), unlisted refused (403), wrong role refused identically, learner added and signs in, unknown account identical to a wrong password (401/401).
- The worktree build output was restored to the normal build afterwards.

**Not changed:** Vercel protection (still All Deployments), no push, no deploy, no commit.

**At deployment:** rotate `FILUMIRE_AUTH_JWT_SECRET`, so sessions issued before reviewer mode end. Enter the five real emails only as a Vercel environment value.
