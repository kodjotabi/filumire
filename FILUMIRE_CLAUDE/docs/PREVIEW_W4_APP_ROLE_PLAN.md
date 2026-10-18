# W4 — `filumire_app` on filumire-preview: plan (nothing executed)

- **Date:** 17 October 2026, after W3 (applied 19:29 UTC; ledger 7/7 consistent, read-only check).
- **Target:** project `proud-term-61114809`, branch `br-round-resonance-b8fm2nao`, endpoint
  `ep-icy-scene-b816974r` (direct host, not the pooler), database `neondb`, as `neondb_owner`.
- **Never:** production `main` (`ep-cold-bird-b8j437np`), the backup branch `br-young-cloud-b8ical1u`,
  the Neon console's role UI (it adds `neon_superuser` membership), Vercel.
- **Precedent:** A5 on integration-test (191/191). The role definition matches A5 and
  `scripts/sql/create-filumire-dev.sql`: LOGIN, no elevated attributes, connection limit 20.

## Steps and approvals

| Step | What | Writes? | Approval |
|---|---|---|---|
| W4-0 | Write `scripts/create-app-role.mjs` + offline tests, commit locally (no push) | Code only | **Needed** |
| W4-1 | Dry run: pre-flight checks, print approval code | No (read-only session) | Covered by W4-0 approval |
| W4-2 | Create the role with the approval code | Creates one role | **Needed, with code** |
| W4-3 | Run `scripts/sql/app-role-grants.sql` | Grants only | **Needed** |
| W5 | `test-app-role-permissions.mjs --pinned-target filumire-preview` | No (rolled back) | Separate |

W4-2 and W4-3 may be approved together, but run as two transactions: the grants file has its own
`BEGIN … COMMIT` and its guard must see the committed role.

## Password handling

**Change after the disposable-branch test:** Neon rejects a precomputed SCRAM verifier at COMMIT
(SQLSTATE `XX000`, HTTP 400, plaintext required). The script therefore sends a fresh plaintext
password, under these guards:

1. The script generates the password locally, once per execute: 32 random bytes, base64url
   (43 characters, 256 bits, `[A-Za-z0-9_-]` only, so the SQL literal needs no escaping; any other
   shape is refused).
2. **Verified TLS before BEGIN.** `pg` replaces `connection.stream` with a TLS socket after SSL
   negotiation; the script refuses (`tls_not_verified`) unless that socket is encrypted and
   `authorized` (CA chain), and refuses (`tls_hostname_not_verified`) unless the peer certificate
   matches the pinned host via Node's `checkServerIdentity`, whatever hostname check `pg` was given.
   Owner URLs with `uselibpqcompat` or `sslmode=verify-ca` are refused up front
   (`tls_hostname_check_disabled`): in pg 8.23 those, with `sslrootcert`, disable hostname checks while
   `authorized` stays true.
3. **Server hashes as SCRAM.** Dry run and execute both require
   `current_setting('password_encryption') = 'scram-sha-256'` (`password_encryption_not_scram`
   otherwise), so the role is never stored as md5. The check runs before the password is generated.
4. The password is sent exactly once, in `CREATE ROLE … PASSWORD '<pw>'`. It never appears in
   script output: failures report only codes created by our own code, never `error.message`, detail
   or statement text (tested with a driver error that echoes the full statement).
5. The approval code includes `plaintext-over-verified-tls-v1`, so codes from a verifier-era dry run
   are refused and the dry run must be repeated (its output now shows `passwordTransmission`).

