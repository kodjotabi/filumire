# Local `filumire_dev` database: setup evidence

- **Date:** 15 October 2026. Branch `dev/local-filumire-dev-db` (local only, not pushed).
- **Server:** local PostgreSQL 17.11, `localhost:5432`. No Neon, Vercel, GitHub or production system was touched.
- **Purpose:** persistent local development database for the website → guardian → learner demonstration.
- **No credentials** appear in this file. Connection details live only in the git-ignored
  `FILUMIRE_CLAUDE/.env.dev-owner.local` (owner) and `FILUMIRE_CLAUDE/.env.dev.local` (app).

## 1. Roles and database

Created by the owner with `scripts/sql/create-filumire-dev.sql` (guarded, one-time; generated passwords never displayed).

| Object | Attributes |
|---|---|
| `filumire_dev_owner` | LOGIN, connection limit 5; no superuser, createdb, createrole, replication or bypassrls; no memberships |
| `filumire_app` | LOGIN, connection limit 20; same restrictions; no memberships |
| `filumire_dev` | Owner `filumire_dev_owner`, UTF8, `English_Ghana.1252`; CONNECT/TEMP revoked from PUBLIC |

## 2. Schema source

Read-only `pg_dump` of `filumire_rehearsal_test` as `filumire_test_user` (session forced read-only):

- `--schema-only --no-owner --no-privileges`: 29 `CREATE TABLE`, 18 indexes, 86 `ALTER TABLE` (keys/checks). No `COPY`/`INSERT`, functions, roles or extensions.
- `--data-only --table=public.filumire_schema_migrations`: the 5 ledger rows only. No application data exported.

Imported into `filumire_dev` as `filumire_dev_owner` in one transaction (`ON_ERROR_STOP`), after confirming the target was `filumire_dev` with 0 relations, functions and types.

## 3. Schema fingerprints (`scripts/catalog-snapshot.mjs`)

| Database | SHA-256 | Tables / columns / constraints / indexes |
|---|---|---|
| `filumire_rehearsal_test` (source, unchanged) | `24d2e5e35acd914f434a63053fd96134aadcdc905d7d03415a3069837793fd95` | 29 / 279 / 134 / 65 |
| `filumire_dev` (local baseline) | `fc529953d49a0072f7fc02ae64ccad6c3194dbc434b1c1d19a8c41f3cd3f6523` | 29 / 279 / 134 / 65 |

**Reason for the difference.** One constraint, `payment_obligations_product_label_check`, is deparsed with different
parentheses. All tables, columns, indexes and the other 133 constraints are identical.

- Rehearsal: `CHECK ((((length(product_label) >= 1) AND (length(product_label) <= 120)) AND (product_label !~ '<pattern>'::text)))`
- `filumire_dev`: `CHECK (((length(product_label) >= 1) AND (length(product_label) <= 120) AND (product_label !~ '<pattern>'::text)))`

PostgreSQL flattens a nested `(A AND B) AND C` into a single `A AND B AND C` when the dumped definition is re-parsed.
With the parentheses removed, the two definitions are character-for-character identical (same regular expression).

**Equivalence verified:**

- Three-valued truth table over the three conditions (true/false/NULL): 27/27 combinations give the same result.
- Both forms evaluated with the live pattern on 15 sample labels (NULL, empty, whitespace-only including
  U+00A0/U+3000/U+FEFF/U+2028, 120 and 121 characters, ordinary text): 15/15 identical (6 accepted, 8 rejected, 1 unknown).

The constraint was **not** modified to make the fingerprints match. The rehearsal database, its fingerprint and the
copied ledger baseline row (`baseline-0000-0018`, hash `3700d803…3ed3f2b1`, recorded by `step-1.4-rehearsal`) are unchanged.
`drizzle/MIGRATIONS.json` is unchanged.

## 4. Migration ledger (`scripts/migration-ledger.mjs status`)

5 applied (`baseline-0000-0018`, `0019`–`0022`), 0 pending, no drift, no unknown rows, in order, consistent.

## 5. Application-role grants and permission tests

`scripts/sql/app-role-grants.sql` applied to `filumire_dev` only, as `filumire_dev_owner`: `filumire_app` has CONNECT on
`filumire_dev` and row access on 21 of 29 tables, as specified.

