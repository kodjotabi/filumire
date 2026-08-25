$ErrorActionPreference = "Stop"

$Root = "C:\Users\tabi\Desktop\filumire\FILUMIRE_CORE"

@'
import type {
  AdaptiveAction,
  AdaptiveDecision,
  AssessmentItemId,
  CompetencyId,
  LearnerId,
  LearnerState,
  SessionId,
  InterventionType,
} from "../domain";

import type { LearningContent } from "../content";

export interface DiagnosticRequest {
  learnerId: LearnerId;
  sessionId: SessionId;
  competencyId: CompetencyId;
}

export interface DiagnosticResponse {
  sessionId: SessionId;
  learnerState: LearnerState;
  evidenceIds: string[];
}

export interface AssessmentSubmission {
  learnerId: LearnerId;
  sessionId: SessionId;
  assessmentItemId: AssessmentItemId;
  competencyId: CompetencyId;
  response: unknown;

  interventionId?: string;
  interventionType?: InterventionType;
}

export interface AssessmentResult {
  evidenceId: string;
  learnerId: LearnerId;
  sessionId: SessionId;
  assessmentItemId: AssessmentItemId;
  correct: boolean;
}

export interface AdaptiveDecisionRequest {
  learnerId: LearnerId;
  sessionId: SessionId;
  learnerState: LearnerState;
}

export interface AdaptiveDecisionResponse {
  decision: AdaptiveDecision;
  content?: LearningContent;
}

