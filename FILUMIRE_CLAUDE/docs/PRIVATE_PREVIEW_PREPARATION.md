# Private Preview preparation from a59b9fdf

> Superseded for migration authorization by `PRIVATE_PREVIEW_MIGRATION_READINESS.md`: **NO-GO**. Migration execution is disabled pending production-isolation, recovery and history safeguards. Do not execute the earlier apply command below.

## Confirmed targets

- Vercel: `filumire-learner`, project `prj_jozdDNN1pW1q5Ez66e32RvXhbYwC`, team `team_ZGp9TfdK3M45ks3ViQZ9WgSW`.
- Root: `FILUMIRE_CLAUDE/apps/learner`; installation: `cd ../.. && npm ci`; Node 22.x.
- Protection: SSO enabled, `all_except_custom_domains`. No protection settings changed.
- Neon Preview integration: project `proud-term-61114809`, endpoint `ep-cold-bird-b8j437np`, database `neondb`, non-superuser `neondb_owner`. Connection verified read-only from the project's Preview-only `FLPREVIEW_*` integration variables.
- Test database: `localhost:5432/filumire_test`, non-superuser `filumire_test_user`. Both 0020/0021 schema checks pass here.

The generic Vercel DATABASE_URL was shared between Production and Preview and is stored as an unreadable Secret. It was not modified. A new Preview-only override for `filumire-interface-testing` now uses the verified Neon Preview integration connection. No GitHub branch was changed. The approved deployment must use this branch's Preview configuration, never `--prod` or promotion.

## Validation

Seven PostgreSQL integration suites passed on the designated local test database: account registration/onboarding/passwords, teacher links/cancellation/concurrent claims, shared rate limiting, principal sessions, learner and parent progress, French lessons/language preservation, and persisted logout/returning sessions. The runner refuses other endpoints, database names or roles.

The French parent-summary language suite explicitly requires memory persistence and is excluded from the PostgreSQL runner; its prior memory validation remains applicable. Existing production build validation at a59b9fdf passed. No application code has changed in this preparation phase.

## Approval required: missing Preview migrations

Read-only Preview inventory: 3 learners, 5 principals, 5 account credentials, 6 evidence records. Both `auth_rate_limits` and `teacher_link_codes` are absent; account-kind constraint allows guardian/learner only. 0019 prerequisites exist. Both 0020 and 0021 are missing.

The prepared runner defaults to read-only planning. After explicit user approval, `--apply` runs only absent migrations in one transaction, checks the exact verified Neon target, uses short lock/statement timeouts, and compares protected record counts before commit. It does not seed, reset or delete records.

From the repository root:

```powershell
node --env-file=.vercel/.env.preview.private.local FILUMIRE_CLAUDE/scripts/private-preview-migrations.mjs
# Only after explicit approval:
node --env-file=.vercel/.env.preview.private.local FILUMIRE_CLAUDE/scripts/private-preview-migrations.mjs --apply
```

After migration, verify columns, constraints and indexes again with the Section 7 readiness checker using the Preview integration connection (not the shared generic value).

## Deployment and browser checks still pending

No deployment has been made. Obtain separate approval for a new Preview deployment of the committed application after migration readiness passes. Keep SSO protection; do not promote or alter public domains. Preserve existing registration policy; any registration test must stay behind protection.

No browser is connected in this session, so interactive online smoke tests and mobile sharing have not been performed. After deployment, test guardian registration/add learner, learner onboarding/lessons, French, parent progress, teacher linking/cancellation/revocation, logout and returning sessions. Provide the resulting Preview URL plus a Vercel private sharing/mobile link only after creation and verification; never publish an automation token as a share link.

Public site, production database and GitHub branches were not changed. No services purchased. Environment files are ignored and no secret values appear in this document.
