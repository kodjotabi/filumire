import { seedContent } from "../services/content-store/seed";
import { getContentForCompetency } from "../services/content-store/index";
import { selectLearningContent } from "../services/content-selection/index";
import { createInitialLearnerState } from "../services/learner-state/index";
import { getAllSubjects, getCompetenciesForSubject } from "../packages/curriculum/index";
import type { LearningContent } from "../packages/content";
import { assert, newLearner, decide, answer, wrongOption, isQuestion } from "./repro-4a-helpers";

/*
 * TRANCHE 4B STEP 1: content selection and policy (regression).
 * Replaces the selection parts of tests/repro-4a-card-loop.test.ts.
 *
 * - Question actions serve an eligible question before any card;
 *   "practice" serves unused mastery questions once the practice item is used.
 * - Purpose pools: diagnose/reassess/practice never take retention or
 *   transfer items; retention/transfer checks only take their own items
 *   (fallback to mastery items only where a topic authors none).
 * - A wrong diagnostic answer is not a failed intervention.
 *
 * Run: npx tsx --env-file=.env.local tests/adaptive-selection-4b.test.ts
 */

seedContent();

const EN_B5 = "competency-gh-english-b5-3-5-1-1";
const MATHS_B5 = "competency-gh-math-b5-1-1-1-1";
const TINY_B4 = "competency-gh-math-b4-number-patterns-001";

const purposeOf = (item: LearningContent | undefined) => item?.metadata?.assessmentPurpose ?? item?.type;

function purposePools() {
  for (const competencyId of [EN_B5, MATHS_B5]) {
    const state = createInitialLearnerState("learner-4b-pools", competencyId);
    const items = getContentForCompetency(competencyId, "en");
    const masteryIds = items
      .filter((item) => item.assessmentItemId && !["retention", "transfer"].includes(item.metadata?.assessmentPurpose ?? ""))
      .map((item) => item.assessmentItemId!);
    const masteryContentIds = items.filter((item) => masteryIds.includes(item.assessmentItemId ?? "")).map((item) => item.id);

    assert(purposeOf(selectLearningContent(state, "diagnose", [], [])) === "diagnostic", `${competencyId}: diagnose serves a diagnostic item`);
    assert(purposeOf(selectLearningContent(state, "reassess", [], [])) === "reassessment", `${competencyId}: reassess serves a reassessment item`);
    assert(selectLearningContent(state, "practice", [], [])?.type === "practice", `${competencyId}: practice serves the practice question first`);
    assert(purposeOf(selectLearningContent(state, "retention_check", [], [])) === "retention", `${competencyId}: retention check serves a retention item`);
    assert(purposeOf(selectLearningContent(state, "transfer_check", [], [])) === "transfer", `${competencyId}: transfer check serves a transfer item`);

    const practiceItem = items.find((item) => item.type === "practice")!;
    const afterPractice = selectLearningContent(state, "practice", [practiceItem.assessmentItemId!], [practiceItem.id]);
    assert(isQuestion(afterPractice) && purposeOf(afterPractice) === "reassessment", `${competencyId}: practice serves an unused mastery question after the practice item (got ${afterPractice?.id})`);

    for (const action of ["diagnose", "reassess", "practice"] as const) {
      const selected = selectLearningContent(state, action, masteryIds, masteryContentIds);
      assert(!isQuestion(selected), `${competencyId}: ${action} never takes a retention/transfer item (got ${selected?.id})`);
    }
  }

  // A topic that authors no retention/transfer item keeps the fallback to its mastery items.
  const tiny = createInitialLearnerState("learner-4b-tiny", TINY_B4);
  assert(isQuestion(selectLearningContent(tiny, "retention_check", [], [])), "B4 tiny topic: retention check falls back to a mastery item");
  console.log("  purpose pools: PASS (B5 English, B5 Maths, B4 Maths fallback)");
}

async function diagnosisIsNotFailedTeaching() {
  for (const competencyId of [EN_B5, MATHS_B5]) {
    let { learnerId, state } = await newLearner("4b-diag", competencyId);
    const first = await decide(learnerId, state);
    assert(first.decision.action === "diagnose" && isQuestion(first.content), `${competencyId}: starts with a diagnostic question`);
    state = (await answer(learnerId, state, competencyId, first.content!, wrongOption(first.content!), first.decision.interventionId)).state;
    const next = await decide(learnerId, state);
    assert(next.decision.reasonCode !== "INEFFECTIVE_INTERVENTION", `${competencyId}: wrong diagnostic answer is not a failed intervention (got ${next.decision.reasonCode})`);
    assert(["teach", "remediate", "scaffold", "diagnose", "reassess"].includes(next.decision.action), `${competencyId}: decision follows the diagnosis (got ${next.decision.action})`);
    console.log(`  ${competencyId}: wrong diagnostic answer -> ${next.decision.action}/${next.decision.reasonCode}`);
  }
}

/*
 * Census: an ALL-CORRECT learner on every competency without
 * prerequisites, answering only what the engine serves. Before 4B:
 * 101/372 stalled on a card. Only topics too small to give three
 * mastery observations may stop here (step 3 adds controlled reuse).
 */
async function perfectLearnerCensus() {
  const stalled: string[] = [];
  let total = 0;
  for (const subject of getAllSubjects()) {
    if (subject.id === "subject-test-mathematics") continue;
    for (const root of getCompetenciesForSubject(subject.id).filter((item) => item.prerequisiteCompetencyIds.length === 0)) {
      total += 1;
      let { learnerId, state } = await newLearner("4b-census", root.id);
      for (let step = 0; step < 15; step += 1) {
        const decision = await decide(learnerId, state);
        if (decision.decision.action === "advance" || decision.decision.action === "complete") break;
        if (!isQuestion(decision.content)) {
          stalled.push(root.id);
          break;
        }
        state = (await answer(learnerId, state, root.id, decision.content!, decision.content!.metadata!.expectedResponse, decision.decision.interventionId)).state;
      }
    }
  }
  const unexpected = stalled.filter((id) => getContentForCompetency(id, "en").filter((item) => item.assessmentItemId).length >= 3);
  assert(unexpected.length === 0, `census: no all-correct learner stalls on a card where 3+ questions exist (${unexpected.join(", ")})`);
  console.log(`  census: ${stalled.length}/${total} all-correct learners stop on a card (tiny pools only: ${stalled.join(", ") || "none"})`);
}

(async () => {
  console.log("TRANCHE 4B STEP 1: SELECTION AND POLICY");
  purposePools();
  await diagnosisIsNotFailedTeaching();
  await perfectLearnerCensus();
  console.log("TRANCHE 4B STEP 1: PASS");
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
