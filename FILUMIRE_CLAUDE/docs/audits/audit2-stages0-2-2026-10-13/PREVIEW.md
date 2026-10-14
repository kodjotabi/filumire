# Audit 2 Stages 0–2 protected Preview

Status: **READY**.

URL: https://filumire-learner-e2ufbhkyv-tabicrentsil-6879s-projects.vercel.app

Deployment: `dpl_EgRx1cXPwYFgdurnpKh8JkST9mah`

Existing project: `filumire-learner` (`prj_jozdDNN1pW1q5Ez66e32RvXhbYwC`). Target: Preview only; ordinary Preview deployments report a null API target. CLI explicitly used `--target preview`.

## Source and build verification

All 1,155 current local runtime files were copied byte-for-byte into a new staging directory. Compared with the earlier audited Preview package, this includes exactly eight corrected files and four new settings/preference files. The upload contains these files plus `.vercelignore`; no environment files, recovery archives or local build output were uploaded. Previous work and earlier staging/evidence files were retained.

Manifest SHA-256: `aeafa657aeff1cdcf1a8b2733510f2561703e7423dd6eb371e9dcef10dd34434`.

Hashes of original source, staging files and CLI dry-upload manifest matched before deployment and after the staged build. Deployment metadata confirms this fingerprint, `auditedLocalSource=true`, `gitDirty=1` and no Git source checkout. The existing branch-specific Preview bindings were selected using `githubDeployment=1` and `githubCommitRef=filumire-interface-testing`; no environment values were changed.

The interrupted attempt left no matching build process, build log or completed artifact. There was no recorded compiler failure. After inspection, the verified staging build was rerun and passed under Node 22. The remote build passed compilation, type/lint checks, all 33 static pages and function packaging, then reached READY.

## Protection and read-only checks

Vercel Authentication remains `all_except_custom_domains`. A fresh unauthenticated request to this generated Preview URL returned HTTP 302 to Vercel sign-in. Authenticated CLI requests confirmed:

- Login HTTP 200 with the Audit 2 Subscription link and availability wording.
- Dashboard HTTP 200.
- Served dashboard JavaScript HTTP 200 containing Additional Settings, System Default and Help & Support.
- Anonymous application session HTTP 401.

No sign-in, registration, learning-state write or database operation was performed on the Preview. These checks establish serving/protection and source inclusion; signed-in visual review remains for the user.

The existing production deployment ID remained `dpl_qrqeL1qomMu434xDobMZysC9eSFc`. No promotion, custom-domain/DNS changes, public website edits, migrations, billing activation or SMS activation occurred.

## Warnings

The remote dependency scan still reports eight vulnerabilities: four moderate, three high and one critical, plus deprecated esbuild-kit packages. No dependencies were upgraded in this deployment. The nested local staging build emitted a multiple-lockfile root-inference warning; both local and remote builds succeeded with the existing build configuration.

Ignored local evidence: `.vercel/audit2-preview-source.json`, verification/dry-upload manifests, build log, deploy result, final deployment metadata, before/after project metadata and HTTP results. No further implementation or deployment work follows this Preview.
