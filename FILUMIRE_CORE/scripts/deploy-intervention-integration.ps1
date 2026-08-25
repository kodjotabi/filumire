$ErrorActionPreference = "Stop"

$Root = "C:\Users\tabi\Desktop\filumire\FILUMIRE_CORE"

New-Item -ItemType Directory -Force "$Root\scripts" | Out-Null
New-Item -ItemType Directory -Force "$Root\tests" | Out-Null

# ============================================================
# packages/domain/index.ts
# ============================================================

$DomainPath = "$Root\packages\domain\index.ts"

$domain = Get-Content $DomainPath -Raw

if ($domain -notmatch "interventionId\?: string;") {
    $domain = $domain -replace `
        "confidence\?: number;\s*\}", `
        "confidence?: number;`r`n  interventionId?: string;`r`n}"
}

Set-Content $DomainPath $domain -Encoding UTF8

# ============================================================
# packages/contracts/index.ts
# ============================================================

$ContractsPath = "$Root\packages\contracts\index.ts"

$contracts = Get-Content $ContractsPath -Raw

if ($contracts -notmatch "interventionId\?: string;") {
    $contracts = $contracts -replace `
        "response: unknown;\s*\}", `
        "response: unknown;`r`n  interventionId?: string;`r`n}"
}

Set-Content $ContractsPath $contracts -Encoding UTF8

