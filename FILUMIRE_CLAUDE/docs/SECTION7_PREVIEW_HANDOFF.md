# Section 7 protected preview handoff

Continues `5d2e153d`. French parent summaries and language switching remain intact.

## Completed

- Guardians can cancel all unused invitations for their learner, including an invitation created on another device. This does not remove linked teachers. Cancellation is idempotent; other guardians, teachers and signed-out users cannot cancel it.
- Simultaneous invitation redemption is single-use in memory as well as Postgres. Postgres replacement/cancellation serialize on the learner row with `FOR NO KEY UPDATE`, allowing the foreign-key checks made by redemption to proceed.
- Parent teacher-access panels offer a retry after failed loading, with English and French invitation controls and feedback.
- Failed logout leaves the account visible and reports the error in learner, parent and teacher screens. Successful logout or an already-expired session clears device details. Expired-session logout also clears both server cookies.
- Teacher login is included in the browser client's account-kind contract.
- Shared Postgres test cleanup includes teacher invitation rows.

## Validation

From `FILUMIRE_CLAUDE`:

```powershell
npm run test:section7
npm run build:learner
```

Twenty suites passed with memory persistence forced before module imports. Coverage includes registration/onboarding, learner sessions, password management, teacher linking/revocation/cancellation/concurrent redemption, parent and teacher APIs, language selection, grade selection, assessment/identity security, and adaptive progression. The identity suite's direct Postgres learner-table assertion is skipped in memory mode. No application database records were changed. Production compilation, type checking and generation of all 31 pages passed.

## Migration and configuration readiness

The read-only checker prints booleans and schema checks, never connection strings or secrets:

```powershell
node --env-file=<approved-preview-environment-file> scripts/check-section7-readiness.mjs
```

The file must supply `DATABASE_URL`, `FILUMIRE_PERSISTENCE=postgres` and `FILUMIRE_AUTH_JWT_SECRET` (32+ characters). `FILUMIRE_ACCOUNT_REGISTRATION=open` is needed only when explicitly opening test registration. Closed registration is a supported default, not a failed schema check.

Local checks are **not ready / target unverified**: `.env.preview-accounts.local` has none of the required database/auth configuration; `.env.local` supplies a database URL but authentication is rejected (`28P01`), and persistence/auth-secret checks fail. This does not establish the remote Preview's configuration. Use valid approved target credentials to verify it.

After explicit migration approval, the existing hand-written SQL must be applied in order, using a transaction-capable SQL connection:

1. Verify `0019_learner_accounts.sql` prerequisites already exist.
2. Apply `0020_auth_rate_limits.sql` (new shared limiter table/index).
3. Apply `0021_teacher_accounts.sql` (teacher account-kind check and invitation table/index/FKs). Execute the full file in one transaction so a failure cannot leave the account-kind constraint removed.
4. Run the read-only checker again; all schema/configuration checks must pass.

These changes need no additional migration. There is no Drizzle migration journal in this project; do not assume `drizzle-kit migrate` has registered these hand-written files or use schema push as a substitute. Both SQL files preserve existing learner and curriculum records.

## Release steps still outstanding

- Verify/apply `0020` and `0021` against the intended database after explicit approval. Postgres concurrency and persistence integration tests still need a dedicated test database with those migrations; never point fixture tests or limiter resets at Neon application records.
- Verify the intended Vercel project is `filumire-learner` (existing root `.vercel/project.json`) and its root is `FILUMIRE_CLAUDE/apps/learner`, with workspace dependency installation. Confirm Preview-scoped database/auth settings and retain deployment protection.
- Deploy this local commit only after explicit approval, then run a protected-browser smoke test for guardian registration/add learner, learner onboarding/learning, teacher registration/code linking, guardian cancellation/revocation, both languages and shared-device logout.
- The consent notice is explicitly marked draft in the account service. Public registration needs its existing consent/privacy review; this work does not open registration or introduce email-based adult account recovery.

No GitHub push, Neon migration, deployment or purchase was performed. The pre-existing untracked root `.claude/` directory is excluded from the local commit.
