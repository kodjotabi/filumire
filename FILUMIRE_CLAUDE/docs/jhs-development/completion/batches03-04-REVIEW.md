# Batches 03–04: Science source and independent-review notes

Status: draft, hidden, technically exercised in isolated fixtures. No educator or French approval, real learner performance or deployment is claimed. Both batches use the same existing engine, policies, trusted teacher-review service and signed-session API as the earlier preview. No production seed imports the content modules.

## Source scope and integrity

Batch 03 covers nine Basic 7 Science source entries on SCIENCE.pdf PDF pages 53–62, including continuation pages 59 and 61. Subjects: food/nutrients, digestive stages, digestion products/absorption/practical food tests, inner planets, Mercury/Venus, ecosystems, farming-system distinctions, classification and usefulness/debate. There are 234 authored bilingual records.

Batch 04 covers six source entries on PDF pages 63–67, including the mathematical energy exemplar continued onto page 65. Subjects: energy forms, daily applications and PE/KE mathematics, transfer through gas/plastic/metal/liquid, light/optics, thermal/nuclear generation and environmental debate. There are 156 authored bilingual records.

The four optical effects are not reduced to the indicator heading: straight paths, reflection, refraction and dispersion are explicitly taught, tasked and required in both-language practical rubrics. Source activities, not only titles, were checked in the rendered PDF. The exact printed ecosystem code `B7.3.3.1. 1` remains unchanged. No official PDF, mapping ID or existing source flag was corrected by this authoring work.

## Scientific corroboration

The NaCCA PDF supplies the curriculum requirements. These primary references corroborate scientific explanations; they are **not** additional NaCCA requirements, publisher errata or educator approvals:

- [NIH/NIDDK: Your Digestive System & How It Works](https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works): distinguishes digestion/absorption and intestinal roles. The draft distinguishes blood/lymph pathways at an introductory level and does not diagnose a learner.
- [NASA Mercury facts](https://science.nasa.gov/mercury/facts/) and [NASA Venus facts](https://science.nasa.gov/venus/venus-facts/): corroborate relative orbital periods, atmospheric differences and the distinction between rotation and orbital movement.
- [FAO crop–livestock systems](https://www.fao.org/4/y0501e/y0501e03.htm) and [FAO crop planning in organic agriculture](https://www.fao.org/family-farming/detail/en/c/1617788/): support context-dependent systems and overlapping practices. The narrower school contrast of mixed crops versus crop/livestock enterprise is made explicit. Formal certification is not inferred.
- [EIA electricity generation](https://www.eia.gov/energyexplained/electricity/how-electricity-is-generated.php) and [EPA generation/environment](https://www.epa.gov/energy/centralized-generation-electricity-and-its-impacts-environment): corroborate simplified conversion chains and distinct air/water/waste effects. Claims about current Ghanaian generation shares or plant measurements are not invented.

The former FAO organic FAQ URL returned 404 during checking. It is not represented as a successfully verified source. The draft's generic management explanation remains subject to educator review; it makes no claim of Ghanaian certification compliance.

## Required human review and practical boundaries

1. The food source includes comparison of people who have experienced inadequate intake with apparently healthy people. The draft uses respectful teacher-supplied fictional illustrations/histories, distinguishes observation from diagnosis and forbids body-ranking classmates or a deprivation experiment. This is an explicit pedagogical adaptation for review, not a silent change to the printed source. Appearance alone is not used as a health assessment.
2. The absorption source includes **actual tests** for starch, glucose, protein and lipids. An explanation/animation cannot establish that practical. Checked school protocols, known controls, suitable equipment, authorised learner roles and direct qualified observation are required. No chemical quantities/heating recipe or invented results are supplied. Reducing-sugar evidence is not treated as uniquely glucose-specific.
3. Models of the solar system must actually be independently constructed and inspected. The draft explains scale limitations and galaxy/system distinctions. It does not award construction credit for a selected answer.
4. “Self-sustaining” ecosystems are not taught as closed systems that create energy. Arboreal and terrestrial labels can overlap. Both leading and continuation exemplars are covered.
5. Farm classifications need practice/time/plot evidence, not crop names alone. Community records and observed discussions/debates must be genuine; fictional cases remain labelled fictional. Organic practices do not establish certification or universal benefits.
6. Mechanical-energy examples preserve units, reference height and supplied g; `PE=mgh`, `KE=½mv²`, and mechanical energy `PE+KE` are not omitted. The worked example gives 40 J, 9 J and 49 J, with doubled speed giving 36 J KE. These are classroom calculations, not dangerous lifting/dropping tasks.
7. Heat activities need a teacher-approved safe protocol across the four source media; optics uses approved visible light only. No unapproved heating, direct solar viewing or lasers are proposed. An unavailable/unperformed activity remains pending. Ordinary offline text/quiz evidence cannot replace a practical.
8. Fossil thermal and nuclear examples both use heat-based pathways. Nuclear is not represented as chemical burning or impact-free; no plant operating instructions, nuclear-material handling or investment recommendation is included.

## Verification and known failure

Batch 03: 36/36 API cases, 36/36 browser cases, 11/11 targeted suites, TypeScript and production build passed. Batch 04: 24/24 API cases, 24/24 browser cases, 13/13 final targeted suites, TypeScript and production build passed. API fixtures cover EN/FR, teaching, errors, guided retry, pending review, fictional reviewed correction/mastery, transfer, interruption and due correct/incorrect retention. Browser fixtures cover EN/FR, 390/1280px, actual displayed answers, correction, retry, language identity, offline answer queue/synchronisation and unchanged pending-review progress.

The first energy content check failed because the French practical rubric referred to “the four effects” without explicitly naming dispersion. The French rubric now names all four. The assertion was retained; `batch04-b7-science-energy/regressions.log` preserves the failed run and `regressions-final.log` records the passing rerun. This was an authoring/rubric correction; mastery/evidence rules were not changed.

Technical fixture success does not approve scientific depth, French wording, laboratory resources, actual practical performance, real PostgreSQL, full service-worker delivery, production JHS interface or subject-wide progression. The original 14 preview definitions and 364 records still match the prior source snapshot; primary fingerprints and inherited origin hashes remain protected.

Reproduce each with the corresponding `jhs-science-systems-*` or `jhs-science-energy-*` suites. Browser runner uses `FILUMIRE_JHS_BATCH=batch03-b7-science-systems` or `batch04-b7-science-energy` plus the established guarded memory/test environment. Source proof uses `--science-systems` or `--science-energy`. Reconcile with `node --import tsx scripts/jhs-completion-coverage.ts`, then run `node scripts/validate-jhs-completion-batch.mjs <batch-id>` and `node scripts/jhs-completion-history.mjs`.
