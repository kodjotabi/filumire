import { seedContent } from "../services/content-store/seed";
import { acknowledgeIntervention, getIntervention, getLearnerInterventions } from "../services/intervention-store/index";
import { getEvidence } from "../services/evidence-store/index";
import { getLearnerState } from "../services/learner-state-store/index";
import { assert, newLearner, decide, answer, wrongOption, competencyState, isQuestion } from "./repro-4a-helpers";

/*
 * TRANCHE 4B STEP 2: card acknowledgement and intervention lifecycle
 * (regression). Replaces the lifecycle parts of
 * tests/repro-4a-card-loop.test.ts.
 *
 * card -> learner presses Next (acknowledge) -> intervention marked
 * delivered -> next decision serves a question evaluated under that
 * intervention. Displaying or re-requesting a card changes nothing and
 * never opens another intervention.
 *
 * Run: npx tsx --env-file=.env.local tests/card-acknowledgement-4b.test.ts
 */

seedContent();

const CASES = [
  { name: "B5 English", competencyId: "competency-gh-english-b5-3-5-1-1" },
  { name: "B6 English", competencyId: "competency-gh-english-b6-5-4-1-1" },
  { name: "B5 Maths", competencyId: "competency-gh-math-b5-1-1-1-1" },
];

async function lifecycle(name: string, competencyId: string) {
  let { learnerId, state } = await newLearner("4b-ack", competencyId);

  // A wrong diagnostic answer leads to a teaching card.
  const first = await decide(learnerId, state);
  state = (await answer(learnerId, state, competencyId, first.content!, wrongOption(first.content!), first.decision.interventionId)).state;
  const card = await decide(learnerId, state);
  assert(!isQuestion(card.content) && card.decision.interventionId, `${name}: a teaching card with an intervention is served (got ${card.decision.action} ${card.content?.type})`);
  const teachingId = card.decision.interventionId!;

  // Refresh / repeated GET without Next: same card, same intervention, nothing acknowledged.
  for (let refresh = 0; refresh < 3; refresh += 1) {
    const again = await decide(learnerId, state);
    assert(again.content?.id === card.content!.id && again.decision.interventionId === teachingId, `${name}: refresh #${refresh + 1} returns the same card and reuses the intervention`);
  }
  const open = (await getLearnerInterventions(learnerId, competencyId)).filter((item) => item.status === "active" && item.evidenceIds.length === 0);
  assert(open.length === 1 && open[0].interventionId === teachingId, `${name}: repeated GET keeps exactly one open intervention (${open.length})`);
  assert((await getIntervention(teachingId))?.status === "active", `${name}: displaying the card does not acknowledge it`);

  // Next: acknowledgement records no evidence and leaves mastery unchanged.
  const evidenceBefore = (await getEvidence(learnerId, competencyId)).length;
  const masteryBefore = competencyState(state, competencyId).masteryEstimate;
  const ack = await acknowledgeIntervention({ interventionId: teachingId, learnerId, competencyId });
  assert(ack.status === "acknowledged", `${name}: Next acknowledges the card (${ack.status})`);
  const stored = await getIntervention(teachingId);
  assert(stored?.status === "completed" && stored.outcome === "not_yet_evaluated" && stored.evidenceIds.length === 0, `${name}: intervention delivered, not yet evaluated`);
  assert((await getEvidence(learnerId, competencyId)).length === evidenceBefore, `${name}: acknowledgement creates no evidence`);
  const persisted = await getLearnerState(learnerId, competencyId);
  assert(!persisted || competencyState(persisted, competencyId).masteryEstimate === masteryBefore, `${name}: acknowledgement does not change mastery`);
  assert((await acknowledgeIntervention({ interventionId: teachingId, learnerId, competencyId })).status === "already_acknowledged", `${name}: a repeated Next is idempotent`);

  // Ownership and type checks.
  assert((await acknowledgeIntervention({ interventionId: teachingId, learnerId: `${learnerId}-other`, competencyId })).status === "not_found", `${name}: another learner cannot acknowledge this card`);
  assert((await acknowledgeIntervention({ interventionId: first.decision.interventionId!, learnerId, competencyId })).status === "not_instructional", `${name}: a question step cannot be acknowledged`);

  // Card -> Next -> question evaluated under the teaching intervention.
  const check = await decide(learnerId, state);
  assert(isQuestion(check.content) && check.decision.reasonCode === "INSTRUCTION_CHECK" && check.decision.interventionId === teachingId, `${name}: Next leads to a question under the teaching intervention (got ${check.decision.action}/${check.decision.reasonCode} ${check.content?.type})`);
  const result = await answer(learnerId, state, competencyId, check.content!, check.content!.metadata!.expectedResponse, check.decision.interventionId);
  assert(result.evidence.interventionId === teachingId && result.evidence.interventionType === stored!.type, `${name}: the answer evaluates the teaching intervention (${result.evidence.interventionId === teachingId} ${result.evidence.interventionType} ${result.evidence.purpose})`);
  state = result.state;
  const history = competencyState(state, competencyId).interventionHistory.find((item) => item.interventionId === teachingId);
  assert(history?.outcome === "effective", `${name}: learner model records the teaching as effective (${history?.outcome})`);

  const after = await decide(learnerId, state);
  assert(after.decision.reasonCode !== "INSTRUCTION_CHECK", `${name}: the check is not repeated once answered`);
  console.log(`  ${name}: ${card.decision.action} card -> refresh x3 (1 open intervention) -> Next -> ${check.decision.action}/${check.decision.reasonCode} -> evidence under ${stored!.type}`);
}

/*
 * Struggling learner (two wrong answers, then correct), pressing Next on
 * every card: every Next leads to a question while the topic still has
 * an unused mastery question, so the learner is never held on a card.
 */
async function struggling(name: string, competencyId: string) {
  let { learnerId, state } = await newLearner("4b-struggle", competencyId);
  let wrong = 0;
  let questions = 0;
  for (let step = 0; step < 12 && questions < 5; step += 1) {
    const decision = await decide(learnerId, state);
    if (!isQuestion(decision.content)) {
      assert((await acknowledgeIntervention({ interventionId: decision.decision.interventionId!, learnerId, competencyId })).status === "acknowledged", `${name}: Next on ${decision.decision.action} card`);
      const next = await decide(learnerId, state);
      assert(isQuestion(next.content), `${name}: Next after ${decision.decision.action} leads to a question (got ${next.content?.type})`);
      continue;
    }
    const isWrong = wrong < 2;
    if (isWrong) wrong += 1;
    questions += 1;
    state = (await answer(learnerId, state, competencyId, decision.content!, isWrong ? wrongOption(decision.content!) : decision.content!.metadata!.expectedResponse, decision.decision.interventionId)).state;
  }
  assert(questions === 5, `${name}: struggling learner reaches all five mastery questions (${questions})`);
  console.log(`  ${name}: struggling learner answered ${questions} questions with no card loop`);
}

(async () => {
  console.log("TRANCHE 4B STEP 2: CARD ACKNOWLEDGEMENT");
  for (const testCase of CASES) {
    await lifecycle(testCase.name, testCase.competencyId);
    await struggling(testCase.name, testCase.competencyId);
  }
  console.log("TRANCHE 4B STEP 2: PASS");
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
