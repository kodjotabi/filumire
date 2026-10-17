# Portable isolated grade/navigation browser runner

Run `node tests/grade-navigation-runner.test.mjs`, then
`npm run test:grade-navigation:browser` from the learner repository root.
The runner installs nothing and never runs migrations or a hosted deployment.

## Existing dependencies

- Node defaults to the current `process.execPath`. `FILUMIRE_BROWSER_NODE` can
  select another already-installed Node executable supported by this Next version.
- Playwright resolves using Node's package resolver: `playwright`,
  `@playwright/test`, then `playwright-core`. This supports local dependencies and
  `NODE_PATH` pointing to an existing module directory. Alternatively set
  `FILUMIRE_PLAYWRIGHT_MODULE` to a local absolute entry-file path or `file:` URL.
  Both CommonJS and ESM entry points work. No npm-cache directories are searched.
- Chromium defaults to Playwright's public `chromium.launch({headless:true})`
  discovery, including `PLAYWRIGHT_BROWSERS_PATH`. For an installed system browser,
  set `FILUMIRE_BROWSER_CHANNEL=chrome` or `msedge` (or `chromium` for Playwright's
  Chromium channel). Alternatively set `FILUMIRE_CHROMIUM_PATH` to an existing
  absolute executable path. Channel and executable overrides are mutually exclusive.
  An absent/incompatible browser fails preflight before building. Nothing downloads.

Example PowerShell configuration using installations supplied by the operator:

```powershell
$env:NODE_PATH = 'D:/tools/browser-tests/node_modules'
$env:PLAYWRIGHT_BROWSERS_PATH = 'D:/tools/playwright-browsers'
$env:FILUMIRE_NAVIGATION_ARTIFACTS = 'D:/test-evidence/grade-navigation-new-run'
npm run test:grade-navigation:browser
```

Paths in this example are placeholders. The selected Playwright package and
browser revision should match; an explicit executable override is the operator's
responsibility. This checkout intentionally does not add/install browser packages.
Older historical audit/hosted-preview scripts are outside this eight-journey
runner and retain their existing tooling requirements.

## Evidence and isolation

Default output is a fresh atomically allocated `.vercel/grade-navigation-*`
directory. `FILUMIRE_NAVIGATION_ARTIFACTS` selects a **new**, nonexistent directory;
existing directories, including empty ones, are refused. Do not choose a copied
source/dependency directory (`apps`, `services`, `packages`, `scripts`, `drizzle`,
`node_modules`). Outputs outside `.vercel` should remain outside version control.
The browser entry point also refuses previous evidence and reserves an exclusive
marker so concurrent/repeated browser invocations cannot reuse the same output.
No old evidence is deleted or replaced. Each invocation builds a new source
snapshot. `--build-only` is supported; the old stale-snapshot `--test-only` option
is rejected. For a complete rerun, allocate a new directory and rebuild.

The runner copies source without `.env*`, `.next` or dependencies and links the
existing local `node_modules`. It allowlists child environment variables, replaces
database/auth configuration with fictional local values, forces memory persistence,
and preloads a blocker for **all PostgreSQL Pool/Client query/connect methods** in
build workers, the server and test process. A PostgreSQL attempt fails the suite.

The server binds only `127.0.0.1`; `FILUMIRE_BROWSER_PORT` defaults to 3217 and
accepts 1024–65535. A bind preflight refuses occupied ports without contacting
their service. Browser HTTP requests are restricted to that exact origin (plus
in-memory `data:`/`blob:` resources); WebSockets are blocked. Service workers are
disabled. Direct link probes enforce the origin and disable redirect following.
The runner stops its own server and closes its own browser.

Fonts come from `tests/fixtures/browser-fonts`, with original font bytes, weights,
subsets, Unicode ranges, SHA-256 manifest and SIL OFL licenses. These are standalone
test inputs copied from the already available licensed FILUMIRE font assets;
neither a previous `.next` nor a sibling checkout is needed. No download occurred.
Every asset hash/size is checked before build. Next's test-response mechanism
supplies local CSS; its test-only file loader accepts only the copied font URLs.
Unknown CSS/font requests fail rather than falling back to downloads. This adapter
depends on Next's internal font test interface and must be checked on Next upgrades.
Production application font loading is unchanged.

Coverage remains EN/FR at 320, 390, 768 and 1280 pixels: guardian accounts and grade
selection, locked/unlocked learner setup, bypass rejection, learning navigation,
locale redirects, parent/teacher navigation, sign-out/retry, responsive layout,
accessibility names, link status and browser/network diagnostics.

## Deployment ledger permission recommendation — no infrastructure change

`scripts/deploy-guard.mjs` currently connects with `DATABASE_URL`, reads
`filumire_schema_migrations` (`id`, `kind`, `sha256`), and probes the grade column
and catalog constraint metadata in a read-only transaction. The grants policy in
`scripts/sql/app-role-grants.sql` deliberately denies the application role all
ledger access; `docs/LOCAL_FILUMIRE_DEV_EVIDENCE.md` records that denial. Therefore
the existing guard will refuse PostgreSQL deployments under that least-privilege
role even after migration 0023 is applied. Local memory checks cannot resolve or
validate this release blocker.

Recommended follow-up, requiring separate approval:

1. Use a dedicated non-owner, non-superuser deployment verifier in a trusted
   predeployment job. Give it only target-database CONNECT, schema USAGE and SELECT
   on required ledger columns, plus the minimum catalog/schema verification
   visibility. No ledger writes, DDL, application-data privileges, role membership
   in an owner, or bypass-RLS capability. Do not broaden application-role grants.
2. Adapt the guard to read the ledger through that verifier and retain a separate
   schema/permission probe through the actual application role and search path.
   Bind both probes to the same reviewed target database/environment and migration
   hash. Preserve existing host/branch/commit checks and read-only transactions.
3. Keep verifier credentials exclusively in the trusted job, never runtime
   variables or build artifacts. Make successful verification a mandatory gate
   for the exact commit/target being deployed. If verification and deployment are
   separate jobs, require a short-lived signed result bound to database identity,
   environment, commit and manifest hash, checked by the release gate. A free-form
   environment flag or reusable unsigned success file must never bypass the guard.

This is a design recommendation only. The current guard, grants, credentials,
migrations and infrastructure remain unchanged and fail closed. No database was
contacted to investigate it; target identities, grants and release-job wiring
still need an approved read-only verification before any release.
