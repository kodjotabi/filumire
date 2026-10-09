import { createInitialLearnerState, applyEvidence } from "../services/learner-state/index";
import { evaluateAssessment } from "../services/assessment/index";
import { makeAdaptiveDecision } from "../services/adaptive-engine/index";
import { ADAPTIVE_POLICY_VERSION } from "../services/adaptive-policy/index";
import { saveEvidenceAndUpdateLearnerState } from "../services/evidence-store/index";
import { acknowledgeIntervention, getIntervention } from "../services/intervention-store/index";
import { getContentForCompetency } from "../services/content-store/index";
import { seedContent } from "../services/content-store/seed";
import { persistenceStore } from "../services/persistence-provider";
import { getCompetency, getNextCompetency, prerequisitesSatisfied } from "../packages/curriculum/index";
import type { LearningContent } from "../packages/content";
import type { LearnerState } from "../packages/domain";

/*
 * Basic 5 and Basic 6 English through the common adaptive loop, with
 * real competencies and real authored items. Every answer is a real
 * option of a real item, evaluated by the same assessment service and
 * stored through the same evidence store as the /api/learning route.
 * Nothing here is English specific.
 */

type Case = {
  name: string;
  competencyId: string;
  expectedNext: string;
};

const cases: Case[] = [
  {
    name: "Basic 5 English",
    competencyId: "competency-gh-english-b5-3-5-1-1",
    expectedNext: "competency-gh-english-b5-3-5-1-2",
  },
  {
    name: "Basic 6 English",
    competencyId: "competency-gh-english-b6-5-4-1-1",
    expectedNext: "competency-gh-english-b6-5-4-1-2",
  },
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function newLearner(tag: string, competencyId: string): Promise<{ learnerId: string; state: LearnerState }> {
  const learnerId = `learner-english-loop-${tag}-${crypto.randomUUID()}`;
  await persistenceStore.ensureLearnerExists(learnerId);
  return { learnerId, state: createInitialLearnerState(learnerId, competencyId) };
}

/* Same evaluation and atomic evidence + learner-state update as POST /api/learning. */
async function answer(
  learnerId: string,
  state: LearnerState,
  competencyId: string,
  item: LearningContent,
  response: string,
  interventionId: string | undefined,
) {
  assert(item.competencyId === competencyId && item.assessmentItemId && item.metadata?.expectedResponse, `${item.id} is an authored question of ${competencyId}`);
  const assessment = await evaluateAssessment(
    {
      learnerId,
      sessionId: `${learnerId}-session`,
      interventionId,
      assessmentItemId: item.assessmentItemId,
      competencyId,
      response,
    },
    item.metadata.expectedResponse,
    item.id,
    item.metadata,
  );
  const saved = await saveEvidenceAndUpdateLearnerState(
    assessment.evidence,
    competencyId,
    (current, isNew, history) => {
      const base = current ?? state;
      return isNew ? applyEvidence(base, assessment.evidence, history) : base;
    },
  );
  assert(saved.isNewEvidence, `${item.id}: evidence stored`);
  return { evidence: assessment.evidence, state: saved.learnerState };
}

function wrongOptionWithMisconception(item: LearningContent): { option: string; misconception: string } {
  const rules = JSON.parse(item.metadata!.diagnosticRules) as Record<string, { errorPattern: string; diagnosticState: string }>;
  const [option, rule] = Object.entries(rules).find(([, r]) => r.diagnosticState === "misconception")!;
  return { option, misconception: rule.errorPattern };
}

/*
 * Tranche 4B: a teaching card is followed by the learner pressing Next
 * (acknowledge), after which the engine serves a question under it.
 */
async function nextQuestion(testCase: Case, learnerId: string, state: LearnerState) {
  let decision = await makeAdaptiveDecision({ learnerId, sessionId: `${learnerId}-session`, learnerState: state });
  for (let cards = 0; !decision.content?.assessmentItemId && cards < 3; cards += 1) {
    assert(decision.decision.interventionId, `${testCase.name}: teaching card carries its intervention`);
    const ack = await acknowledgeIntervention({ interventionId: decision.decision.interventionId, learnerId, competencyId: testCase.competencyId });
    assert(ack.status === "acknowledged", `${testCase.name}: Next acknowledges the ${decision.decision.action} card (${ack.status})`);
    decision = await makeAdaptiveDecision({ learnerId, sessionId: `${learnerId}-session`, learnerState: state });
  }
  return decision;
}

function current(state: LearnerState, competencyId: string) {
  return state.competencies.find((item) => item.competencyId === competencyId)!;
}

/*
 * Struggle: selection -> content -> evidence -> struggle detected ->
 * misconception diagnosed -> remediation chosen -> intervention evidence.
 */
async function struggle(testCase: Case): Promise<void> {
  const spec = getCompetency(testCase.competencyId)!;
  let { learnerId, state } = await newLearner("struggle", testCase.competencyId);

  // Two wrong answers, each a real option tied to an authored misconception
  // (a teaching card after the first one is acknowledged with Next).
  for (let index = 0; index < 2; index += 1) {
    const decision = await nextQuestion(testCase, learnerId, state);
    assert(decision.decision.policyVersion === ADAPTIVE_POLICY_VERSION, `${testCase.name}: common adaptive policy`);
    assert(decision.decision.competencyId === testCase.competencyId, `${testCase.name}: decision is on the selected competency`);
    assert(decision.decision.action !== "advance", `${testCase.name}: no advance while struggling`);
    const item = decision.content!;
    assert(item.assessmentItemId, `${testCase.name}: engine serves an authored question (got ${item.type})`);
    const wrong = wrongOptionWithMisconception(item);
    const result = await answer(learnerId, state, testCase.competencyId, item, wrong.option, decision.decision.interventionId);
    state = result.state;
    assert(result.evidence.outcome === "incorrect", `${testCase.name}: wrong option is incorrect`);
    assert(result.evidence.errorPattern === wrong.misconception && spec.misconceptions.includes(wrong.misconception), `${testCase.name}: authored misconception recorded`);
  }

  const struggling = current(state, testCase.competencyId);
  assert(struggling.diagnosticState === "misconception", `${testCase.name}: misconception diagnosed (got ${struggling.diagnosticState})`);
  assert(struggling.errorPatterns.some((pattern) => spec.misconceptions.includes(pattern)), `${testCase.name}: learner model holds the authored misconception`);
  assert(struggling.masteryEstimate < 0.8, `${testCase.name}: no mastery after two wrong answers`);

  // One correct answer on the next served question, then the policy remediates.
  const third = await nextQuestion(testCase, learnerId, state);
  assert(third.decision.action !== "advance" && third.content?.assessmentItemId, `${testCase.name}: still assessing, not advancing`);
  state = (await answer(learnerId, state, testCase.competencyId, third.content!, third.content!.metadata!.expectedResponse, third.decision.interventionId)).state;

  const remediation = await makeAdaptiveDecision({ learnerId, sessionId: `${learnerId}-session`, learnerState: state });
  assert(remediation.decision.action === "remediate" && remediation.decision.reasonCode === "MISCONCEPTION", `${testCase.name}: misconception leads to remediation (got ${remediation.decision.action}/${remediation.decision.reasonCode})`);
  assert(remediation.content?.type === "remediation" && remediation.content.competencyId === testCase.competencyId, `${testCase.name}: authored remediation of the same topic is served`);
  assert(remediation.decision.interventionId, `${testCase.name}: remediation intervention created`);
  const intervention = await getIntervention(remediation.decision.interventionId);
  assert(intervention?.type === "remediate" && intervention.competencyId === testCase.competencyId, `${testCase.name}: intervention persisted for this competency`);

  /*
   * Tranche 4B: Next on the remediation card; the engine serves a
   * question evaluated under the remediation intervention.
   */
  const check = await nextQuestion(testCase, learnerId, state);
  assert(check.decision.reasonCode === "INSTRUCTION_CHECK" && check.decision.interventionId === remediation.decision.interventionId && check.content?.assessmentItemId, `${testCase.name}: Next on the remediation card serves a question under it (got ${check.decision.action}/${check.decision.reasonCode})`);
  const after = await answer(learnerId, state, testCase.competencyId, check.content!, check.content!.metadata!.expectedResponse, check.decision.interventionId);
  state = after.state;
  assert(after.evidence.interventionType === "remediate" && after.evidence.interventionId === remediation.decision.interventionId, `${testCase.name}: evidence evaluates the remediation`);
  const recovered = current(state, testCase.competencyId);
  assert(recovered.diagnosticState !== "misconception", `${testCase.name}: misconception cleared by correct evidence (got ${recovered.diagnosticState})`);
  assert(recovered.masteryEstimate > struggling.masteryEstimate, `${testCase.name}: mastery estimate rises after remediation`);

  const reassess = await makeAdaptiveDecision({ learnerId, sessionId: `${learnerId}-session`, learnerState: state });
  assert(reassess.decision.action !== "remediate" && reassess.decision.action !== "advance", `${testCase.name}: engine moves on from remediation without advancing (got ${reassess.decision.action})`);

  console.log(`${testCase.name} struggle PASS: wrong x2 -> misconception -> remediate -> intervention evidence -> ${reassess.decision.action}`);
}

/*
 * Progression: only the questions the engine serves are answered.
 * mastery -> retention -> transfer -> advance -> next competency.
 */
async function progress(testCase: Case): Promise<void> {
  let { learnerId, state } = await newLearner("progress", testCase.competencyId);
  const actions: string[] = [];
  let advanced: Awaited<ReturnType<typeof makeAdaptiveDecision>> | undefined;

  for (let step = 0; step < 12 && !advanced; step += 1) {
    const decision = await makeAdaptiveDecision({ learnerId, sessionId: `${learnerId}-session`, learnerState: state });
    actions.push(decision.decision.action);
    assert(decision.decision.policyVersion === ADAPTIVE_POLICY_VERSION, `${testCase.name}: common adaptive policy`);
    if (decision.decision.action === "advance") {
      advanced = decision;
      break;
    }
    assert(decision.decision.action !== "complete", `${testCase.name}: path does not end on a competency with a successor`);
    const item = decision.content!;
    assert(item.assessmentItemId, `${testCase.name}: ${decision.decision.action} serves an authored question (got ${item.type})`);
    if (decision.decision.action === "retention_check") {
      assert(item.metadata?.assessmentPurpose === "retention", `${testCase.name}: retention check serves an authored retention question`);
    }
    if (decision.decision.action === "transfer_check") {
      assert(item.metadata?.assessmentPurpose === "transfer", `${testCase.name}: transfer check serves an authored transfer question`);
    }
    state = (await answer(learnerId, state, testCase.competencyId, item, item.metadata!.expectedResponse, decision.decision.interventionId)).state;
  }

  assert(advanced, `${testCase.name}: learner advanced (actions: ${actions.join(", ")})`);
  for (const action of ["diagnose", "retention_check", "transfer_check"]) {
    assert(actions.includes(action), `${testCase.name}: loop went through ${action} (actions: ${actions.join(", ")})`);
  }
  const done = current(state, testCase.competencyId);
  assert(done.masteryEstimate >= 0.8 && done.confidence >= 0.8, `${testCase.name}: mastery reached`);
  assert(done.retentionState?.status === "retained", `${testCase.name}: retention established`);
  assert(done.transferState?.status === "demonstrated", `${testCase.name}: transfer demonstrated`);
  assert(done.readinessState?.readyForAdvancement === true, `${testCase.name}: ready for advancement`);

  assert(getNextCompetency(testCase.competencyId)?.id === testCase.expectedNext, `${testCase.name}: curriculum successor`);
  assert(advanced.nextCompetency === testCase.expectedNext && advanced.decision.competencyId === testCase.expectedNext, `${testCase.name}: engine advances to ${testCase.expectedNext}`);
  assert(prerequisitesSatisfied(testCase.expectedNext, [testCase.competencyId]), `${testCase.name}: next competency's prerequisite is the one just completed`);

  // As the route does on advance: open the next competency and continue there.
  const nextState: LearnerState = {
    ...state,
    competencies: [createInitialLearnerState(learnerId, testCase.expectedNext).competencies[0], ...state.competencies],
  };
  const next = await makeAdaptiveDecision({ learnerId, sessionId: `${learnerId}-session`, learnerState: nextState });
  assert(next.decision.competencyId === testCase.expectedNext && next.decision.action === "diagnose", `${testCase.name}: next competency starts with diagnosis`);
  assert(next.content?.competencyId === testCase.expectedNext && next.content.metadata?.assessmentPurpose === "diagnostic", `${testCase.name}: next competency serves its own authored diagnostic question`);

  console.log(`${testCase.name} progression PASS: ${actions.join(" -> ")} -> ${advanced.nextCompetency}`);
}

async function run(): Promise<void> {
  seedContent();
  for (const testCase of cases) {
    await struggle(testCase);
    await progress(testCase);
  }
  console.log("B5/B6 English adaptive loop PASS.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
