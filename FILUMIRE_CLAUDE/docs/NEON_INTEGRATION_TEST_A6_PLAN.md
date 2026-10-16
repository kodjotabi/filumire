# Neon A6 — guardian-to-learner journey on a disposable branch (Option B): execution and clean-up plan

- **Status:** prepared, **not executed**. No branch created or deleted. No database changed, grants unchanged, nothing deployed.
- **This supersedes** the earlier Option A draft and its approval code `41d4f8a44370`, which is no longer valid.
- **Changed locally (uncommitted):**
  - [`scripts/test-neon-integration-journey.mjs`](../scripts/test-neon-integration-journey.mjs): the runner, reworked for a disposable branch.
  - [`tests/account-registration-journey.test.ts`](../tests/account-registration-journey.test.ts): +9 lines, an explicit clean-up mode for branch disposal.
- **Application code:** unchanged.

## 1. The disposable branch

| Property | Value |
|---|---|
| Project | `proud-term-61114809` |
| Parent | `integration-test` (`br-long-leaf-b8wixqz2`). Never `main` or `filumire-preview`. |
| Data | **Current data (head)** of the parent. Today that is the post-A5 state: schema `20f33302…deaf2`, the 5 A4 ledger rows, the A5 grants and the `filumire_app` role, and **0 rows in every other table**. `integration-test` was created schema-only from `main`, so it holds no production data, and the child inherits none. Do not choose "schema only": it would drop the ledger rows, and the runner's lineage check would then refuse the branch. |
| Name | `a6-journey-YYYYMMDD` (the runner refuses any other pattern) |
| Compute | One read-write endpoint. Use the direct (unpooled) connection; the runner refuses pooled hosts. |
| Expiry | Set an expiration of **24 hours** if the console offers it. The manifest must carry an expiry within 7 days of creation in any case, as a backstop if manual deletion is missed. |
| Protection | Not protected and not the default branch, so it can be deleted |

### Branch creation (you, in the Neon console)

No Neon CLI or API key is available in this workspace, so creation and deletion are console actions.

1. Go to **Branches → Create branch**. Set the parent to `integration-test`, choose current data, enter the name, add a compute, and set the expiry.
2. From the branch page, record the branch ID (`br-…`) and the endpoint ID (`ep-…`).
3. Get the **direct** connection strings for `filumire_app` and `neondb_owner` on the new branch.
   - Neon copies roles to the child. Check whether the passwords match the parent's: if they do, these strings also work against `integration-test` on its own host. That is why step 7 deletes them.
4. Save the strings to a new file, **`filumire-batch1-quarantine\.env.neon-a6-journey.local`**:

   ```
   NEON_A6_APP_URL=<filumire_app direct URL>
   NEON_A6_OWNER_URL=<neondb_owner direct URL>
   ```

   Do not paste them into chat. The existing `.env.neon-integration-test.local` is not used by A6.
5. Write the manifest (no secrets) as `filumire-batch1-quarantine\a6-branch-manifest.json`, exactly these eight fields:

   ```json
   { "projectId": "proud-term-61114809", "parentBranchId": "br-long-leaf-b8wixqz2",
     "branchId": "br-…", "branchName": "a6-journey-YYYYMMDD", "endpointId": "ep-…",
     "host": "ep-….c-14.us-east-1.aws.neon.tech",
     "createdAt": "<ISO time>", "expiresAt": "<ISO time>" }
   ```

   I can write it from the IDs you give me.

## 2. Runner safeguards for that exact branch

**Manifest** (`validateBranchManifest`). The run is refused unless all of these hold:

- project `proud-term-61114809` and parent `br-long-leaf-b8wixqz2`
- the branch ID is well-formed and **is not** `integration-test`
- the endpoint is **not** `main` (`ep-cold-bird-b8j437np`), `filumire-preview` (`ep-icy-scene-b816974r`) or `integration-test` (`ep-rough-water-b8fcf7pe`)
- the host equals `<endpointId>.c-14.us-east-1.aws.neon.tech`
- the name matches `a6-journey-YYYYMMDD`
- the expiry is within 7 days, and there are no extra fields (for example, no connection string)

**URL check, before any connection** (`checkJourneyUrl`). Refused:

- `main` and `filumire-preview` (also when pooled), `integration-test` itself, pooled hosts, any host other than the manifest host (including look-alikes), and any port other than 5432
- any database other than `neondb`, and the wrong role for the connection
- any query parameter other than TLS settings, which blocks `host=`, `dbname=` and `options=-c role=` overrides

TLS is forced to `verify-full`.

**Live session** (`connectVerified`): read-only first. Then Neon's own `neon.branch_id`, `neon.endpoint_id` and `neon.project_id` must equal the manifest, the branch must not be the parent, `current_user` must equal `session_user` and equal the expected role, and `is_superuser` must be off. Any mismatch closes the connection.

**Lineage proof before use** (`assertLineage`). This proves the branch is an untouched copy of `integration-test` after A5:

- The schema hash is `20f33302…deaf2`.
- The ledger holds exactly the 5 A4 rows, all with `applied_at = 2026-10-15T12:01:17.255Z`. That timestamp comes from the single A4 transaction, so only `integration-test` and its descendants have it; `main` and `filumire-preview` cannot match.
- `filumire_app` privileges equal the A5 matrix exactly (an extra DELETE is refused), the role has no elevated attributes, its connection limit is 20, and there are no memberships and no default ACLs.
- **Every table except the ledger is empty**, so any branch holding real or production data is refused.

**Approval code:** bound to the manifest, schema, row counts, grants, ledger, and the journey test and runner file hashes. It is printed by `--check` and required by `--execute`.

## 3. Clean-up, handled correctly

