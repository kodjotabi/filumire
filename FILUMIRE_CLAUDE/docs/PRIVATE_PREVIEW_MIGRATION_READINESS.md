# NO-GO MIGRATION READINESS REPORT

## Referenced ID types confirmed — next gate: isolation

The user directly verified in Neon SQL Editor on `filumire-preview` that `public.learners.id` and `public.principals.id` are both `text`. Together with the previously reported validated keys/foreign keys, these findings satisfy the referenced-key type compatibility check for 0021's three text foreign keys. The earlier request for these types is resolved and should not be repeated.

**Next outstanding check: branch isolation.** Confirm the Neon branch IDs and endpoint mappings for `filumire-preview` and main, then map Production's effective database endpoint/database to its Neon project and branch. Preview must not share Production/main writable storage or Production's recovery branch. Supply only nonsecret identifiers, never connection strings or credentials. Isolation is still unverified; no migrations or Production changes were performed.

## Latest owner-supplied column comparison

The user reports 35 columns returned on `filumire-preview`, including text IDs/principal IDs in account_credentials/account_profiles, text learner/creator/sign-in principal IDs in learner_profiles (sign-in principal nullable), text guardian principal IDs and nullable text learner IDs in guardian_consent_records, and text account_credentials.account_kind. These supplied findings match the relevant existing account schema. The text account-kind column is compatible with 0021's widened CHECK; the previously verified guardian/learner rule accepts existing values under the new guardian/learner/teacher rule. 0020 creates a new standalone table and has no existing-column foreign-key dependencies. Neither migration changes these reported existing column types or nullability.

0021's three new text foreign-key columns reference `public.learners.id` and `public.principals.id`. Those two referenced columns were not included in the supplied column findings (the verification query targets the account tables, not learners/principals). The already confirmed keys/constraints do not need repeating. **Next outstanding check only: confirm the data types of learners.id and principals.id are text on filumire-preview.** Their types must not be inferred solely from similarly named account foreign-key columns. Other previously documented isolation/recovery/history gates remain open; no migration readiness flag is set. No migrations or Production changes were performed.

## Latest owner-supplied constraint evidence

The user reports read-only verification on `filumire-preview`: all 42 reported constraints have `convalidated=true`; existing primary keys, unique constraints and foreign keys are present and validated. The account-kind constraint is exactly:

```sql
CHECK ((account_kind = ANY (ARRAY['guardian'::text, 'learner'::text])))
```

This matches the expected pre-0021 guardian/learner rule. Together with the reported absence of `auth_rate_limits` and `teacher_link_codes`, it supports applying 0020 and widening the existing check as part of 0021. No further confirmation of this check or the reported constraint-validation status is needed. Evidence is owner-supplied, not a new agent database inspection. It does not itself establish column types, branch identity/isolation, recovery availability or authoritative migration chronology. No verified flags were set for those unresolved facts.

Remaining checks before migration approval:

1. Review the existing column-definition results for account prerequisites, particularly `account_credentials.account_kind` and the text ID/key types of `learners.id` and `principals.id`. Confirm the reported missing tables have no conflicting migration index names elsewhere in public schema. Use the metadata results already collected rather than repeating completed constraint checks.
2. Establish endpoint-to-branch mappings and branch IDs for Preview and main; confirm Production's effective project/branch/database. Preview must be distinct from Production/main writable storage and Production's recovery branch.
3. Verify an existing usable recovery point for that exact Preview branch, source/status/reference, applicable retention or expiry, and authorized restore operator/procedure. If absent, creation needs separate approval; transaction rollback is not a substitute.
4. Review the migration-history result and reconcile the intentionally handwritten migrations with the observed pre-0020/0021 schema. Immediately before any later authorized execution, recheck target identity, schema drift and concurrent migration/lock activity, and confirm the exact transactional execution plan with 5-second lock and 30-second statement timeouts. The current runner is read-only and disabled for execution; an executor must not be enabled against an unverified target.

**NOT READY pending these checks.** No migrations, database writes or Production changes were performed.

## Latest filumire-preview safety check — NOT READY

The user reports successful read-only SQL inspection on `neon-champagne-school` / `filumire-preview` / `neondb`: eight of ten prerequisite tables are present; `auth_rate_limits` and `teacher_link_codes` are missing. This supports the proposed 0020/0021 scope. Column definitions, constraint definitions, indexes and migration-history result sets have not been supplied, so compatibility has not been certified.

