# Registration Preview preparation — NO-GO

Prepared from unchanged application HEAD `a59b9fdf12380bc261f364fbafe1b03d41a02741`. No deployment, migration, Production modification, authentication rewrite or external configuration change performed.

## Source and target verified

- Existing Vercel project `filumire-learner`, ID `prj_jozdDNN1pW1q5Ez66e32RvXhbYwC`, team `team_ZGp9TfdK3M45ks3ViQZ9WgSW`; local project link matches.
- Intended environment Preview, branch `filumire-interface-testing`; application root `FILUMIRE_CLAUDE/apps/learner`.
- Deployment Protection is enabled (`all_except_custom_domains`). Retain protection for private tests; do not open public registration.
- Exact commit package: `.vercel/prepared-registration-a59b9fdf-verified`. All 1,322 tracked files byte-match their Git blobs. Git line-ending conversion was disabled for export. No local env files, generated application output or untracked preparation scripts/reports are included. `.vercel/registration-preview-package.json` records the source, archive hash and target.
- The earlier staging copy `.vercel/prepared-registration-a59b9fdf` failed byte verification because Git export converted line endings. It was preserved but has no completed manifest and must not be deployed. Use only the verified package.
- This prepares a newer source package; it does not change the existing remote deployment or certify its commit. Redeploying the existing old Git revision `f6c8e7d4` is insufficient. After separately authorized deployment, compare the release source/build metadata and served registration page with `a59b9fdf`.

## Remote configuration verified only to available evidence

Authenticated API requests with decryption requested still returned the following as unreadable Sensitive variables. No values were exposed:

| Variable | Confirmed scope | Required effective value | Status |
| --- | --- | --- | --- |
| DATABASE_URL | Preview only, branch filumire-interface-testing override | Connection to neon-champagne-school / filumire-preview | Present; actual target unreadable |
| FILUMIRE_PERSISTENCE | Preview only | postgres | Present; value unreadable |
| FILUMIRE_AUTH_JWT_SECRET | Preview only | Valid private signing value, at least 32 characters | Present; validity unreadable |
| FILUMIRE_ACCOUNT_REGISTRATION | Preview only | open for protected private testing | Present; value unreadable |

The generic DATABASE_URL remains scoped to Production and Preview; this preparation did not change it. The branch override must be selected by any future deployment. The other three Preview variables have no branch filter, so they apply across this project's Preview deployments, not solely this branch. Existing production-built registration defaults closed without an explicit open flag. No registration flag targeted at Production was observed, but this is environment metadata, not a runtime test of Production. Registration being enabled and private protection being retained cannot be certified solely from unreadable variable presence.

## Schema verification blocked

The user confirms Neon resource `neon-champagne-school`, branch `filumire-preview`, and successful Preview DATABASE_URL replacement. The effective connection is unreadable. Existing integration/local FLPREVIEW credentials were previously checked against endpoint `ep-cold-bird-b8j437np`; their mapping to the newly confirmed branch is unverified. They were deliberately not used to claim current branch migration readiness. The older baseline cannot certify the current branch.

Required schema: existing principal/learner/access/session tables; 0019 account, profile and consent definitions; 0020 auth_rate_limits columns/PK/expiry index; 0021 expanded teacher account-kind check and teacher_link_codes columns, PK, unique code hash, three foreign keys and learner index. No migrations were applied. Missing 0020 would prevent PostgreSQL authentication rate-limit checks; missing 0021 would prevent the complete teacher journey.

To finish without sharing credentials: in the existing Neon dashboard SQL Editor select project/resource neon-champagne-school and branch filumire-preview, database neondb, and run `scripts/verify-registration-preview.sql`. It uses BEGIN READ ONLY and metadata SELECTs only, then ROLLBACK. Share only the metadata results and the dashboard's endpoint/branch mapping, not connection strings or application records. Results must be compared with the exact committed migration SQL; table existence alone is insufficient. An absent handwritten migration ledger is not proof that migrations failed or passed.

For settings, confirm through the trusted existing Preview configuration that persistence is postgres, registration is open, and the signing secret is at least 32 characters. Provide booleans only. If the owner cannot inspect the original Secret values, do not invent confirmation or replace secrets as part of this check.

## Disposition

Local package and private Preview variable scopes are verified. Current branch schema, actual runtime variable values and connection identity are not yet verified. Previous passing memory/PostgreSQL tests and application build remain recorded in the existing reports; they do not prove this branch's schema/configuration. No mutation-based registration test was run.

**NO-GO for deployment pending the nonsecret confirmations and read-only schema results above.** Stop before deployment. No deployment approval is requested while prerequisites are unverified.