# ============================================================
# services/assessment/index.ts
# ============================================================

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

  const evidence: LearningEvidence = {
    id:
      `ev-${crypto.randomUUID()}`,

    learnerId:
      submission.learnerId,

    competencyId:
      submission.competencyId,

    source: "assessment",

    outcome:
      correct
        ? "correct"
        : "incorrect",

    timestamp: now,

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

# ============================================================
# services/adaptive-engine/index.ts
# ============================================================

@'
import type {
  AdaptiveDecisionRequest,
  AdaptiveDecisionResponse,
} from "../../packages/contracts";

import {
  getNextCompetency,
  prerequisitesSatisfied,
} from "../../packages/curriculum";

import {
  selectPedagogicalAction,
} from "../../packages/pedagogy";

import {
  selectLearningContent,
} from "../content-selection";

import {
  getEvidence,
} from "../evidence-store";

import {
  createIntervention,
} from "../intervention-store";

export async function makeAdaptiveDecision(
  request: AdaptiveDecisionRequest,
): Promise<AdaptiveDecisionResponse> {
  const competency =
    request.learnerState
      .competencies[0];

  if (!competency) {
    throw new Error(
      "No competency state available for adaptive decision.",
    );
  }

  const evidence =
    await getEvidence(
      request.learnerId,
      competency.competencyId,
    );

  let consecutiveFailures = 0;

  for (
    let index =
      evidence.length - 1;
    index >= 0;
    index -= 1
  ) {
    if (
      evidence[index].outcome !==
      "incorrect"
    ) {
      break;
    }

    consecutiveFailures += 1;
  }

  const nextCompetency =
    getNextCompetency(
      competency.competencyId,
    );

  const prerequisiteStates =
    Object.values(
      competency.prerequisiteState ??
        {},
    );

  const prerequisiteSatisfied =
    prerequisiteStates.length === 0 ||
    prerequisiteStates.every(
      (state) =>
        state === "ready" ||
        state === "mastered",
    );

  const readyForAdvancement =
    competency
      .readinessState
      ?.readyForAdvancement ??
    false;

  const pedagogicalDecision =
    selectPedagogicalAction({
      masteryEstimate:
        competency.masteryEstimate,

      confidence:
        competency.confidence,

      evidenceCount:
        competency.evidenceCount,

      consecutiveFailures,

      diagnosticState:
        competency.diagnosticState,

      diagnosticConfidence:
        competency.diagnosticConfidence,

      errorPatterns:
        competency.errorPatterns,

      interventionHistory:
        competency.interventionHistory,

      prerequisiteSatisfied,

      hasNextCompetency:
        Boolean(nextCompetency),

      retentionStatus:
        competency.retentionState
          ?.status ??
        "not_tested",

      retentionConfidence:
        competency.retentionState
          ?.confidence ??
        0,

      transferStatus:
        competency.transferState
          ?.status ??
        "not_tested",

      transferConfidence:
        competency.transferState
          ?.confidence ??
        0,

      readyForAdvancement,
    });

  let decisionCompetencyId =
    competency.competencyId;

  let contentState =
    request.learnerState;

  if (
    pedagogicalDecision.action ===
      "advance" &&
    nextCompetency &&
    prerequisitesSatisfied(
      nextCompetency.id,
      request.learnerState
        .competencies
        .filter(
          (item) =>
            item.masteryEstimate >=
              0.8 &&
            item.confidence >=
              0.8 &&
            (
              item.readinessState
                ?.readyForAdvancement ??
              false
            ),
        )
        .map(
          (item) =>
            item.competencyId,
        ),
    )
  ) {
    decisionCompetencyId =
      nextCompetency.id;

    const alreadyTracked =
      request.learnerState
        .competencies
        .some(
          (item) =>
            item.competencyId ===
            nextCompetency.id,
        );

    if (!alreadyTracked) {
      const now =
        new Date().toISOString();

      contentState = {
        ...request.learnerState,

        competencies: [
          {
            learnerId:
              request.learnerId,

            competencyId:
              nextCompetency.id,

            masteryEstimate: 0,

            evidenceCount: 0,

            confidence: 0,

            diagnosticState:
              "unknown",

            diagnosticConfidence: 0,

            errorPatterns: [],

            interventionHistory: [],

            prerequisiteState: {},

            retentionState: {
              status:
                "not_tested",

              confidence: 0,

              evidenceIds: [],
            },

            transferState: {
              status:
                "not_tested",

              confidence: 0,

              evidenceIds: [],
            },

            readinessState: {
              readyForAdvancement:
                false,

              confidence: 0,

              reasonCode:
                "NEW_COMPETENCY",

              evaluatedAt:
                now,
            },

            lastUpdated:
              now,

            stateVersion:
              "state-0.2",
          },

          ...request.learnerState
            .competencies,
        ],
      };
    }
  }

  const decision = {
    id:
      `decision-${request.sessionId}-${decisionCompetencyId}`,

    learnerId:
      request.learnerId,

    sessionId:
      request.sessionId,

    action:
      pedagogicalDecision.action,

    competencyId:
      decisionCompetencyId,

    reasonCode:
      pedagogicalDecision.reasonCode,

    evidenceIds:
      evidence.map(
        (item) => item.id,
      ),

    policyVersion:
      "policy-0.3",

    createdAt:
      new Date().toISOString(),

    confidence:
      competency.confidence,
  };

  if (
    pedagogicalDecision.action ===
      "complete" ||
    pedagogicalDecision.action ===
      "advance"
  ) {
    return {
      decision,
    };
  }

  const intervention =
    createIntervention({
      learnerId:
        request.learnerId,

      competencyId:
        decisionCompetencyId,

      sessionId:
        request.sessionId,

      decisionId:
        decision.id,

      type:
        pedagogicalDecision.action,

      policyVersion:
        "intervention-0.2",
    });

  decision.interventionId =
    intervention.interventionId;

  const usedAssessmentItemIds =
    evidence
      .map(
        (item) =>
          item.assessmentItemId,
      )
      .filter(
        (
          item,
        ): item is string =>
          Boolean(item),
      );

  const content =
    selectLearningContent(
      contentState,
      pedagogicalDecision.action,
      usedAssessmentItemIds,
    );

  return {
    decision,
    content,
  };
}
'@ | Set-Content `
    "$Root\services\adaptive-engine\index.ts" `
    -Encoding UTF8

# ============================================================
# tests/intervention-adaptive-integration.test.ts
# ============================================================

@'
import {
  createInitialLearnerState,
  applyEvidence,
} from "../services/learner-state";

import {
  evaluateAssessment,
} from "../services/assessment";

import {
  makeAdaptiveDecision,
} from "../services/adaptive-engine";

import {
  getIntervention,
  clearInterventionStore,
  evaluateInterventionFromEvidence,
} from "../services/intervention-store";

import {
  saveEvidence,
} from "../services/evidence-store";

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

clearInterventionStore();

const learnerId =
  "learner-intervention-integration";

const competencyId =
  "competency-test-001";

const sessionId =
  "session-intervention-integration";

let learnerState =
  createInitialLearnerState(
    learnerId,
    competencyId,
  );

const submission =
  {
    learnerId,
    sessionId,
    assessmentItemId:
      "item-intervention-001",
    competencyId,
    response:
      "incorrect-answer",
  };

const assessment =
  evaluateAssessment(
    submission,
    "correct-answer",
  );

await saveEvidence(
  assessment.evidence,
);

learnerState =
  applyEvidence(
    learnerState,
    assessment.evidence,
  );

const adaptiveDecision =
  await makeAdaptiveDecision({
    learnerId,
    sessionId,
    learnerState,
  });

console.log({
  action:
    adaptiveDecision
      .decision.action,

  interventionId:
    adaptiveDecision
      .decision.interventionId,

  contentType:
    adaptiveDecision.content
      ?.type,
});

assert(
  Boolean(
    adaptiveDecision
      .decision.interventionId,
  ),
  "adaptive decision must create an intervention",
);

const intervention =
  getIntervention(
    adaptiveDecision
      .decision
      .interventionId!,
  );

assert(
  Boolean(intervention),
  "created intervention must be retrievable",
);

assert(
  intervention?.decisionId ===
    adaptiveDecision.decision.id,
  "intervention must point to originating decision",
);

assert(
  intervention?.competencyId ===
    competencyId,
  "intervention must target the active competency",
);

const interventionId =
  intervention!.interventionId;

const recoverySubmission =
  {
    ...submission,

    sessionId:
      `${sessionId}-recovery`,

    assessmentItemId:
      "item-intervention-002",

    response:
      "correct-answer",

    interventionId,
  };

const recovery =
  evaluateAssessment(
    recoverySubmission,
    "correct-answer",
  );

await saveEvidence(
  recovery.evidence,
);

learnerState =
  applyEvidence(
    learnerState,
    recovery.evidence,
  );

const completed =
  evaluateInterventionFromEvidence(
    interventionId,
    {
      id:
        recovery.evidence.id,

      outcome:
        recovery.evidence.outcome,
    },
  );

console.log({
  interventionId:
    completed.interventionId,

  status:
    completed.status,

  outcome:
    completed.outcome,

  evidenceIds:
    completed.evidenceIds,
});

assert(
  completed.status ===
    "completed",
  "intervention must complete after recovery evidence",
);

assert(
  completed.outcome ===
    "effective",
  "correct recovery evidence must mark intervention effective",
);

assert(
  completed.evidenceIds.includes(
    recovery.evidence.id,
  ),
  "recovery evidence must be linked to intervention",
);

assert(
  recovery.evidence.interventionId ===
    interventionId,
  "assessment evidence must preserve intervention identity",
);

console.log({
  interventionAdaptiveIntegration:
    "PASS",
});
'@ | Set-Content `
    "$Root\tests\intervention-adaptive-integration.test.ts" `
    -Encoding UTF8

Write-Host ""
Write-Host "Intervention adaptive integration installed."
Write-Host ""
Write-Host "Run:"
Write-Host "npx tsx --env-file=.env.local ./tests/intervention-adaptive-integration.test.ts"