Available access was checked again for this request: no browser is connected and no Neon API credential is configured in the process. There is no available Neon connector. Existing Vercel Secret restrictions and the unmapped older SQL baseline therefore remain blockers; no connection to an unverified database was attempted. Prior SQL review and offline tests were retained, not repeated. No migrations, recovery creation, database writes, deployment or Production changes were performed.

Outstanding evidence, obtainable without sharing credentials:

1. Share the **column, constraint, index and history result sets already returned** by `verify-registration-preview.sql`; no need to repeat the table-presence check. In particular, verify the exact account-kind CHECK, its validation status, and compatible text primary/unique keys for `learners.id` and `principals.id`.
2. In Neon branch/endpoint metadata, identify the Preview and main branch IDs and their endpoint mappings. Also confirm the effective Production database's project/branch/database from its existing trusted configuration source. Different labels or pooled/direct hostnames are not proof of isolation; Production must not share the Preview recovery branch.
3. In the Preview branch's Backup & Restore page, identify an **existing usable** recovery reference (snapshot/backup or validated PITR timestamp/LSN), status, source branch, expiry/earliest retained point and the authorized restore operator's permissions. Do not create, restore or change retention. If there is no usable recovery point, report that explicitly; its creation requires separate approval.

Alternatively, connect an already signed-in Neon browser through Settings → Computer use so these pages can be inspected directly. No passwords, tokens or connection strings are requested. Until the evidence above is verified, the decision is **NOT READY**, and the runner remains disabled. Lock contention during the CHECK replacement, unexpected existing definitions, shared recovery scope and lack of recoverability remain material risks. Migration approval is not requested while these safeguards are unresolved.

Latest registration-deployment preparation is recorded separately in [PRIVATE_PREVIEW_REGISTRATION_PREPARATION.md](PRIVATE_PREVIEW_REGISTRATION_PREPARATION.md). The user now identifies the Neon branch as `filumire-preview` and confirms the Preview URL was replaced. This is not independent endpoint mapping or schema evidence. An isolated exact-commit package from `a59b9fdf` is verified locally; actual Preview settings and current branch migrations remain unverified. No migration or deployment was performed. Earlier database baselines below must not be treated as verification of that current branch.

## Authorized read-only verification result — 10 October 2026

**NO-GO. No migrations, recovery creation/restore, deployment, Production changes or GitHub operations.** HEAD remains `a59b9fdf12380bc261f364fbafe1b03d41a02741`; changes are local preparation artifacts only. This section supersedes earlier readiness assessments below.

| Required evidence | Latest result | Remaining blocker |
| --- | --- | --- |
| Production effective project/branch/database | Fixed-target authenticated CLI GET for DATABASE_URL succeeded: type sensitive, targets production+preview, decrypted false, no readable database identity. GET of existing Production deployment `dpl_qrqeL1qomMu434xDobMZysC9eSFc` confirms project/target but contains no database environment. Both outputs were projected through `read-production-database-identity.mjs`; no raw values emitted. | Owner must confirm effective Production endpoint/database and Neon project/branch from the existing trusted source. Current settings alone would not prove an older deployment's effective runtime. |
| Preview branch mapping | Existing Vercel evidence establishes resource/project/Preview mapping below; SQL baseline establishes endpoint/database/role. Browser selection failed; troubleshooting discovery returned no browsers. Neither current process nor reviewed env files has Neon API access. | Neon dashboard endpoint-to-branch mapping cannot be read through available access. No credentials requested. |
| Recovery and permissions | Current official recovery documentation checked; Free plan confirmed through existing resource metadata. | Actual retained history, usable recovery source, expiry, project permissions and operation restrictions cannot be read without Neon dashboard/owner evidence. SQL ownership and Vercel marketplace scopes are insufficient. |
| Migration provenance | Local Git commits and SQL hashes recorded in `PRIVATE_PREVIEW_MIGRATION_PROVENANCE.json`. 0019 explicitly says handwritten after 0018; tracked handoff confirms deliberately absent journal. Only 0019–0021 SQL files exist in this checkout. Frozen catalog shows no ledger and wholly absent 0020/0021 objects. | Historical Neon execution order remains unprovable locally; maintainer must reconcile earlier records and approve the observed schema baseline. No journal was synthesized or database ledger written. |

