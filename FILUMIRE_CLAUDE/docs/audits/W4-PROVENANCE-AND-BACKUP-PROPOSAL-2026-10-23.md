# W4 provenance (established read-only) and the next safe step — 2026-10-23

Nothing was written to any database, Neon or Vercel setting, or repository. No credential file was opened.

## 1. Who ran W4, and when: established

| Evidence (read-only) | What it shows |
|---|---|
| Claude memory note `C:\Users\tabi\.claude\projects\C--Users-tabi-Desktop-filumire-batch1\memory\filumire-preview-w-steps-status.md` (written by session `2b38b305…`, last modified 18 Oct 18:57 UTC) | A **separate Claude session** ran the W-steps with your per-step approval codes: W3 applied 17 Oct 19:29 UTC (`5cd0392ce1e4`); W4-1 dry run (`30e8936cdd49`); **W4-2 `filumire_app` created 18 Oct 17:36 UTC** (`30e8936cdd49`); **W4-3 grants executed** (`345a58d9ec90`), post-checks 56 grants and schema hash `ff52a448…` unchanged; **W5 207/207**; **W6 deploy guard PASS**; **W7** branch-scoped Preview variables, fast-forward push `f6c8e7d4..0f32a809`, Preview deployment READY with `gradeLockSchema: verified`. |
| File timestamps only (contents not opened) | `.env.preview-owner.local` 17 Oct 19:19 (10 min before W3); `.env.preview-app-w4.local` 18 Oct 18:18 (W4-2's credential output); quarantine probe files 18 Oct 16:42–17:00 |
| Neon (G4 today) | Ledger rows dated 17 Oct 19:29:26; `filumire_app` attributes and grants exactly as the note's post-checks describe |
| Vercel env listing today (names and targets only) | Branch `filumire-interface-testing` Preview `DATABASE_URL` updated 18 Oct 18:19; `FILUMIRE_DB_HOSTS_PREVIEW/PRODUCTION` created 18 Oct 18:06–18:07, matching W7 |

**Conclusion:** W4 was run by another local Claude session on 18 October under your approvals. It is recorded in that session's memory, not in the repository. **Remaining action:** copy this provenance into the repository's W4 plan record. That is documentation only.

Optional extra corroboration (read-only, low value):
- **Neon project operations list** (Monitoring/Operations, or `GET /projects/{id}/operations` via the console session): compute starts around 17 Oct 19:29 and 18 Oct 17:36/18:1x would line up.
- **I would not read `pg_stat_statements` or the Neon SQL query history for this**: the note records that W4-2 sent the new role's password in plain text, so those may contain it.

## 2. Correction to G2/G5 (from yesterday's report §5)

The dashboard list I read showed only three variables. The full listing (13 variables, no values) shows:
- **Production:** `DATABASE_URL` (sensitive, updated 11 Oct), `FILUMIRE_PERSISTENCE`, `FILUMIRE_AUTH_JWT_SECRET`.
- **Preview, branch `filumire-interface-testing`:** `DATABASE_URL` (→ `filumire-preview` via `filumire_app`, per W6/W7), `FILUMIRE_DB_HOSTS_PREVIEW/PRODUCTION`, persistence, JWT, registration, public site URL.
- **Preview, generic:** registration, JWT and persistence only, with no `DATABASE_URL`.
- All set by hand; the Neon integration has no connected project.

**Corrected G2:** Preview deployments of `filumire-interface-testing` use `filumire-preview` as the least-privilege role. The deploy guard checked the host allowlists at build time (W6/W7). **PASS.**
**Corrected G5:** Production has its own `DATABASE_URL`, whose endpoint is **unverified** (sensitive). Production builds would refuse under the current deploy guard, because `FILUMIRE_DB_HOSTS_PRODUCTION` exists only for that Preview branch.

**Consequence for B6 (push risk):** pushing `filumire-interface-testing` would build a Preview that **reads and writes `filumire-preview`**.

## 3. Open security item found in the note

**`filumire_app`'s password was sent in plain text in the `CREATE ROLE` statement (W4-2), so it may sit in Neon's logs or `pg_stat_statements`. Rotation was deferred.** It must be rotated before any reviewer data is stored. Rotation needs either a Neon API key that you create, or a SQL `ALTER ROLE … PASSWORD` through a reviewed script. It should be tested on a disposable branch first, to confirm role attributes don't change.

## 4. Next safe step: fresh backup branch of the migrated preview (one write; for approval)

| Item | Proposal |
|---|---|
| Action | Create **one** branch, `filumire-preview-post-w4-20261023`, from `filumire-preview` at its current head. Data copy (`parent-data`), **no compute**, no expiry. |
| Changes `filumire-preview`? | **No.** Neon branches are copy-on-write; the parent is not altered or locked. |
| Cost / limits | Free plan; 5 of the plan's branch allowance used, so this makes 6. Storage grows only as preview later diverges. |
| How | Neon console → Branches → Create branch, with you signed in. I fill the name, parent `filumire-preview`, "current data", and untick compute. You approve the exact screen before I click Create. |
| Verify (read-only) | Branch listing shows parent `br-round-resonance-b8fm2nao`, a `parent_timestamp` close to creation, and state `ready`. Schema verification would need a temporary compute (a second write), so it is left out unless you want it. |
| Why now | Today's only recovery points are the 6-hour window and the **pre-migration** copy (17 Oct). Before the password rotation, the review branch and the durability test, we need a copy of the current, verified state. |
| Rollback | Delete that new branch (with separate approval); nothing else is touched. |

After that, in order and each with approval:
1. Record W4 provenance in the repository.
2. Rotate `filumire_app`'s password.
3. Decide the reviewers' database (recommended: a dedicated review branch from this backup), then point Production at it with matching `FILUMIRE_DB_HOSTS_PRODUCTION`.
4. Durability test.

## 5. Done — backup branch created; its auto-attached compute removed (2026-10-23, owner-approved)

- Backup `filumire-preview-post-w4-20261023` (`br-lingering-thunder-b8ixxtdg`), parent `filumire-preview` (`br-round-resonance-b8fm2nao`), data as at 01:32:23 UTC, no expiry, state `ready`.
- Neon attached a read-write compute `ep-morning-smoke-b8xv4wg9` at creation. Removed via Branch → Computes → Delete; the dialog named only that endpoint. First DELETE returned HTTP 520 with no operation recorded; the single retry returned 200.
- Verified after (Neon console API, read only): backup `ready`, logical size 35,119,104 bytes (equal to `filumire-preview`), **no compute endpoint**. `filumire-preview` unchanged with its own `ep-icy-scene-b816974r` (idle). Six branches, four other endpoints, all idle and unchanged.
- Note: the backup still holds the `filumire_app` role with its exposed password; with no endpoint it is unreachable.
