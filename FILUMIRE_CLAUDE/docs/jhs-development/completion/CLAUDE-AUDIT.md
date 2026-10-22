# Rolling independent-audit handover — incomplete programme

This packet supports independent review of completed batches. It is **not** the requested final handover for all four completed JHS subjects. The authoritative current matrix is `competency-matrix.json`; the historical 14-indicator ministerial preview and its source snapshot are retained separately and must not be overwritten with an invented completion claim.

## Current checkpoint

625 physical mapped NaCCA entries retain unique internal IDs and literal printed codes. After batches 02–04, 42 have draft bilingual content and exact-fingerprint API/browser validation; **583 await authoring**. Basic 7 Science is 31/53 authored and technically validated; English/Mathematics/Computing remain 1 representative each. Basic 8 and 9 remain 1 representative per subject. All 625 remain unapproved for public release. `coverage-summary.json` enumerates all twelve combinations. `unresolved-source-rows.json` identifies 39 rows with unresolved row-specific issues; global source/assessment-reference issues also remain recorded for every affected row. `coverage-history.json` reconstructs complete-versus-remaining states by validated batch sequence; it does not invent historical execution timestamps.

`batches03-04-REVIEW.md` records the next fifteen indicators, verified references, complete exemplar scope, tests and practical/human-review boundaries. Batch 03 adds nine systems indicators and batch 04 adds six energy indicators, with 390 new bilingual records. Current cumulative authored content is 1,092 records; independent educator/French approval is still pending.

## Batch 02 — Basic 7 Science foundations

13 source entries on SCIENCE.pdf PDF pages 41–52 (printed pages 4–15): periodic table; separate animal/plant cells; water-cycle process and importance; housefly cycle and intervention; nutrient-source inventory and practical application; animal identification, classification, household/commercial uses and observation research. The source image/text proof is in `batch02-b7-science-foundations/source-review/`.

The two cell indicators retain `RES-SCI-CELLS` exactly. Its pre-existing status is `resolved_clarification`, not an unresolved ambiguity. The isolated registry now distinguishes that from unresolved/unknown issues; both remain blocked. No source record, official code or source PDF was changed to achieve this.

Content: `services/content-store/jhs-b7-science-foundations.ts`; batch registry: `jhs-completion-batches.ts`. There are 338 new records: two languages × thirteen entries × thirteen records. Each entry includes explanation, worked example/activity, scaffold, remediation, guided practice, two diagnostic tasks, two reassessments, two knowledge-retention checks and two transfer activities. All independent diagnostic/reassessment/transfer items use existing trusted teacher review. New authoring-specific subskills/misconception labels are internal teaching design, not newly invented NaCCA indicators.

Practical application of nutrient sources remains pending without real permitted field activity observed by a teacher. Paper models, quiz answers and self-reported claims do not establish it. Animal investigations require real evidence and honest survey scope; unsafe contact and invented observations are excluded. A fictional teacher fixture is never an educator approval.

## Educational review points

- The source does not enumerate every cell organelle. The draft teaches an explicit typical-cell set and preserves specialisation/observation limits; an educator must confirm the expected depth and resources.
- The source’s water-cycle “clean water” example is explained without inferring potability. Condensation releases transferred energy; it does not create energy.
- The animal-classification parent heading contains a problematic parenthetical about poultry and herbivory. It is preserved in the official source. Draft teaching explains poultry as a bird-management category, distinguishes ruminant digestion and avoids a universal herbivore claim. This clarification still needs subject review.
- Crop/material doses are not supplied or invented. Comparisons and practical application require verified crop/product guidance, permitted materials and qualified supervision. Missing guidance/equipment leaves performance unfinished.
- Names/symbols for the first twenty elements are taught explicitly. Boron/silicon are not forced into an inaccurate metal/non-metal binary; the draft acknowledges metalloids.
- French is explicitly authored and marked pending French review. No fallback text is represented as an approved translation. Teacher-approved images, periodic tables and field resources remain genuine external activity dependencies.

## Verification

`batch02-b7-science-foundations/validation.json` records 52/52 new API cases, 52/52 new browser cases, 20/20 targeted regression suites, TypeScript and production build. The preserved preview was rerun in 56 API and 56 browser cases. Checks cover both languages; desktop/mobile; teaching first; mistakes and guided retry; no guided mastery; pending review; fictional reviewed correction; transfer; interruption and due correct/incorrect retention. The original Materials adapter remains separately tested.

The preservation test evaluates the prior verified source-snapshot module in memory and compares all 14 previous definitions and 364 bilingual records, excluding only generated timestamps. The Basic 4–6 fingerprint regression checks all twelve subjects. The coverage generator accepts API/browser results only when their content/competency SHA-256 fingerprints match the current records, preventing stale results from promoting edited content.

Reproduction from this worktree:

```powershell
node --import tsx scripts/jhs-preview-source-proof.mjs --science-foundations
node scripts/run-offline-suites.mjs jhs-science-foundations-content jhs-science-foundations-journey jhs-preview-preservation b7-existing-curriculum-regression
node --import tsx scripts/jhs-completion-coverage.ts
node scripts/validate-jhs-completion-batch.mjs
```

For the existing browser runner use `NODE_ENV=test`, `FILUMIRE_PERSISTENCE=memory`, an unreachable `DATABASE_URL`, `FILUMIRE_BASIC7_PILOT=test-only`, `FILUMIRE_JHS_PREVIEW=test-only`, and `FILUMIRE_JHS_BATCH=batch02-b7-science-foundations`, plus the existing Playwright module/Chromium path. Run `node --import tsx tests/jhs-materials.browser.mjs`. It binds an ephemeral loopback port and shuts down afterwards. Do not enable this test adapter in a deployed environment. Without `FILUMIRE_JHS_BATCH`, the earlier preview scope remains unchanged.

No production seed imports the completion batches. No grade/public interface is activated. No payment changes, destructive operations, other-worktree writes, commits, merges, pushes or deployments occurred. Real PostgreSQL persistence, full cold-start service-worker delivery, real practical/oral observation, subject-wide prerequisite/progression design and production learner/parent/teacher interface integration remain unverified; this fixture coverage does not conceal those gaps.

## Next implementation work

Continue the remaining 22 Basic 7 Science indicators from PDF page 68: electronics, conservation, forces/machines, then tools and environmental/health topics. Inspect continuation pages as well as leading codes before writing. Current public-health content must be checked against authoritative current references when developing disease indicators. Preserve row-specific source issues, obtain evidence for any resolution and escalate genuinely unreadable or contradictory requirements. Then complete the other Basic 7 subjects in validated batches, followed by Basic 8 and Basic 9. Keep the 625-entry denominator, validation fingerprints and independent-review gates throughout. The programme is still active; this packet is a checkpoint, not integration authorisation.
