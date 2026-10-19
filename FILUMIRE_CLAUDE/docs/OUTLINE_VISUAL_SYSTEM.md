# FILUMIRE Outline Visual Learning System — Phase 1

The rendering system is curriculum-neutral. The initial reviewed content adapter covers six existing topics: Basic 4 equivalent fractions, simple sentences, plant parts and computer parts; Basic 5 equivalent fractions; Basic 6 printing web pages. No learner state, authentication, assessment scoring, curriculum sequencing, database schema or Ask FILU response logic is changed.

## Architecture

- `packages/contracts/outline-visual.ts`: bounded, typed learner DTOs and runtime validation. Primitives represent part–whole models, number lines, labelled geometry, sentence strips and ordered processes. Coordinates, collection sizes, fractions and strings are validated; unknown/hidden properties and raw markup are rejected. Geometry primitives can be reused for shapes, apparatus, devices and other diagrams. Dedicated graph, measurement, branching-flow and story-illustration families remain later work.
- `services/outline-visuals/pilot.ts`: explicit curriculum/content review declarations and bilingual authored models. Curriculum identifiers are opaque binding data, never parsed by a renderer. Specific worked examples are mapped to their exact source, including 2/3 = 4/6 and 3/4 = 6/8. Basic 5's generic existing lesson receives a concrete, mathematically valid supplementary fraction model without rewriting its lesson text.
- `services/outline-visuals/index.ts`: server-only canonical content lookup and source-review verification. An approval digest covers each pilot's entire existing content pool, including language variants, question options and metadata. Any source change invalidates the approval. Delivery DTOs contain only the selected representation: no metadata, answer keys, approval digests or unused solution variants. No client-side registry or public diagram lookup endpoint is introduced.
- `OutlineVisual.tsx`: shared responsive SVG/HTML figures. Equal-size partitioned bars replace the former inaccurate quarter-circle. Hatching supplements colour; labelled diagrams use numbered markers with readable DOM legends; English sentence examples retain `lang=en` under French explanations. Titles, descriptions and captions accompany each SVG. Existing palette variables, scoped dark-mode variables and local fonts are used. No animation, external asset requests, raw SVG injection or new rendering dependency is required.
- The existing learning API attaches optional `visuals`; older clients/content without visuals continue to work. Display checks bind content ID, version, topic, language and stage. Learning stages remain presentation of existing adaptive actions; viewing visuals cannot complete a stage or create mastery evidence.
- Verified lesson closure resolves reflection visuals from the completed receipt's source and explicit translation relationship, never the next topic. Reflection visual delivery also fails closed during scored or uncertain activity, including a delivered instruction check without live session provenance. Existing text summaries are unchanged.

## Stage and assessment policy

Understand displays reviewed instructional content for `teach`/`remediate`. Reflect can display the same reviewed model after completion and receipt verification. Practise, Apply and Check retain their existing text-first questions in Phase 1: the reviewed pilot questions already state their givens, and labelled teaching figures could cue the assessed response. This is an explicit pedagogical decision for those questions, not an automatic classification of every assessment or unimplemented topic.

Every `assessmentItemId` is denied visual delivery regardless of action, question format or available options. Unknown actions, mismatched languages/versions/topics, stale reviews and forged unscored copies of canonical assessed content are denied. The client independently suppresses supplied teaching DTOs on scored activities. Neither hiding text with CSS nor changing alternative descriptions constitutes protection. Future scored diagrams need a separate task-specific approval and accessible representation containing only the givens; no scored visual authoring is enabled here.

`safeTeachingVisualReferences` prepares versioned, topic-bound references and descriptions for a future tutor adapter. It returns nothing for protected contexts or scored stages. It is deliberately not connected to Ask FILU in Phase 1, so its current responses, independent-concept allowances and assessment safeguards remain unchanged.

## Coverage and review

`npm run coverage:visuals` prints totals; append `-- --json` for the full machine-readable inventory. It enumerates the registered curriculum version through the existing framework adapter, supported grades and available subjects. A future Cambridge/national adapter can supply another registered curriculum version to `buildVisualCoverage`; no country or grade names are embedded in rendering or coverage logic. Cambridge content is not registered or claimed as covered today.

Current scope: **862 learner topics, 12 subject/grade combinations, four subjects, Basic 4–6**. This is the runtime learner catalogue, not a claim of complete coverage of every official curriculum indicator.

Each topic has EN/FR cells for Understand, Practise, Apply, Check and Reflect:

- **Complete:** all current instructional content in that language has approved, valid source-bound visuals for the relevant instructional/reflection stage.
- **Required:** a declared requirement has a missing binding, missing content/translation or stale source review.
- **Text-first:** an explicit reviewed reason supports the existing textual activity.
- **Unreviewed:** no visual requirements review has been performed. No keyword or title inference promotes it to Complete or Text-first.

A topic is Complete when every stage/language cell is Complete or explicitly Text-first and at least one cell is Complete. A wholly text-first topic can aggregate to Text-first. Any missing required/unreviewed cell in a partially reviewed topic aggregates to Required.

Initial totals: **6 Complete for Phase 1, 0 Required, 0 wholly Text-first, 856 Unreviewed**. The six pilots have **48 bilingual instructional content bindings** (lesson, example, scaffold and remediation) reusable for verified reflection. There are **24 Complete stage/language cells**, **36 explicitly Text-first cells**, and **8,560 Unreviewed cells**. Complete here does not mean every stage has an illustration, that scored diagrams are implemented, or that subject-expert curriculum sign-off has occurred.

To extend coverage: review the source and pedagogical need first; add an explicit binding and EN/FR labels/descriptions; validate geometry and task safety; pin the reviewed source digest; increase the visual revision when its authored representation changes; run the focused suites and review mobile screenshots. Do not renew a digest merely to silence a stale-review failure. Keep unsupported or unsuitable visuals absent, with an honest coverage status.

## Verification commands

- `npm run test:outline-visuals`: memory-only contracts, geometry, all scored-content exclusions, coverage, bilingual binding and real six-topic learning API/closure/practice journeys. Included in the default offline security suites.
- `npm run test:outline-visuals:browser`: requires `FILUMIRE_PERSISTENCE=memory` and an installed Playwright/Chromium. Optional `FILUMIRE_PLAYWRIGHT_MODULE` and `FILUMIRE_CHROMIUM_PATH` select existing installations; nothing is downloaded. Uses Next's actual styled-jsx compiler, loopback-only requests, EN/FR, four widths, light/dark themes and DOM accessibility/assessment checks. Screenshots are written to ignored `.vercel/outline-visuals/`.

Remaining work includes review of 856 topics, additional semantic visual families, reviewed scored-task diagrams, broader subject-expert/accessibility review and any separately approved tutor integration. No push, hosted configuration change or deployment belongs to this phase.