export interface LearningActionRequest {
  learnerId: LearnerId;
  sessionId: SessionId;
  action: AdaptiveAction;
  competencyId: CompetencyId;
}
'@ | Set-Content `
  "$Root\packages\contracts\index.ts" `
  -Encoding UTF8

@'
import type {
  DiagnosticState,
  LearningEvidence,
} from "../../packages/domain";

import type {
  AssessmentResult,
  AssessmentSubmission,
} from "../../packages/contracts";

interface DiagnosticRule {
  errorPattern?: string;
  diagnosticState?: DiagnosticState;
  diagnosticConfidence?: number;
}

function resolveDiagnosticRule(
  response: unknown,
  diagnosticRules?: string,
): DiagnosticRule | undefined {
  if (!diagnosticRules) {
    return undefined;
  }

  try {
    const rules =
      JSON.parse(
        diagnosticRules,
      ) as Record<
        string,
        DiagnosticRule
      >;

    const responseKey =
      typeof response === "string"
        ? response
        : JSON.stringify(response);

    return rules[responseKey];
  } catch {
    return undefined;
  }
}

export function evaluateAssessment(
  submission: AssessmentSubmission,
  expectedResponse: unknown,
  contentId?: string,
  metadata?: Record<string, string>,
): {
  result: AssessmentResult;
  evidence: LearningEvidence;
} {
  const correct =
    JSON.stringify(
      submission.response,
    ) ===
    JSON.stringify(
      expectedResponse,
    );

  const now =
    new Date().toISOString();

  const diagnosticRule =
    !correct
      ? resolveDiagnosticRule(
          submission.response,
          metadata?.diagnosticRules,
        )
      : undefined;

  const evidence:
    LearningEvidence = {
    id:
      `ev-${crypto.randomUUID()}`,

    learnerId:
      submission.learnerId,

    competencyId:
      submission.competencyId,

    source:
      "assessment",

    outcome:
      correct
        ? "correct"
        : "incorrect",

    timestamp:
      now,

    assessmentItemId:
      submission.assessmentItemId,

    sessionId:
      submission.sessionId,

    contentId,

    policyVersion:
      "assessment-0.3",

    errorPattern:
      diagnosticRule?.errorPattern,

    diagnosticState:
      diagnosticRule?.diagnosticState,

    diagnosticConfidence:
      diagnosticRule?.diagnosticConfidence,

    interventionId:
      submission.interventionId,

    interventionType:
      submission.interventionType,
  };

  return {
    result: {
      evidenceId:
        evidence.id,

      learnerId:
        submission.learnerId,

      sessionId:
        submission.sessionId,

      assessmentItemId:
        submission.assessmentItemId,

      correct,
    },

    evidence,
  };
}
'@ | Set-Content `
  "$Root\services\assessment\index.ts" `
  -Encoding UTF8

@'
import {
  createInitialLearnerState,
  applyEvidence,
  saveLearnerState,
  getLearnerState,
} from "../services/learner-state";

import {
  evaluateAssessment,
} from "../services/assessment";

import {
  makeAdaptiveDecision,
} from "../services/adaptive-engine";

import {
  saveEvidence,
} from "../services/evidence-store";

import {
  evaluateInterventionFromEvidence,
  getIntervention,
} from "../services/intervention-store";

import {
  recordRetentionCheck,
  recordTransferCheck,
} from "../services/retention-transfer";

import {
  selectPedagogicalAction,
} from "../packages/pedagogy";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(
      `FAIL: ${message}`,
    );
  }
}

const learnerId =
  "learner-complete-loop";

const competencyId =
  "competency-complete-loop";

const sessionId =
  "session-complete-loop";

let state =
  createInitialLearnerState(
    learnerId,
    competencyId,
  );

await saveLearnerState(
  state,
);

const initialAssessment =
  await evaluateAssessment(
    {
      learnerId,
      sessionId,
      assessmentItemId:
        "item-complete-loop-001",
      competencyId,
      response:
        "wrong",
    },
    "correct",
  );

await saveEvidence(
  initialAssessment.evidence,
);

state =
  applyEvidence(
    state,
    initialAssessment.evidence,
  );

await saveLearnerState(
  state,
);

assert(
  state.competencies[0]
    .evidenceCount === 1,
  "initial assessment evidence must update learner state",
);

const firstDecision =
  await makeAdaptiveDecision({
    learnerId,
    sessionId,
    learnerState: state,
  });

console.log({
  stage:
    "adaptive decision",

  action:
    firstDecision.decision.action,

  interventionId:
    firstDecision.decision
      .interventionId,
});

assert(
  Boolean(
    firstDecision.decision
      .interventionId,
  ),
  "adaptive decision must create intervention",
);

const interventionId =
  firstDecision.decision
    .interventionId!;

const intervention =
  await getIntervention(
    interventionId,
  );

assert(
  Boolean(intervention),
  "intervention must persist",
);

assert(
  intervention?.decisionId ===
    firstDecision.decision.id,
  "intervention must reference adaptive decision",
);

const recoveryAssessment =
  await evaluateAssessment(
    {
      learnerId,
      sessionId:
        `${sessionId}-recovery`,
      assessmentItemId:
        "item-complete-loop-002",
      competencyId,
      response:
        "correct",

      interventionId,

      interventionType:
        firstDecision.decision.action,
    },
    "correct",
  );

await saveEvidence(
  recoveryAssessment.evidence,
);

state =
  applyEvidence(
    state,
    recoveryAssessment.evidence,
  );

await saveLearnerState(
  state,
);

assert(
  recoveryAssessment
    .evidence.interventionId ===
    interventionId,
  "recovery evidence must reference intervention",
);

assert(
  recoveryAssessment
    .evidence.interventionType ===
    firstDecision.decision.action,
  "recovery evidence must reference intervention type",
);

const completedIntervention =
  await evaluateInterventionFromEvidence(
    interventionId,
    {
      id:
        recoveryAssessment
          .evidence.id,

      outcome:
        recoveryAssessment
          .evidence.outcome,
    },
  );

console.log({
  stage:
    "intervention outcome",

  status:
    completedIntervention.status,

  outcome:
    completedIntervention.outcome,

  evidenceIds:
    completedIntervention
      .evidenceIds,
});

assert(
  completedIntervention.status ===
    "completed",
  "intervention must complete",
);

assert(
  completedIntervention.outcome ===
    "effective",
  "successful recovery must produce effective intervention outcome",
);

state =
  (await getLearnerState(
    learnerId,
    competencyId,
  )) ?? state;

const competency =
  state.competencies[0];

const interventionRecord =
  competency.interventionHistory
    .find(
      (item) =>
        item.interventionId ===
        interventionId,
    );

assert(
  Boolean(interventionRecord),
  "learner state must contain intervention record",
);

assert(
  interventionRecord
    ?.evidenceIds.includes(
      recoveryAssessment
        .evidence.id,
    ) ?? false,
  "learner state intervention must contain recovery evidence",
);

const masteryReady =
  {
    ...state,

    competencies:
      state.competencies.map(
        (item) =>
          item.competencyId ===
          competencyId
            ? {
                ...item,

                masteryEstimate:
                  0.9,

                evidenceCount:
                  7,

                confidence:
                  1,

                diagnosticState:
                  "probable_mastery",

                diagnosticConfidence:
                  1,

                readinessState: {
                  readyForAdvancement:
                    true,

                  confidence:
                    1,

                  reasonCode:
                    "MASTERY_THRESHOLD_REACHED",

                  evaluatedAt:
                    new Date()
                      .toISOString(),
                },
              }
            : item,
      ),
  };

await saveLearnerState(
  masteryReady,
);

const retentionDecision =
  selectPedagogicalAction({
    masteryEstimate:
      0.9,

    confidence:
      1,

    evidenceCount:
      7,

    consecutiveFailures:
      0,

    diagnosticState:
      "probable_mastery",

    diagnosticConfidence:
      1,

    errorPatterns:
      [],

    interventionHistory:
      competency.interventionHistory,

    prerequisiteSatisfied:
      true,

    hasNextCompetency:
      true,

    retentionStatus:
      "not_tested",

    retentionConfidence:
      0,

    transferStatus:
      "not_tested",

    transferConfidence:
      0,

    readyForAdvancement:
      true,
  });

console.log({
  stage:
    "retention policy",

  action:
    retentionDecision.action,

  reasonCode:
    retentionDecision.reasonCode,
});

assert(
  retentionDecision.action ===
    "retention_check",
  "mastery must require retention check",
);

const retention =
  await recordRetentionCheck({
    learnerId,
    competencyId,
    evidenceId:
      "evidence-complete-retention",
    outcome:
      "correct",
  });

assert(
  retention.status ===
    "retained",
  "correct retention evidence must establish retention",
);

const transferDecision =
  selectPedagogicalAction({
    masteryEstimate:
      0.9,

    confidence:
      1,

    evidenceCount:
      7,

    consecutiveFailures:
      0,

    diagnosticState:
      "probable_mastery",

    diagnosticConfidence:
      1,

    errorPatterns:
      [],

    interventionHistory:
      competency.interventionHistory,

    prerequisiteSatisfied:
      true,

    hasNextCompetency:
      true,

    retentionStatus:
      "retained",

    retentionConfidence:
      1,

    transferStatus:
      "not_tested",

    transferConfidence:
      0,

    readyForAdvancement:
      true,
  });

console.log({
  stage:
    "transfer policy",

  action:
    transferDecision.action,

  reasonCode:
    transferDecision.reasonCode,
});

assert(
  transferDecision.action ===
    "transfer_check",
  "retention must require transfer check",
);

const transfer =
  await recordTransferCheck({
    learnerId,
    competencyId,
    evidenceId:
      "evidence-complete-transfer",
    outcome:
      "correct",
  });

assert(
  transfer.status ===
    "demonstrated",
  "correct transfer evidence must demonstrate transfer",
);

const finalDecision =
  selectPedagogicalAction({
    masteryEstimate:
      0.9,

    confidence:
      1,

    evidenceCount:
      7,

    consecutiveFailures:
      0,

    diagnosticState:
      "probable_mastery",

    diagnosticConfidence:
      1,

    errorPatterns:
      [],

    interventionHistory:
      competency.interventionHistory,

    prerequisiteSatisfied:
      true,

    hasNextCompetency:
      true,

    retentionStatus:
      "retained",

    retentionConfidence:
      1,

    transferStatus:
      "demonstrated",

    transferConfidence:
      1,

    readyForAdvancement:
      true,
  });

console.log({
  stage:
    "final advancement policy",

  action:
    finalDecision.action,

  reasonCode:
    finalDecision.reasonCode,
});

assert(
  finalDecision.action ===
    "advance",
  "confirmed mastery, retention and transfer must allow advancement",
);

const finalState =
  await getLearnerState(
    learnerId,
    competencyId,
  );

assert(
  Boolean(finalState),
  "final learner state must persist",
);

const finalCompetency =
  finalState!
    .competencies[0];

assert(
  finalCompetency
    .retentionState
    ?.status ===
    "retained",
  "retention state must persist",
);

assert(
  finalCompetency
    .transferState
    ?.status ===
    "demonstrated",
  "transfer state must persist",
);

console.log({
  completeInterventionLoop:
    "PASS",

  interventionId,

  interventionOutcome:
    completedIntervention
      .outcome,

  retention:
    finalCompetency
      .retentionState
      ?.status,

  transfer:
    finalCompetency
      .transferState
      ?.status,

  finalAction:
    finalDecision.action,
});
'@ | Set-Content `
  "$Root\tests\complete-intervention-loop.test.ts" `
  -Encoding UTF8

Write-Host ""
Write-Host "Intervention evidence contract fixed."
Write-Host ""
Write-Host "Run:"
Write-Host "npx tsx --env-file=.env.local ./tests/complete-intervention-loop.test.ts"