# Audited learner private Preview — 12 October 2026

Deployment: **READY**, Preview only.

URL: https://filumire-learner-cc6jrhb2p-tabicrentsil-6879s-projects.vercel.app

Deployment ID: `dpl_8RpqeFKTakLfcFG7FmSDuq9v8Guo`

Project: `filumire-learner` / `prj_jozdDNN1pW1q5Ez66e32RvXhbYwC`

## Source and build

The upload contains 1,151 runtime source/assets files copied byte-for-byte from the current local learner, services and packages, including audited uncommitted and untracked work. It additionally contains `.vercelignore`. No Git checkout or Git-source deployment was used. Deployment metadata records `gitDirty=1`, `auditedLocalSource=true` and the source fingerprint below. Cached build artifacts were reused; Vercel rebuilt the uploaded source.

SHA-256 manifest fingerprint: `1223bbb169d28b4976449bb93f7ac1758af7475ab06f7e41c617602178c312d1`

Local Node 22.23.3 staged-source build passed with inert local database settings and no database access. Vercel Node 22 build passed compilation, lint/type validation, all 33 static pages and function packaging. The dry-upload manifest and original/staged files were verified against every source hash after building. Environment files, snapshots, local build output and other repository applications were excluded.

## Preview configuration and protection

Existing branch-specific Preview bindings were confirmed for `DATABASE_URL`, `FILUMIRE_PERSISTENCE`, `FILUMIRE_ACCOUNT_REGISTRATION` and `FILUMIRE_AUTH_JWT_SECRET`. Sensitive values are masked and cannot be pulled for inspection. Existing values were preserved. Metadata `githubDeployment=1` and `githubCommitRef=filumire-interface-testing` selected the branch bindings for the local-file deployment. Successful remote page-data collection confirms the database binding needed at import time was present; database connectivity and signed-in flows were not tested.

Vercel Authentication remains configured as `all_except_custom_domains`. A fresh unauthenticated request to the exact generated Preview URL returned HTTP 302 to `https://vercel.com/sso-api`. No protection was disabled and no share URL was created.

Authenticated read-only CLI requests passed:

- English login: HTTP 200; audited password guidance and disclosure markup present.
- Login with French query parameter: HTTP 200; disclosure markup present. Language selection happens after browser hydration, so this verifies availability, not French rendering.
- Anonymous `/api/session/me`: HTTP 401.

## Warnings and limits

- The remote dependency scan reports **8 vulnerabilities: 4 moderate, 3 high, 1 critical**, plus deprecation warnings for `@esbuild-kit/core-utils` and `@esbuild-kit/esm-loader`. Dependency upgrades were not applied to this audited release.
- First upload failed because its branch bindings were not selected. A subsequent attempt failed in the Google-font loader. The final retry with corrected branch metadata and build cache succeeded. Failed attempts remain in Vercel history and are not usable previews.
- The nested local staging build emitted a multiple-lockfile root-inference warning; the remote build used the configured monorepo root successfully.
- Browser visual/device checks, voice playback, French hydration and signed-in learning remain for manual validation. No accounts were created and no learning requests that write state were made.

## Scope preserved

No Production deployment or promotion, custom-domain connection, DNS changes, public website edits, database migrations, data changes, billing changes, SMS OTP implementation or subscription implementation were performed. No audited application source was edited during deployment preparation. The learner production target remains `dpl_qrqeL1qomMu434xDobMZysC9eSFc`; this release is a separate Preview.

Local evidence is held in ignored `.vercel/audited-private-preview-*` files, including the source/dry manifests, local build log, deployment CLI result, final project settings and HTTP check report. Preparation and read-only verification scripts are in `scripts/prepare-audited-private-preview.mjs`, `scripts/build-audited-private-preview.cjs`, `scripts/verify-audited-preview-package.cjs` and `scripts/check-audited-private-preview.cjs`.
