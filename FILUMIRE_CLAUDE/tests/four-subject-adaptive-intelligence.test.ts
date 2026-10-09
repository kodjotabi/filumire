import { createInitialLearnerState, applyEvidence } from "../services/learner-state/index";
import { evaluateAssessment } from "../services/assessment/index";
import { makeAdaptiveDecision } from "../services/adaptive-engine/index";
import { PostgresPersistenceStore } from "../services/persistence-postgres";
import { getNextCompetency } from "../packages/curriculum/index";
import type { AssessmentSubmission } from "../packages/contracts";
import type { LearningEvidence } from "../packages/domain";
import { seedContent } from "../services/content-store/seed";

/* Tranche 4B step 3: no question available is content exhaustion, so load authored content. */
seedContent();

type SubjectCase = {
  name: string;
  competencyId: string;
  expectedNext: string;
  correctResponse: string;
  wrongResponse: string;
};

const cases: SubjectCase[] = [
  {
    name: "English",
    competencyId: "competency-gh-english-b4-2-2-1-1",
    expectedNext: "competency-gh-english-b4-2-2-1-2",
    correctResponse: "rubric_evaluated_performance",
    wrongResponse: "needs_support",
  },
  {
    name: "Mathematics",
    competencyId: "competency-gh-math-b4-number-patterns-001",
    expectedNext: "competency-gh-math-b4-number-patterns-002",
    correctResponse: "21",
    wrongResponse: "20",
  },
  {
    name: "Science",
    competencyId: "competency-gh-science-b4-2-2-1-1",
    expectedNext: "competency-gh-science-b4-2-2-1-2",
    correctResponse: "Roots",
    wrongResponse: "Flower",
  },
  {
    name: "Computing",
    competencyId: "competency-gh-computing-b4-computer-parts-001",
    expectedNext: "competency-gh-computing-b4-input-devices-001",
    correctResponse: "Monitor",
    wrongResponse: "Keyboard",
  },
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function runSubject(testCase: SubjectCase): Promise<void> {
  const learnerId = `learner-four-subject-${testCase.name.toLowerCase()}`;
  if (process.env.FILUMIRE_PERSISTENCE === "postgres") {
    await new PostgresPersistenceStore().ensureLearnerExists(learnerId);
  }
  let state = createInitialLearnerState(learnerId, testCase.competencyId);
  const history: LearningEvidence[] = [];

  for (let index = 0; index < 2; index += 1) {
    const submission: AssessmentSubmission = {
      learnerId,
      sessionId: `${learnerId}-struggle-${index + 1}`,
      assessmentItemId: `${testCase.competencyId}-struggle-${index + 1}`,
      competencyId: testCase.competencyId,
      response: testCase.wrongResponse,
    };

    const assessment = await evaluateAssessment(
      submission,
      testCase.correctResponse,
      undefined,
      {
        evidencePurpose: "diagnostic",
        evidenceIndependence: "independent",
        evidenceDifficulty: "standard",
        evidenceRepresentation: "verbal",
        evidenceStrength: "strong",
      },
    );

    history.push(assessment.evidence);
    state = applyEvidence(state, assessment.evidence, history);
  }

  const struggleDecision = await makeAdaptiveDecision({
    learnerId,
    sessionId: `${learnerId}-struggle-decision`,
    learnerState: state,
  });

  assert(
    struggleDecision.decision.action !== "advance",
    `${testCase.name}: struggling learner advanced incorrectly.`,
  );

  assert(
    state.competencies[0].diagnosticState !== "unknown",
    `${testCase.name}: struggle produced no diagnosis.`,
  );

  let retentionRequested = false;

  for (let index = 0; index < 8; index += 1) {
    const submission: AssessmentSubmission = {
      learnerId,
      sessionId: `${learnerId}-mastery-${index + 1}`,
      assessmentItemId: `${testCase.competencyId}-mastery-${index + 1}`,
      competencyId: testCase.competencyId,
      response: testCase.correctResponse,
    };

    const assessment = await evaluateAssessment(
      submission,
      testCase.correctResponse,
      undefined,
      {
        evidencePurpose: "mastery",
        evidenceIndependence: "independent",
        evidenceDifficulty: index < 3 ? "standard" : "challenging",
        evidenceRepresentation: index % 2 === 0 ? "numeric" : "verbal",
        evidenceStrength: "strong",
      },
    );

    history.push(assessment.evidence);
    state = applyEvidence(state, assessment.evidence, history);

    const decision = await makeAdaptiveDecision({
      learnerId,
      sessionId: submission.sessionId,
      learnerState: state,
    });

    if (decision.decision.action === "retention_check") {
      retentionRequested = true;
      break;
    }
  }

  assert(retentionRequested, `${testCase.name}: mastery did not trigger retention.`);

  const retentionEvidence: LearningEvidence = {
    id: `${learnerId}-retention`,
    learnerId,
    competencyId: testCase.competencyId,
    source: "assessment",
    outcome: "correct",
    timestamp: new Date().toISOString(),
    assessmentItemId: `${testCase.competencyId}-retention`,
    sessionId: `${learnerId}-retention`,
    policyVersion: "four-subject-validation-1",
    purpose: "retention",
    interventionType: "retention_check",
    interventionId: `${learnerId}-retention-check`,
    independence: "independent",
    strength: "strong",
    difficulty: "standard",
    representation: "verbal",
  };

  history.push(retentionEvidence);
  state = applyEvidence(state, retentionEvidence, history);

  const retentionEvidence2: LearningEvidence = {
    ...retentionEvidence,
    id: `${learnerId}-retention-2`,
    assessmentItemId: `${testCase.competencyId}-retention-2`,
    sessionId: `${learnerId}-retention-2`,
  };

  history.push(retentionEvidence2);
  state = applyEvidence(state, retentionEvidence2, history);

  const transferDecision = await makeAdaptiveDecision({
    learnerId,
    sessionId: `${learnerId}-transfer-decision`,
    learnerState: state,
  });

  assert(
    transferDecision.decision.action === "transfer_check",
    `${testCase.name}: expected transfer_check, received ${transferDecision.decision.action}.`,
  );

  const transferEvidence: LearningEvidence = {
    id: `${learnerId}-transfer`,
    learnerId,
    competencyId: testCase.competencyId,
    source: "assessment",
    outcome: "correct",
    timestamp: new Date().toISOString(),
    assessmentItemId: `${testCase.competencyId}-transfer`,
    sessionId: `${learnerId}-transfer`,
    policyVersion: "four-subject-validation-1",
    purpose: "transfer",
    interventionType: "transfer_check",
    interventionId: `${learnerId}-transfer-check`,
    independence: "independent",
    strength: "strong",
    difficulty: "challenging",
    representation: "story_context",
  };

  history.push(transferEvidence);
  state = applyEvidence(state, transferEvidence, history);

  const transferEvidence2: LearningEvidence = {
    ...transferEvidence,
    id: `${learnerId}-transfer-2`,
    assessmentItemId: `${testCase.competencyId}-transfer-2`,
    sessionId: `${learnerId}-transfer-2`,
  };

  history.push(transferEvidence2);
  state = applyEvidence(state, transferEvidence2, history);

  const finalDecision = await makeAdaptiveDecision({
    learnerId,
    sessionId: `${learnerId}-advance`,
    learnerState: state,
  });

  assert(
    finalDecision.decision.action === "advance",
    `${testCase.name}: expected advance, received ${finalDecision.decision.action}.`,
  );

  const next = getNextCompetency(testCase.competencyId);

  assert(
    next?.id === testCase.expectedNext,
    `${testCase.name}: expected ${testCase.expectedNext}, received ${next?.id ?? "NONE"}.`,
  );

  assert(
    finalDecision.nextCompetency === testCase.expectedNext,
    `${testCase.name}: adaptive engine selected wrong successor.`,
  );

  console.log(
    `${testCase.name} PASS: struggle -> diagnosis -> mastery -> retention -> transfer -> ${finalDecision.nextCompetency}`,
  );
}

async function run(): Promise<void> {
  for (const testCase of cases) {
    await runSubject(testCase);
  }

  console.log("Four-subject adaptive intelligence PASS.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});




