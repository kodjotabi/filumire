# Phase 8C: hidden Basic 7 framework integration

Completed 22 October 2026. Basic 7 is registered for curriculum inspection only. No learner activation, lessons, runtime assessments, database changes, commits, pushes or deployments occurred.

## Registration

| Subject | Proposed competency registrations | Detailed hierarchy nodes |
| --- | ---: | --- |
| English Language | 53 | 5 strands, 13 sub-strands, 23 standards, 53 indicators |
| Mathematics | 74 | 4 strands, 12 sub-strands, 20 standards, 74 indicators |
| Computing | 55 | 4 strands, 14 sub-strands, 18 standards, 55 indicators |
| Science | 53 | 5 strands, 20 sub-strands, 27 standards, 53 indicators |
| Total | **235** | **400 nodes**, including 235 indicator nodes |

All proposed competency IDs, original printed indicator/standard codes, PDF hashes/URLs/pages, hierarchy links, numbering decisions, source issues, Phase 8A flags and Phase 8B review records are preserved from the input mapping. Three Computing duplicate-code groups still have six separate internal competency identities. The English missing official sub-strand title remains null with an explicit review flag and nonofficial tooling placeholder. No aliases replace printed codes.

## Architecture and learner restrictions

The existing framework has structural curriculum nodes and competency mappings separately from runtime `CompetencyDefinition` records. Phase 8C introduces typed `FrameworkCompetencyRegistration` records for the 235 proposed competencies and links them through the existing mapping accessors. `getFrameworkCompetencyRegistration` and `getFrameworkCompetencyRegistrationsForSubject` expose source registrations; `getCurriculumSourceIssue` exposes the preserved issue records.

The teachable runtime registry in `packages/curriculum` is unchanged: Basic 7 entries do not appear in `getCompetency` or `getCompetenciesForSubject`. This deliberately avoids fabricating difficulty, subskills, prerequisite edges or mastery thresholds simply to satisfy a runtime type. No Basic 7 learning content is generated or seeded.

The CCP version is inactive; Basic 7 is explicitly hidden and unsupported; all four subject capabilities are unsupported. Structural `resolveCurriculumContext` can resolve the CCP version for tooling, while learner subject availability, supported-grade enumeration and initial-competency lookup reject it. Explicit availability/initial-topic guards enforce the inactive version and hidden/unsupported grade. Existing placement services continue to use these gates; no version-switching profile behavior is introduced.

Basic 7 is absent from the onboarding grade list, supported grade/subject listings, English/French topic navigation, normal learner overview payloads and runtime lesson lookup. Rejected grade, subject and competency placement attempts preserve the learner's existing context. Activating only the version or changing only visibility is insufficient to expose the grade. Built public assets also contain none of the new registry identities.

The source data is generated deterministically at development time, not parsed from PDFs or documents at runtime. Generated input hashes permit review against Phase 8B. The additional source metadata is server-side; no client component was changed.

## Files changed in Phase 8C

Modified:

- `packages/curriculum-framework/index.ts`: additive source registration, CCP version/phase/grade/subject/node/mapping entries, provenance types, source accessors and availability restrictions. Earlier uncommitted Basic 4 framework repairs in this file were retained.

Created:

- `packages/curriculum-framework/ghana-b7-ccp.ts`: typed source registry adapter and IDs.
- `packages/curriculum-framework/ghana-b7-ccp-data.json`: generated 235 registrations, 400 nodes and preserved source issues/review metadata.
- `scripts/generate-b7-framework.mjs`: generator and read-only `--check` mode.
- `tests/b7-framework-registration.test.ts`: source/hierarchy/identity/visibility/placement integration tests.
- `tests/b7-existing-curriculum-regression.test.ts`: pre-change fingerprints for all 12 Basic 4-6 subjects.
- This report.

No existing Basic 4-6 content files, production learner components, grade-selector file, placement services, domain evidence model, dependency manifests, official PDFs, Phase 8A/8B artifacts or storage-cleanup files were edited. Existing unrelated uncommitted changes remain present. Normal build output under `apps/learner/.next` was produced by the authorized local build.

## Verification

Before integration, seven relevant existing suites passed, and fingerprints were captured from the actual working tree (including the user's earlier uncommitted repairs).

Post-integration automated suites: **14 passed, 0 failed**.

New suites:

- `b7-framework-registration`: all 235 source entries, unique competency/node identities, 400-node hierarchy, exact printed codes, duplicate code groups, PDF hashes/pages, original flags/issues, mapping round trips, inactive/hidden/unsupported restrictions, unavailable EN/FR navigation, rejected placement and unchanged existing context.
- `b7-existing-curriculum-regression`: all 12 Basic 4-6 subjects have exactly the pre-change definitions, capabilities, hierarchy, competency mappings, EN/FR topic identities/order and authored content. Volatile content timestamps are excluded from fingerprints.

Existing regression suites:

- `curriculum-framework`
- `b4-framework-registration`
- `grade-aware-subject-selection`
- `guardian-grade-lock`
- `curriculum-navigation`
- `selected-topic-lesson-integration`
- `content-language-selection`
- `immediate-correction`
- `api-evidence-integrity`
- `assessment-external-evidence`
- `retention-transfer`
- `spaced-revision-subjects`

Commands:

```text
node scripts/run-offline-suites.mjs b7-framework-registration b7-existing-curriculum-regression
node scripts/run-offline-suites.mjs curriculum-framework b4-framework-registration grade-aware-subject-selection guardian-grade-lock curriculum-navigation selected-topic-lesson-integration content-language-selection immediate-correction api-evidence-integrity assessment-external-evidence retention-transfer spaced-revision-subjects
node scripts/generate-b7-framework.mjs --check
node docs/curriculum-sources/ghana/ccp-b7-b9/validate-basic7-mapping.mjs
npm.cmd run build:learner
```

Generator check passed: generated data exactly matches the verified mapping inputs. Phase 8B validation passed again: 5,069 saved mapping checks and the preserved 2,132 source-review assertions. Its frozen Phase 8A inputs remain unchanged.

**Build passed:** Next.js 15.5.23 compiled successfully, passed type checks and generated all 34 pages. The first attempt was blocked by sandbox `spawn EPERM`; the authorized rerun outside the sandbox succeeded. Local build guard mode was `local`; memory persistence and an unreachable PostgreSQL URL were explicitly set. No deployment or database operation was performed.

After the build, 68 client/static HTML assets were scanned: none contain the Basic 7 grade, proposed competency or CCP version identities. This confirms the source registry was not included in those public build assets. No interactive browser or real-database testing is claimed. The full unrelated test suite was not run.

## Remaining concerns and Phase 8D

The 11 unresolved source issue groups (12 directly affected mapping rows) remain preserved. In particular, duplicate/malformed Computing codes, its embedded Basic 8 reference, the missing English heading, Mathematics scope/count conflicts and unauthenticated Phase 8A HTTP transport are not resolved by framework registration.

An eventual learner release requires explicit authorized version-aware placement: the current grade setter validates against the learner's existing version. Phase 8C intentionally does not migrate anyone or add version switching. Practical/oral/constructed-response evaluation, bilingual subject review, independent mastery and retention/transfer content also remain prerequisites for activation. Structural registration is not a full-capability claim.

**Recommend Phase 8D:** review and freeze the remaining source/identity decisions and design/test authorized CCP version-aware placement while retaining the hidden grade. Then prepare a bounded Science Materials pilot under `B7.1.1.1` (three indicators, PDF 39-40), with reviewed activity/evidence requirements before separately authorized lesson authoring. Keep Basic 7 unavailable until the pilot and its learner/evidence release criteria pass.