Additional runner checks now pin prerequisite 0019's SQL hash, require nonsecret evidence references for both database mappings, the effective Production target, recovery availability/permissions/procedure and migration-history reconciliation. They reject Production's direct OR pooled Preview endpoint even if supplied branch IDs claim isolation, malformed evidence, unusable recovery sources, nonnumeric PITR retention, and PITR expiry extending beyond captured-time retention. Evidence review flags remain false. Passing synthetic tests does not authenticate reviewer evidence or certify remote readiness. The runner still has no DDL/DML execution path; any apply argument fails before connection. Its live schema checks remain pending behind the external evidence gate.

Latest validation: **57 offline safeguard checks passed; zero database connections or mutations**. The real ignored Preview configuration returned NO-GO with `connected:false`. Previously passing seven local PostgreSQL suites remain documented below; they were not rerun or presented as Preview verification. Final credential scan covers new tests as well as reports/scripts; no locally known credential matches were found, and all four env files remain ignored/untracked. Syntax checks pass for the changed scripts; no changes were staged or committed.

### Recovery procedure reviewed, not executed

Free history retention defaults/maxes at six hours with a 1 GB cap; actual retained history can be shorter. Zero disables PITR. Confirm Settings → Postgres → History window and the earliest available point. [Neon history window](https://github.com/neondatabase/website/blob/main/content/docs/postgres/backup-restore/history-window.md).

Neon documents one manual snapshot on Free. Manual snapshots can retain indefinitely unless an expiry is set; snapshot storage is billed. Scheduled backups require a paid plan (Agent availability differs). For a future explicitly authorized recovery-point creation: first verify Preview branch identity/isolation, existing snapshot quota, permissions and cost; select that branch's Postgres database → Backup & Restore → Create snapshot; use a named pre-migration point, record its ID/source/time/status/expiry, and inspect its schema/data before relying on it. Do not create it now or remove an existing snapshot to free quota. Future restoration must explicitly select the Preview target; snapshot restore can replace branch identity and affect compute/protection placement, requiring revalidation. [Neon Backup & Restore](https://github.com/neondatabase/website/blob/main/content/docs/guides/backup-restore.md).

An existing root-branch PITR point is another candidate only after read-only Time Travel validation and expiry checks. Child branches do not support this operation. Restoration overwrites all databases on the branch, interrupts connections and loses later writes; transaction rollback is not equivalent protection. [Neon instant restore](https://github.com/neondatabase/website/blob/main/content/docs/postgres/backup-restore/branch-restore.md).

Permission verification must identify the authorized recovery operator's effective project permission and applicable branch restrictions. Viewer metadata access cannot establish write/restore permission. Read-only access for this verification need not grant the agent restore powers; the owner can confirm who can perform recovery. [Neon project permissions](https://neon.com/blog/neon-now-has-per-project-permissions).

### Minimal owner/dashboard handoff

Use the existing SSO command below to open `neon-champagne-school`. Supply only these nonsecret facts:

1. Production: effective runtime endpoint/database, Neon project ID and branch ID; identify which existing configuration/runtime source confirms it.
2. Preview: branch ID/name, root/child type, and confirmation that endpoint `ep-cold-bird-b8j437np` maps to it in project `proud-term-61114809`, database `neondb`.
3. Recovery: configured history window and earliest restorable point; existing snapshot/backup/PITR reference, status and expiry; authorized operator's project permission/restrictions. Inspect only—do not click Create, Restore, Save or change retention.
4. History: maintainer confirmation of earlier migrations through 0019 or an explicit reconciliation of missing execution records against the frozen schema. Do not fabricate a ledger.

Alternatively connect an already signed-in browser through Settings → Computer use so I can inspect these dashboard pages. No passwords, tokens or connection strings are needed in chat. Available API/CLI responses do not expose the required identities; no speculative endpoints, new credentials or services were used.

Safe checks from the workspace root:

```powershell
node FILUMIRE_CLAUDE/scripts/read-production-database-identity.mjs
node FILUMIRE_CLAUDE/tests/private-preview-guards.test.mjs
node --env-file=.vercel/.env.preview.private.local FILUMIRE_CLAUDE/scripts/private-preview-migrations.mjs
node FILUMIRE_CLAUDE/scripts/check-private-preview-secrets.mjs
```

The identity command executes two fixed-target GET requests; the validator stops before database connection while evidence is missing. No enabled migration execution command exists. Separate approval is required for any recovery-point creation, migration and deployment.

## Follow-up evidence — 10 October 2026

**NO-GO remains.** This update supersedes the original runner assessment below. Completed SQL, baseline and integration checks were retained. No external settings or database records were changed.

**Integration ownership confirmed:** authenticated read-only CLI API responses identify resource `store_1GtAwVi3NaSUJhuY` (`neon-champagne-school`), external Neon project `proud-term-61114809`, configuration `icfg_jiN7fgfL0gzgZejr7F8Msduq`, owned/available, plan `free_v3` (Free). Its project mapping is exactly `prj_jozdDNN1pW1q5Ez66e32RvXhbYwC`, environments `[preview]`, prefix `FLPREVIEW_`. This establishes the Preview integration's project, not endpoint-to-branch mapping or Production isolation. The connector returned 403; authenticated CLI metadata access succeeded. Integration marketplace/resource scopes do not prove Neon restore permission. Responses contain no branch IDs, retained restore point, configured retention or restore permission.

**Runner hardened:** `private-preview-migrations.mjs` now contains only a read-only validator, with no migration execution code. Every argument, including `--apply`, is rejected before connecting. `private-preview-guards.mjs` pins the direct endpoint/project/database/role, requires explicit Preview variables, ignores generic DATABASE_URL, rejects conflicting aliases/options, verifies TLS, and pins SQL hashes/order and the complete reviewed schema fingerprint. Live checks reject unexpected migration ledgers, schema drift/partial migrations, incompatible account kinds, relevant locks and unobservable migration activity. Queries run in repeatable-read READ ONLY with pinned public search path, 5-second lock timeout and 30-second statement timeout.

Before connecting, fresh reviewed evidence must establish branch mapping, a distinct Production recovery branch, a usable recovery reference/expiry/retention and restore permission/procedure, plus reconciliation of absent historical migration records. `PRIVATE_PREVIEW_SAFETY_EVIDENCE.json` is an unverified template; all review flags remain false. Reviewer assertions require independent evidence. Atomic execution and before/after integrity verification remain future work.

**Validation:** 43 offline safety checks passed, zero database connections/mutations. The runner with the ignored Preview environment returned NO-GO before connecting: branch mapping, Production target, recovery point, historical migration reconciliation and fresh evidence remain missing. The seven previously passing local PostgreSQL suites below remain documented and were not rerun against Preview.

### Manual steps needed to resolve access blockers

1. Open the existing Neon resource through SSO:

   ```powershell
   npx --yes vercel@63.1.2 integration open neon neon-champagne-school --scope team_ZGp9TfdK3M45ks3ViQZ9WgSW
   ```

   Read its project/branch/endpoints pages. Record the branch ID/name and root/child type serving `ep-cold-bird-b8j437np`, database `neondb`. Do not create or change anything.
2. From the trusted source of the existing Production Secret or existing runtime configuration, identify the effective endpoint/database without printing its connection string. Map the endpoint to Neon project and branch IDs. Supply only project/branch/endpoint/database identifiers. Env pull cannot reveal the unreadable Secret, and a different endpoint alone is insufficient. If inaccessible, ask its owner to verify or grant read-only access. Do not replace the Secret or modify Production.
3. Read Neon Backup & Restore/history settings: record actual configured retention, earliest restorable timestamp/LSN, existing usable recovery reference/expiry, and permission to perform its restore. Root-branch PITR needs a confirmed root branch; otherwise identify another already usable recovery source and procedure. Free-plan limits below apply, but actual retained history and permissions are unknown. Do not create backups, extend retention or restore anything.
4. Have the migration maintainer reconcile the absent ledger with prior execution records through 0019 and the frozen schema. Object presence cannot prove migration chronology. Supply nonsecret evidence; do not mark review flags verified speculatively.

Metadata was read through `read-neon-control-metadata.mjs`, which redacts credential-bearing keys/values and suppresses raw errors. It performs only GET requests for integration configurations and the exact storage resource; no credential values were written into reports.

Current safe commands:

```powershell
node FILUMIRE_CLAUDE/tests/private-preview-guards.test.mjs
node --env-file=.vercel/.env.preview.private.local FILUMIRE_CLAUDE/scripts/private-preview-migrations.mjs
node FILUMIRE_CLAUDE/scripts/check-private-preview-secrets.mjs
```

The second command exits NO-GO until evidence is verified. There is **no enabled migration execution command**. The historical `--apply` proposal below remains disabled. A fresh GO report and explicit authorization must precede migrations; deployment needs separate authorization.

Read-only safety gate, 10 October 2026. No approval requested. No migration, deployment, recovery creation, production change or GitHub operation performed. This supersedes the earlier invitation to approve migrations in `PRIVATE_PREVIEW_PREPARATION.md`.

## Confirmed checkpoint and configuration

- HEAD: `a59b9fdf12380bc261f364fbafe1b03d41a02741`; application code unchanged.
- At entry: untracked `.claude/` (pre-existing), preparation report, `inspect-private-preview.mjs`, `private-preview-migrations.mjs`, `test-private-preview-postgres.mjs`. This gate adds this report, a schema/data baseline, a read-only preflight and credential scanner, and locally hardens preparation scripts. Nothing committed.
- Vercel project `filumire-learner`, ID `prj_jozdDNN1pW1q5Ez66e32RvXhbYwC`, team `team_ZGp9TfdK3M45ks3ViQZ9WgSW` (`tabicrentsil-6879s-projects`), verified through connector and authenticated CLI.
- Root `FILUMIRE_CLAUDE/apps/learner`; install `cd ../.. && npm ci`; Node 22.x; Next.js preset.
- SSO protection enabled: `all_except_custom_domains`. Latest deployment remains the earlier deployment marked Production; it is not a newly updated Preview.
- Preview branch override: `DATABASE_URL`, Preview-only, `filumire-interface-testing`, ID `gRM8jb6O1VSKXpR5`. `FLPREVIEW_*` integration variables are Preview-only. Registration/persistence/auth variables exist as unreadable Secrets; their effective values cannot be reverified from the connector. No variables were modified during this gate.

## Target identity and Production isolation — BLOCKED

Direct, TLS-verified read-only connection: endpoint `ep-cold-bird-b8j437np.c-14.us-east-1.aws.neon.tech`, database `neondb`, role `neondb_owner`, not superuser; PostgreSQL `18.6 (c021049)`. `transaction_read_only=on`. Integration configuration names Neon project `proud-term-61114809`. This proves the SQL connection identity and consistency with Vercel integration metadata; it does not independently prove Neon control-plane endpoint-to-branch/project mapping.

The generic `DATABASE_URL` (ID `aCnjoIipkkc4qu24`) still targets **both Production and Preview**. Its value is unreadable. The new branch override cannot establish that Production uses a different writable Neon branch/database. A different hostname would not alone prove isolation: multiple endpoints can map to one Neon branch, and pooled/direct endpoints share data. Required evidence: effective Production target metadata obtained without logging credentials, plus Neon endpoint/branch/database mappings proving distinct writable storage. Production was not connected to or changed during this gate.

## Complete SQL review

| Migration | Exact effects and dependencies | Safety findings |
| --- | --- | --- |
| `0020_auth_rate_limits.sql` | Creates `public.auth_rate_limits`: text PK `key_hash`, non-null integer `request_count`, non-null timestamptz `window_ends_at`; adds btree expiry index. | No INSERT/UPDATE/DELETE/TRUNCATE, row conversion or backfill. No foreign keys. SQL uses unqualified creation names, so a future runner must set `search_path=public,pg_catalog`. IF NOT EXISTS tolerates existing names but does not validate their definitions. |
| `0021_teacher_accounts.sql` | Drops and re-adds `account_credentials_account_kind_check`, expanding allowed kinds from guardian/learner to guardian/learner/teacher. Creates `teacher_link_codes`: text PK; unique non-null `code_hash`; non-null learner/creator/expiry; nullable used-at/used-by/revoked-at; non-null creation timestamp default now(); three text FKs to public learners/principals with ON DELETE RESTRICT and ON UPDATE NO ACTION; btree learner index. | **Destructive schema statement:** DROP CONSTRAINT removes the old check. No table/column drop or row transformation. Must execute the complete sequence in one transaction. Requires existing text PK/unique learner/principal IDs and compatible account-kind rows. New teacher rows would prevent simply restoring the old check later. |

The full SQL files were read, not inferred from comments. 0021 depends on 0019 account credentials and the earlier learners/principals schema. It has no direct SQL dependency on 0020, but reviewed application ordering is 0020 then 0021. All five current credential rows are compatible (2 guardian, 3 learner).

Locks: ALTER TABLE DROP/ADD CHECK needs ACCESS EXCLUSIVE on account_credentials and can block authentication reads/writes; ADD CHECK scans existing rows. Creating FKs requires SHARE ROW EXCLUSIVE on referenced learners/principals. Ordinary CREATE INDEX is not concurrent and blocks writes on its indexed table; here both new tables should be empty. Locks persist to transaction end. [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html), [CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html), [CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html).

Compatibility risks: lock contention; unexpected old constraint definition; divergent/partial tables or indexes hidden by IF NOT EXISTS; unqualified search path; existing credentials with unsupported kinds; other clients concurrently changing schema. No intended curriculum or adaptive data changes. New FK references restrict subsequent deletion of referenced learners/principals while invitation rows exist.

## Recovery point — BLOCKED

No verified branch ID/name/type, pre-change snapshot, backup ID, restorable timestamp/LSN, configured history window, backup expiry, recovery permissions or restore drill is available. No Neon administrative API credential is present in the reviewed environment files, and no browser was connected in the preceding preparation. SQL credentials and Vercel integration variables do not establish those facts. The schema/fingerprint artifact below is **not a restorable data backup**.

Neon documents root-branch instant restore using a timestamp/LSN within retained history; child branches do not support that instant-restore operation. Restore overwrites schema/data across all databases on the branch, interrupts connections and excludes subsequent writes; it does not revert Object Storage or Functions. The correct recovery procedure therefore depends on first confirming the actual branch type and a usable restore source, then inspecting that source with Time Travel/schema checks and obtaining authorization for restoration. [Neon instant restore](https://github.com/neondatabase/website/blob/main/content/docs/postgres/backup-restore/branch-restore.md).

Documented history limits: Free up to 6 hours capped by 1 GB history; Launch up to 7 days; Scale up to 30 days. A zero configured window disables instant restore. The project's actual plan/window and earliest recoverable time remain unknown; no retention extension or service purchase was made. [Neon history window](https://github.com/neondatabase/website/blob/main/content/docs/postgres/backup-restore/history-window.md).

Transaction rollback only handles uncommitted changes. It is not protection against a committed error, an uncertain COMMIT acknowledgement, expired recovery history, subsequent application writes or an incorrectly selected/shared production branch.

## Schema, history, records and concurrent activity

Captured at `2026-10-10T11:49:28.928Z`, in one repeatable-read, read-only transaction: [full schema and hashed data baseline](PRIVATE_PREVIEW_READ_ONLY_BASELINE.json). The artifact records all public columns, constraints and indexes, every public table's count/content fingerprint, and exact SHA-256 hashes of reviewed SQL. It contains no application row payloads or credentials. Future preflights use timestamped filenames and refuse overwrites.

- 26 public tables. Principal/learner IDs are text with existing keys/FKs; account schema and the original guardian/learner check are recorded.
- `auth_rate_limits`, `teacher_link_codes`, their target indexes and teacher-kind check are absent: **both migrations missing**, no observed partial 0020/0021 objects.
- No migration ledger table found among visible non-system base tables; no local Drizzle journal/snapshot located. Earlier migration execution order/checksums cannot be independently established. Existing schema is evidence of objects, not authoritative migration history.
- Counts: learners 3, principals 5, account_credentials 5, account_profiles 2, learner_profiles 3, learning_evidence 6, learner_states 2, interventions 8, guardian_consent_records 7, learner_learning_context 2, principal_learner_access 6, auth_sessions 6, pilot_measurement_events 16. Remaining public tables are empty.
- No other visible client sessions, relevant exclusive locks, or advisory lock 702021 observed at capture. This is a point-in-time observation; it cannot exclude an imminent migration or another runner that ignores this advisory-lock convention.

## Runner safeguards — original runner insufficient; apply now disabled

Original strengths: explicit Preview endpoint/project variable/database/role checks, rejects superuser, one outer transaction, ascending SQL order, 5-second lock timeout, 30-second statement timeout, cooperative transaction advisory lock, rollback on caught failure, before/after counts for four tables. Default path is read-only.

Original gaps: project ID is caller-supplied rather than control-plane-attested; accepts pooled fallback; does not prove Production isolation or recovery; checks table existence instead of full definitions/history/checksums; weak teacher-check substring match; silently accepts divergent existing 0020; does not pin search path; four counts do not prove row contents or all-table integrity; preflight/apply TOCTOU exposure; cooperative lock does not stop other migration tools. Statement timeout is per statement, not an overall migration deadline. COMMIT/network ambiguity needs fresh schema/history inspection before rerun. SQL IF NOT EXISTS and dropping/re-adding the check are not sufficient semantic idempotency.

The runner now rejects **every `--apply` invocation before connecting** with a NO-GO message. It is intentionally not execution-ready until critical safeguards are established and an approved manifest/history/full-schema validation and recovery gate are implemented. Malformed connection parsing in all three preparation scripts was changed to avoid printing supplied input. The new preflight rejects wrong/missing direct Preview configuration and is read-only only. No fault-injection DDL or mutation tests were run.

## Previously passing tests

Seven PostgreSQL suites remain documented from the preceding preparation on `localhost:5432/filumire_test` as non-superuser `filumire_test_user`: account-registration-journey; teacher-linking; auth-rate-limit; principal-auth-session; learner-progress; learning-language; api-auth-postgres-lifecycle. They were not rerun in this read-only gate. The French parent-summary-language suite requires memory persistence and is excluded from the PostgreSQL runner. These local results do **not** certify Preview migration history, production isolation, recovery or live interfaces.

## Credential review

Four local/generated environment files were verified ignored and untracked, including `.vercel/.env.preview.private.local`. The credential scanner checked 1,463 current tracked/preparation files at its initial run and found no matches to locally known credential values/passwords. Remote values were redacted before tool output. The SQL baseline stores metadata/hashes, not password hashes or learner row contents. Exact-match scanning is not proof about inaccessible remote Secrets, all historic terminal logs or Git history; no such blanket claim is made. The scanner can be rerun after this report. No environment file was copied into a report or staging area.

## Commands and disposition

From `C:\Users\tabi\Desktop\filumire-responsive`, current safe checks:

```powershell
node --env-file=.vercel/.env.preview.private.local FILUMIRE_CLAUDE/scripts/private-preview-safety-preflight.mjs
node FILUMIRE_CLAUDE/scripts/check-private-preview-secrets.mjs
git diff --check
git status --short
```

Proposed execution interface **only after a future GO report, runner hardening and explicit migration authorization** (currently deliberately rejects execution):

```powershell
node --env-file=.vercel/.env.preview.private.local FILUMIRE_CLAUDE/scripts/private-preview-migrations.mjs --apply
```

Post-change verification, only after separately authorized migration execution:

```powershell
node --env-file=.vercel/.env.preview.private.local FILUMIRE_CLAUDE/scripts/private-preview-safety-preflight.mjs
node --env-file=.vercel/.env.preview.private.local --input-type=module -e "process.env.DATABASE_URL=process.env.FLPREVIEW_DATABASE_URL_UNPOOLED; await import('./FILUMIRE_CLAUDE/scripts/check-section7-readiness.mjs');"
```

Compare the frozen pre-change baseline with the new artifact: every existing table's count/content fingerprint and definitions must be unchanged except the approved check; verify exact new columns/types/nullability/defaults/PKs/unique/FKs/indexes, empty new tables and approved migration ledger/checksums. Investigate every mismatch and recheck Production isolation. The readiness command can still fail auth/persistence checks because Vercel Secrets are omitted locally; verify those safely in the effective Preview environment rather than supplying invented values.

**NO-GO blockers:** Production writable-storage isolation unproven; usable recovery point unverified; control-plane branch mapping/history incomplete; execution runner not yet sufficiently guarded. Stop here. No authorization request or deployment follows this report.