Before this change, the test's own `cleanUp()` refused `neondb` by name and exited 1. Behind that refusal it would have run DELETEs that `filumire_app` is not allowed to make.

Now:

- **Test** (+9 lines): when `FILUMIRE_TEST_DATA_DISPOSAL=neon-branch`, `cleanUp()` closes the pool, deletes nothing and logs `{ testDataDisposal: 'neon-branch', rowsDeleted: 0 }`. Without the variable, behaviour is unchanged (the localhost `filumire_test` runner and memory runs are unaffected). Only this runner sets it, and only for a verified disposable branch.
- **Pass rule (strict):** exit status **0**, no signal, all **21** checks passed, persistence `postgres`, and the disposal marker present. A non-zero exit is **always a failure**, whatever the assertion count. The self-test covers non-zero after 21 checks, a signal, a missing marker, memory persistence and a missing check.
- **Data removal:** the whole branch is deleted (section 5). No row is deleted by any role.

## 4. Least privilege preserved

- The journey's child process receives **only** the `filumire_app` URL for the disposable branch, re-validated. It gets no owner URL, no `PG*` variables and no `NODE_OPTIONS`.
- `neondb_owner` is used only by the runner's own **read-only** snapshot sessions and by the read-only owner session inside the A5 permission suite. It never writes and is never given to the journey.
- No grant changes. The run fails if any grant differs before (lineage check) or after (diff), and A5 must still pass **191/191** on the branch afterwards.

## 5. Execution sequence (after your approval)

1. **Create the branch** in the console (section 1). The env file and manifest are saved in the quarantine folder.
2. **Read-only check:**
   ```bash
   node scripts/test-neon-integration-journey.mjs --env-file C:/Users/tabi/Desktop/filumire-batch1-quarantine/.env.neon-a6-journey.local --branch-manifest C:/Users/tabi/Desktop/filumire-batch1-quarantine/a6-branch-manifest.json --check
   ```
   This prints the verified lineage and the approval code. **I stop and report.**
3. **Your approval** of that code.
4. **Execute** (writes fictional rows on the disposable branch only):
   ```bash
   node scripts/test-neon-integration-journey.mjs --env-file C:/Users/tabi/Desktop/filumire-batch1-quarantine/.env.neon-a6-journey.local --branch-manifest C:/Users/tabi/Desktop/filumire-batch1-quarantine/a6-branch-manifest.json --execute --approval <code> --evidence docs/NEON_INTEGRATION_TEST_A6_EVIDENCE.json
   ```
   - The evidence file must be new; it is never overwritten.
   - It is scanned for connection strings and Neon password prefixes before it is written.
   - It records: manifest, before/after row counts, the IDs of the 3 principals and 1 learner created, the judge result, the 21 check names, and A5's result.
5. **The run passes only if all of these hold:**
   - the journey passes strictly (section 3)
   - only the expected tables grew (+3 principals, +1 learner)
   - nothing was removed except `auth_rate_limits`
   - the payment tables, ledger, schema and grants are unchanged
   - A5 passes 191/191
6. **If anything fails:** stop and do not retry. Evidence is kept, and the branch stays until you have reviewed it (the expiry is the backstop). It cannot affect `integration-test`.

## 6. Preserving evidence, then deleting the branch

1. **Preserve:**
   - Write `NEON_INTEGRATION_TEST_A6_EVIDENCE.md` next to the JSON.
   - Re-scan both for secrets and record their sha256.
   - Copy the manifest into `docs/` (it holds only IDs and times).
   - Commit locally on your approval; nothing is pushed.
2. **Confirm the target before deleting.** The console's branch ID must equal the manifest's `branchId`, and:
   - its parent is `integration-test`
   - it is not `integration-test`, `main` or `filumire-preview`
   - it has no child branches
3. **Delete (you, in the console):** Branches → `a6-journey-YYYYMMDD` → Delete. This removes the branch, its compute endpoint and all the fictional rows. No DELETE privilege is used anywhere.
4. **Verify (read-only):**
   - Re-running `--check` with the old manifest must now fail to connect, because the endpoint no longer exists.
   - A read-only check of `integration-test` (as in A5) must still show schema `20f33302…deaf2`, the 5 ledger rows, 0 principals and 0 learners, and the A5 suite at 191/191.
5. **Remove credentials:** delete `.env.neon-a6-journey.local`. Its role passwords may still be valid for `integration-test`. Keep the manifest.
6. **Record** the deletion time and branch ID in the evidence `.md`.

## 7. Validation done now (no database or branch touched)

| Check | Result |
|---|---|
| Runner `--self-test` (offline, fake drivers) | **59/59 passed** |
| — manifest refusals | 11: wrong parent, integration-test itself, main/preview/integration-test endpoints, host mismatch, other project, bad name, no expiry, expiry over 7 days, extra field |
| — URL refusals | 19, each with **zero clients created**: main, preview, main pooled, integration-test, child pooled, other endpoint, look-alike, localhost, `postgres`/`filumire_test`/empty database, owner/other role, host/dbname/options overrides, port, scheme, missing |
| — live-session mismatches | 7: integration-test branch, other branch, endpoint, project, database, user, superuser |
| — lineage | 7 cases, including production-like data, a different or missing ledger, an extra DELETE grant and an elevated role |
| — journey judge | 6 cases, including **non-zero exit after 21 checks = failure** |
| — other | child-env isolation (2), snapshot diff (4) |
| Journey test, memory mode, clean env, dummy unreachable `DATABASE_URL` (no `.env.local`) | 21/21, exit 0. With the disposal variable set: 21/21, exit 0 (memory mode skips clean-up as before) |
| TypeScript on the edited test | No errors |
| Not yet exercised | The disposal branch of `cleanUp()` runs only with PostgreSQL, so it first runs on the disposable branch. The approval code can only be computed once the branch exists. |
