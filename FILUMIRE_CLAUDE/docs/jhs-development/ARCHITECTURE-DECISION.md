# JHS architecture decision — approved in principle

Execution approval received on 22 October 2026. The original proposal and its prior stop rationale below are retained as decision history. The inactive CCP runtime identity, Basic 8–9 source registry and guardian-only version-aware placement contract are now implemented. A loopback-only test preview exercises representative content; it does not activate the production learner interface or confer educational release approval. See `MINISTERIAL-PREVIEW.md` for the current scope and limitations.

## Verified boundary

Phase 8C deliberately registered Basic 7 as hidden/unsupported source data. Phase 8D supplies Basic 8-9 documentation mappings; it does not register runtime grades. The Phase 8E Science pilot registers a single competency through `registerIsolatedBasic7TestCurriculum`, restricted to a test process, memory persistence, an explicit test flag and no Vercel environment. Its `CompetencyDefinition` references `curriculum-gh-math-pilot` and `education-system-gh-basic-pilot`. Those legacy identifiers are test-adapter dependencies, not a truthful production CCP identity.

The first subject batch extends only this guarded test hook to accept additional competencies sharing exactly the same level/subject definitions. It cannot register Basic 8/9, cannot replace existing definitions and is not called by application code. The CCP source version remains inactive and Basic 7 hidden/unsupported in normal processes. The test fixture changes those objects only within its own memory process.

`setLearnerGrade` validates a grade against the learner's current curriculum version. Onboarding and placement do not yet provide an authorised transition from the primary pilot version to CCP. The Phase 8C report explicitly deferred this decision. Simply changing visibility/support flags or reusing the mathematics runtime ID would misrepresent support and cannot safely deliver the requested real JHS learner experience.

## Proposed design for approval

1. **Introduce a real, initially inactive CCP runtime identity.** Add a distinct runtime framework/system for the existing `curriculum-version-gh-nacca-ccp-2020` source version. Retain every mapped page/row competency ID and literal printed code. Do not rewrite or merge primary competency histories. The old Science test adapter remains explicitly isolated for regression compatibility.
2. **Register Basic 8 and 9 source hierarchies as hidden and unsupported.** Generate them from the immutable 390 Phase 8D rows, preserving duplicate codes, physical-grade assignments and source issues. Keep proposed source records separate from authored, evidence-ready runtime records. No automatic capability promotion from mapping counts.
3. **Add explicit authorised version-aware placement.** Design a guardian/authorised-staff placement operation that validates the target version, grade and reviewed subject scope together. It updates active version/grade/focus atomically, preserves prior states/evidence and has a defined resume path. Learner requests cannot self-promote or enable unsupported grades. Do not alter payment/subscription behaviour.
4. **Deliver the mature JHS presentation within the existing Learner App.** Use a grade/version-scoped presentation mode for JHS terminology, investigations, mathematical workings and independent writing/oral/practical tasks. Reuse supported submission, correction, accessibility, language and offline components. Keep Claude's learner-removal work untouched; agree the integration boundary before changing shared interface files. The current neutral test preview is not this production interface.
5. **Retain learning rules and trust boundaries.** No new mastery thresholds, independent-evidence shortcuts or multiple-choice substitution for performance. Productive evidence uses existing authorised teacher review with delivery provenance; guided work stays guided. If a task needs an unsupported secure evidence-capture method, stop for a separate design decision rather than inventing a score.
6. **Keep activation separate from authoring.** Only educator/French-reviewed subject batches with validated learner journeys become eligible for a controlled release. Basic 8 follows validated Basic 7 foundations, then Basic 9. Preserve an exact 625-entry matrix after each batch, with separate authored, technically validated, educationally approved and public-active states.

## First implementation after approval

Implement the inactive CCP runtime identity and hidden Basic 8/9 structural registry, with compatibility and negative-visibility tests. Define and test the placement contract before wiring onboarding or public navigation. No existing learner is migrated or regraded automatically. No deployment is included in this decision.

Required acceptance checks: unchanged Basic 4-6 definitions/evidence; all 625 IDs and source flags preserved; rejected unauthorised/unsupported placement leaves context unchanged; valid controlled placement is atomic and resumable; both languages retain question identity; teacher/practical evidence remains trusted; offline learning remains Learner-App-only; public activation remains disabled until review gates pass.

## Why work stops at this boundary

The user's execution instruction explicitly requires stopping for major architectural decisions. Production curriculum identity, cross-version placement and shared JHS presentation span the framework, profiles, persistence and learner interface. They are a substantial extension, not a content-only batch. The safe Science batch and exact coverage matrix are prepared and independently tested first; approval is now required for this concrete design before production integration. This is not a request to change mastery rules or approve educational content without review.
