# Basic 7–9 Preview Discrepancy Investigation

Date: 2026-10-25  
Status: **Promotion stopped; investigation report only**  
Release branch: `release/production-2026-10-25`  
Release commit: `c0ef6232b8f9b629fe4b333c47e3cbbc8a74a8a4`

## Finding

Basic 7–9 is absent from the READY Preview because the release Preview does not have the private-presentation runtime switch, and the learner interface independently has an explicit Basic 7–9 readiness switch set to `false`. This is a configuration/UI gating discrepancy, not evidence that Vercel built the wrong revision.

The Preview’s public `/api/presentation-scope` endpoint returned `{"enabled":false}`. The Vercel environment-variable inventory showed `FILUMIRE_JHS_MODE=private-presentation` scoped to Preview branch `filumire-interface-testing`, but no entry scoped to `release/production-2026-10-25`. The production-scoped setting is separate. The release deployment therefore evaluates `isPrivateJhsEnabled()` as false. The content seeder exits before loading the restricted Basic 7–9 scope, and the framework reports no supported private JHS placement choices.

There is a second, independent presentation gate in `apps/learner/components/filumire/ageBand.ts`: `JUNIOR_HIGH_INTERFACE_READY` is `false`. The checked-in `tests/age-interface.test.ts` explicitly requires this setting to remain false and tests Basic 7–9 falling back to the primary band. The deployed build runs with production-mode assets, so the development query-string preview does not enable this interface.

Basic 4–6 remain visible because `apps/learner/components/filumire/grades.ts` statically lists only those three grades and the learner UI defaults to the primary age band. A further integration gap is that setup/account class selection consumes this static list, while guardian placement also has a dynamic server-side choice API. Merely correcting the Preview environment value would not make every Basic 7–9 UI path complete.

## Deployment identity and curriculum safety

The inspected Preview is Git-backed from `kodjotabi/filumire`, branch `release/production-2026-10-25`, exact commit `c0ef6232b8f9b629fe4b333c47e3cbbc8a74a8a4`; it reached READY. The release worktree is clean apart from its untracked deployment-report directory. This points away from a stale or wrong-source build.

The release code’s scope is formed from `jhs-private-manifest.json` plus `jhs-approved-manifest.json`; the approval manifest remains empty. The separate integration validation records 42 restricted baseline topics, 544 new review drafts, and 39 source-blocked indicators. No evidence indicates the 544 drafts were approved or activated. Keep the approval catalogue empty and the blocked indicators excluded throughout remediation. The current Preview’s disabled flag means it does not expose even the intended restricted review presentation.

## Affected release files

- `packages/curriculum/jhs-private-policy.ts` — controls the private-presentation environment gate.
- `services/content-store/jhs-private.ts` and `services/content-store/seed.ts` — gate and seed the restricted scope.
- `packages/curriculum-framework/index.ts` and `services/learner-context/placement.ts` — expose supported grades and placement choices only when the private scope is enabled.
- `apps/learner/app/api/presentation-scope/route.ts` — reports the request-time scope state; it returned disabled in the Preview.
- `apps/learner/components/filumire/ageBand.ts` and `tests/age-interface.test.ts` — hard-disable the JHS presentation and encode that state in a test.
- `apps/learner/components/filumire/grades.ts` and `SetupClassField.tsx` — hard-code class options to Basic 4–6.
- `apps/learner/app/family/page.tsx` and `apps/learner/app/adult/page.tsx` — include static class-list fallback/display paths which need review alongside the dynamic placement API.

These are findings, not edits. No application code, Vercel setting, approval, data, or production deployment was changed in this investigation.

## Corrective action before any promotion

1. Keep production promotion stopped.
2. Confirm the intended authenticated Preview audience and expose only the already restricted 42-topic presentation to that protected Preview. Correct the release-branch Preview configuration narrowly; preserve the existing testing-branch value and do not broaden the variable to other Preview branches. Do not add or approve drafts.
3. Resolve the interface readiness gate deliberately: enable the JHS interface only in the intended private review context, or retain the production lock while providing a Preview-only gate. Do not simply flip the hard-coded readiness constant for production.
4. Complete the grade-selection integration so learner setup, family placement, adult display, and learner navigation agree with the server’s supported placement choices. A private placement must remain unavailable outside the protected review environment.
5. Rebuild the exact release commit and verify the protected Preview manually with authorized reviewer authentication, in English and French. Verify Basic 7–9 navigation and subjects, and verify that only the 42 restricted topics appear; the 544 drafts remain inactive and all 39 blocked indicators remain excluded.
6. Only after UI, API, content-scope, learner-progress, and approval-gate checks pass should a separate deployment decision be made. This report does not authorize promotion.

## Regression tests required

- Environment-scope test: intended release Preview enables private presentation; unrelated Preview branches and ordinary production do not. Production reviewer mode follows its existing explicit access gate.
- Scope invariant test: the enabled private Preview exposes exactly the existing restricted manifest; empty approval catalogue remains empty; no new draft or blocked indicator is registered.
- API tests: `/api/presentation-scope` and authenticated placement choices agree with the environment gate; unsupported grade/subject combinations are rejected without persistence writes.
- UI tests: Basic 4–6 remain intact; Basic 7–9 appear in the protected review Preview through learner setup and guardian placement; production and ordinary Preview retain their intended grade set. Cover desktop, tablet, mobile, English, and French.
- Learner safety tests: preserve existing progress and assessment identifiers; private placement does not migrate or overwrite historical evidence; existing restricted topics retain their fingerprints.
- End-to-end manual journey: authenticated reviewer creates/places a test learner in a supported Basic 7–9 context, opens My Learning, follows subject/topic navigation, switches language, and confirms the restricted content boundary. Repeat production-facing checks to confirm no unapproved curriculum is exposed.
- Build/deployment test: exact release SHA, branch-scoped variables and protected-deployment status are visible in the deployment record before manual verification.

## Decision

**NO-GO for promotion.** The Preview is READY as a deployment, but Basic 7–9 is not available in its runtime presentation. The release needs the narrow Preview configuration and UI integration corrected and manually verified first. No unapproved content may be activated as a workaround.