**Server-side exposure (unavoidable, outside the script's control).** The plaintext is in the
statement text the server receives. `neondb_owner` is not superuser, so it can't turn off
`log_statement`, `log_min_error_statement` or `pg_stat_statements.track_utility`. Depending on
Neon's compute settings, the password may therefore be stored in Neon's Postgres logs (always if
`CREATE ROLE` errors and `log_min_error_statement` ≤ `ERROR`, the default), in `pg_stat_statements`
query text, and, while the statement runs, in `pg_stat_activity.query`, which is visible to the owner
role and `pg_read_all_stats` members. Neon staff and Neon log or monitoring integrations can read
these. Possible mitigation, not yet verified for SQL-created roles and needing its own approval:
after W5, reset the password through Neon's role password-reset API, which doesn't put it in SQL,
then update `.env.preview-app.local`.

6. **Before COMMIT**, the script writes `FILUMIRE_CLAUDE/.env.preview-app.local` (gitignored by
   `.env.*.local`) with `FILUMIRE_PREVIEW_APP_URL=postgresql://filumire_app:<pw>@ep-icy-scene-b816974r.c-14.us-east-1.aws.neon.tech/neondb?sslmode=verify-full`.
   If the file can't be written, it rolls back, so a role never exists without a usable credential.
   The file is refused if it already exists.
7. Output is non-secret only: role attributes, the file path, the transmission mode.
8. Later, W7 (Vercel Preview `DATABASE_URL`) uses this credential. Copying it into Vercel is your
   step, or a separately approved one. W7 will likely use the `-pooler` host with the same password.

**Resolved open point:** the disposable-branch test confirmed that Neon rejects a pre-hashed
password, so this plan now uses the plaintext-over-TLS fallback described above.

## Pre-flight (W4-1, read-only, all must pass)

On one connection as `neondb_owner`, `SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY`:

1. Pinned host gate (`checkPinnedHost`): exact host `ep-icy-scene-b816974r…`, production refused.
2. Identity (`checkIdentity`): `neondb` / `neondb_owner` / not superuser / timeline `9b1954e9…dd4cf1`.
3. Owner can create roles: `select rolcreaterole from pg_roles where rolname = current_user` is true.
4. Ledger (`compareLedger`): 7 applied, 0 pending, no drift, no unknown rows, in order.
5. Schema: `catalogHash` recorded now (the post-W3 hash, not measured yet) and 29 public tables,
   exactly the 29 classified in `app-role-grants.sql` (`filumire_schema_migrations` + 28).
6. `filumire_app` absent: `select count(*) from pg_roles where rolname = 'filumire_app'` = 0.
7. No other role named `filumire_%` exists, and nothing grants to `PUBLIC` on public tables.
8. Grants file sha256 = `9a5a1c34cca6f406571b1644d13d7397889f23dcb70c2c32eb7606c53a73868d`
   (current committed version, which adds the 0024 view grant after A5).
9. `password_encryption` is `scram-sha-256`.
10. Approval code = sha256(host, database, timeline, ledger ids, schema hash, "create filumire_app",
    credential policy version, `plaintext-over-verified-tls-v1`)[0..12].

## Exact SQL

### W4-2: create the role (one transaction)

```sql
-- (refuse unless the connection's TLS socket is encrypted and authorized)
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
-- Re-run inside the transaction: pre-flight 2, 4, 5, 6; abort if the approval code differs.
SELECT current_setting('password_encryption');  -- must be scram-sha-256
CREATE ROLE filumire_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS
  CONNECTION LIMIT 20 PASSWORD '<43-character base64url password>';
-- Verify before COMMIT; any mismatch -> ROLLBACK.
SELECT rolsuper, rolcreaterole, rolcreatedb, rolreplication, rolbypassrls, rolcanlogin, rolinherit,
       rolconnlimit, rolvaliduntil
FROM pg_roles WHERE rolname = 'filumire_app';
SELECT count(*) FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member WHERE r.rolname = 'filumire_app';  -- must be 0
-- (write .env.preview-app.local here, then)
COMMIT;
```

Expected values: all attributes false except `rolcanlogin`, connection limit 20, no expiry,
0 memberships *of* `filumire_app`. PostgreSQL 16+ makes the creator (`neondb_owner`) an admin
member *over* the new role. That's expected, and the grants guard checks only the reverse direction.
`pg_roles` masks `rolpassword`, so the SCRAM form is proven by the `password_encryption` check and
W5's successful SCRAM sign-in, not by reading it.

`NOINHERIT` is an addition to A5. It's harmless today (the role has no memberships) and keeps any
later accidental `GRANT <role> TO filumire_app` from taking effect silently. Drop it if you want
exact A5 parity.

### W4-3: grants

`scripts/sql/app-role-grants.sql`, unmodified, sha256 checked on the apply connection right before
sending. It runs its privilege guard, coverage check and 0024 view check, then grants:

| Access | Tables |
|---|---|
| SELECT, INSERT | account_profiles, controlled_teacher_actions, external_identities, guardian_consent_records, learners, learning_evidence, parent_teacher_messages, pilot_measurement_events, teacher_professional_notes |
| SELECT, INSERT, UPDATE | account_credentials, auth_sessions, interventions, learner_learning_context, learner_profiles, learner_states, pending_teacher_reviews, principal_learner_access, sessions, teacher_link_codes |
| SELECT, INSERT, UPDATE, DELETE | auth_rate_limits |
| SELECT, INSERT, DELETE | principals |
| SELECT (view only) | filumire_deployment_migration_0023 |
| None | filumire_schema_migrations, all 7 payment_* tables |

Plus `CONNECT` on `neondb`, `USAGE` (not `CREATE`) on `public`. It also revokes `CREATE` on
`public` from `PUBLIC`, which affects every role on this branch and matches integration-test.

## Post-checks (read-only, after W4-3)

1. Role attributes and memberships unchanged from W4-2.
2. Ledger still 7/7 consistent; schema `catalogHash` equal to the pre-flight hash (grants don't
   change the catalog hash).
3. `information_schema.role_table_grants` for `filumire_app` equals the table above exactly.
4. No default privileges for `filumire_app` (`pg_default_acl`).
5. Row counts of all 29 tables unchanged from pre-flight.
6. Then W5: `node --env-file=.env.preview-app.local --env-file=.env.preview-owner.local scripts/test-app-role-permissions.mjs --app-url-env FILUMIRE_PREVIEW_APP_URL --owner-url-env FILUMIRE_PREVIEW_OWNER_URL --expect-host ep-icy-scene-b816974r.c-14.us-east-1.aws.neon.tech --pinned-target filumire-preview`
   (expected 191/191 + the view check).

## Rollback

Before W4-3: `DROP ROLE filumire_app;` (owns nothing, has no grants). After W4-3:
`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM filumire_app; REVOKE ALL ON SCHEMA public FROM filumire_app;
REVOKE CONNECT ON DATABASE neondb FROM filumire_app; DROP ROLE filumire_app;`, then delete
`.env.preview-app.local`. Each is a separate approval. The backup branch is unaffected by either.

## Stop conditions

Any pre-flight failure, an approval-code mismatch, unverified TLS, `password_encryption` other than
`scram-sha-256`, Neon rejecting the role or the COMMIT, the env file
existing or not writable, any post-check difference, or W5 below 100%.