`scripts/test-app-role-permissions.mjs` (191 checks, one always-rolled-back transaction): **189 passed, 2 failed.**
Both failures are Neon-specific probes whose objects do not exist on local PostgreSQL. Access was refused in both cases, but
not with the `42501` code the test expects:

| Probe | Local result | Local equivalent, run separately | Result |
|---|---|---|---|
| `set role neondb_owner` | `22023` (role does not exist) | `set role filumire_dev_owner` / `postgres` / `filumire_test_user` | `42501` ×3 |
| `select … from neon_auth."user"` | `42P01` (schema does not exist) | none; no `neon_auth` schema exists locally | — |

The test script was not changed to hide these results. The only script change is the localhost-only TLS exception in
`connectionString()`.

**Protected tables (separate probes as `filumire_app`, rolled back):** SELECT, INSERT, UPDATE and DELETE on
`filumire_schema_migrations` and all seven `payment_*` tables: 32/32 refused with `42501`.

**Data:** every application table has 0 rows; the only rows in the database are the 5 ledger rows.

## 6. Persistent journey (fictional data)

The two Neon-only probes in section 5 were accepted by the owner as not applicable locally.
`apps/learner/.env.local` was backed up unchanged to the git-ignored `apps/learner/.env.memory-backup.local` and pointed at
`filumire_dev` as `filumire_app` (`FILUMIRE_PERSISTENCE=postgres`); its public site URL is unchanged.

- **Browser:** local website (`localhost:3147`) → *Parent Access* → `localhost:3100/login?lang=en&returnTo=family`.
- **HTTP, same endpoints the pages call** (the browser pane was hidden, so pages could not render for clicking):
  guardian registers (`@example.test`) → family lists 0 learners → adds learner (grade `level-gh-basic-5-pilot`) →
  family lists 1 → learner signs in by username → receives a Basic 5 Mathematics diagnostic → answers it
  (evidence 1, outcome `correct`, progress 73%).
- **Learner App restarted** (process fully stopped, port confirmed free, started again), then: the pre-restart learner session
  is still valid; the learner signs in again; progress is identical (evidence 1, mastery 1, 73%, same competency); the same next
  step is served; the guardian signs in and still sees 1 learner; selecting the learner issues a new learner-bound session and
  retires the old one; `/api/account/access` reports `entitlementBridge: not_configured`,
  `learningAccessPolicy: existing_authorisation`; the session is rejected after sign-out.

**Rows written:** principals 3, account_credentials 3 (2 guardians, 1 learner; all identifiers fictional; password hashes only),
learners 1, learning_evidence 1, learner_states 1, auth_sessions 9 (5 revoked), plus profiles, consent, access links,
interventions, rate-limit windows and pilot events. `payment_*` tables: 0 rows. Schema fingerprint unchanged (`fc529953…`).
One guardian has no learner: the first add-learner attempt used an unsupported grade ID (`basic-4`) and was rejected (HTTP 400).

## 7. Other databases

`filumire_test`: still owned by `filumire_test_user`, 28 tables, no privileges for either new role, no new ACL entries,
0 rows inserted/updated/deleted since statistics start. `filumire_rehearsal_test` was only read.

## 8. Browser journey (15 October 2026, ~20:00–20:07 UTC)

Clicked through in the Claude desktop app's built-in browser (Chromium) against the running local servers: website
`localhost:3147`, Learner App `127.0.0.1:3100` (`FILUMIRE_PERSISTENCE=postgres`, `filumire_dev` as `filumire_app`).
Every step below was performed by clicking and typing in rendered pages; page text was read from the DOM after each
step. No API call was used in place of a page. No code, schema, credential or configuration was changed.

Fictional accounts only: guardian `guardian.browser.1015@example.test` ("Ama Browsertest"), learner username
`kojo.browser1015` (Basic 5, `level-gh-basic-5-pilot`). Test passwords were generated for this run and are not recorded here.

| # | Step | Result | Browser evidence |
|---|---|---|---|
| 1 | Website → *Parent Access* | **PASS** | Clicked *Parent Access →* on `localhost:3147`; landed on `localhost:3100/login?lang=en&returnTo=family` (sign-in form rendered). |
| 2 | Guardian registration | **PASS** | *Create Account* → `/register`; filled name, email, password, both declarations; submitted. Redirected to `/family?lang=en&welcome=1`: "Hello, Ama Browsertest", "Your family account is ready", "No learners yet." |
| 3 | Guardian login | **PASS** | Signed out → back on website → *Parent Access* → signed in by email. Landed on `/family?lang=en` (honours `returnTo=family`). |
| 4 | Add learner | **PASS** | Family form: nickname, username, password, Class *Basic 5*, consent ticked → *Add learner*. List shows "Kojo · Username: kojo.browser1015 · First sign-in still to do" and the confirmation message. |
| 5 | Learner login | **PASS** | Guardian signed out; learner signed in by username → `/dashboard?view=setup` (first-run setup: name, class, avatar) → *Continue* → learner home with Mathematics "0 of 67 learning goals mastered". |
| 6 | Mathematics activity | **PASS** | *Continue Learning* → `/learn`: Mathematics · Modelling Large Numbers diagnostic. Answered "Which model represents 126,000?" and "In 352,000, what is the value of 5?" correctly; each showed "Well done. FILUMIRE has recorded this as successful evidence." and served the next item ("Model 430,000"). |
| 7 | Saved progress (Progress view) | **PASS** | *Progress*: "Mathematics · Modelling Large Numbers 100%, Confidence in this estimate: 65%, Still building, 2 answers checked"; Mathematics "Learning, 0 / 67". |
| 8 | Persists after page refresh | **PASS** | Reloaded the Progress page: identical figures. |
| 9 | Persists after sign-out and sign-in | **PASS** | Signed out (afterwards only `filumire.language` remained in localStorage; no readable cookies). Signed in again: setup skipped, home names "Modelling Large Numbers", Progress identical (100%, 65%, 2 answers), `/learn` resumes at the same next item "Model 430,000". |
| 10 | Guardian family view | **PASS** | Learner signed out → website → *Parent Access* → guardian signed in → `/family` lists the learner with status changed to "Set up". *See progress and messages* → `/adult`: Modelling Large Numbers 100% (this topic), "2 answers recorded, Last active 15 October", "0 topics mastered, 1 topic in progress", Mathematics "0 of 67 mastered, 1 in progress", Recent learning: Correct ×2 (15/10/2026). |
| 11 | Guardian sign-out | **PASS** | *Sign out* on `/family` → `/login`; opening `/family` again redirected to `/login?lang=en&returnTo=family`. Only console error: an expected 401 from the signed-out session check. |

**Database cross-check (read-only transaction as `filumire_app`, after step 10):** guardian and learner credentials
`active`; `principal_learner_access` has an active `guardian` link and an active `self` link to the same learner;
`learning_evidence` has 2 rows for that learner, competency `competency-gh-math-b5-1-1-1-1`, source `assessment`,
outcome `correct`; `learner_states` has `evidence_count` 2, `mastery_estimate` 1, `confidence` 0.6475
(readiness `MASTERY_RETENTION_TRANSFER_NOT_CONFIRMED`, not ready to advance), matching the 100% / 65% shown in the pages.
Database totals after the run: principals 5, account_credentials 5, learners 2, learning_evidence 3, learner_states 2,
auth_sessions 17. Before this run there were 12 sessions, not the 9 recorded in section 6; the source of those 3 sessions was not investigated.
This run added 5 sessions (learner 2 revoked; guardian 2 revoked, 1 active at the time of the check and then signed out in step 11).

**Observations (not failures; no changes made):**

- The learner's setup screen does not pre-select the class the guardian chose (Basic 5); the subject tiles are already
  Basic 5. The setup name field is pre-filled with the nickname. The tester typed into it without clearing it, so the display name became
  "KojoKojo". This was a test-input error, not an application fault. The same happened once with the pre-filled username field on the
  add-learner form, which was corrected before submitting.
- *Create Account* on the login page links to `/register?lang=en` without `returnTo=family`; registration still lands on `/family`.
- The login page's *Subscription* link points to the production `https://filumire.com/pricing`, not the local website.
- `/adult` (guardian progress page) has no *Sign out* control; the guardian must return to `/family` to sign out.
- In the diagnostic, the first answer option's radio has no accessible name (the other three do).
- Not covered: password recovery (not implemented), subscriptions/entitlements (not implemented), French locale,
  teacher access, mobile viewport, Learner App restart (covered in section 6 over HTTP, not repeated in the browser).
