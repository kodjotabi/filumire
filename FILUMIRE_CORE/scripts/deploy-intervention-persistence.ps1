$ErrorActionPreference = "Stop"

$Root = "C:\Users\tabi\Desktop\filumire\FILUMIRE_CORE"

New-Item -ItemType Directory -Force "$Root\scripts" | Out-Null
New-Item -ItemType Directory -Force "$Root\tests" | Out-Null

# ============================================================
# packages/domain/intervention.ts
# ============================================================

@'
import type {
  DecisionId,
  EvidenceId,
  InterventionType,
  LearnerId,
  CompetencyId,
  SessionId,
} from "./index";

export type InterventionId = string;

export type InterventionStatus =
  | "planned"
  | "active"
  | "completed"
  | "superseded"
  | "cancelled";

export type InterventionOutcome =
  | "not_yet_evaluated"
  | "ineffective"
  | "partial_recovery"
  | "effective"
  | "effective_with_retention"
  | "effective_with_transfer";

export interface LearningIntervention {
  interventionId: InterventionId;
  learnerId: LearnerId;
  competencyId: CompetencyId;
  sessionId: SessionId;
  decisionId: DecisionId;
  type: InterventionType;
  status: InterventionStatus;
  startedAt: string;
  completedAt?: string;
  outcome: InterventionOutcome;
  evidenceIds: EvidenceId[];
  policyVersion: string;
  createdAt: string;
  updatedAt: string;
}
'@ | Set-Content "$Root\packages\domain\intervention.ts" -Encoding UTF8

# ============================================================
# services/persistence.ts
# ============================================================

@'
import type {
  LearningEvidence,
  LearnerState,
} from "../packages/domain";

import type {
  LearningIntervention,
  InterventionId,
} from "../packages/domain/intervention";

export interface PersistenceStore {
  getLearnerState(
    learnerId: string,
    competencyId: string,
  ): Promise<LearnerState | undefined>;

  saveLearnerState(
    state: LearnerState,
  ): Promise<void>;

  saveEvidence(
    evidence: LearningEvidence,
  ): Promise<void>;

  getEvidence(
    learnerId: string,
    competencyId: string,
  ): Promise<LearningEvidence[]>;

  getAllEvidence(): Promise<LearningEvidence[]>;

  createSession(
    sessionId: string,
    learnerId: string,
  ): Promise<void>;

  getSessionLearnerId(
    sessionId: string,
  ): Promise<string | undefined>;

  saveIntervention(
    intervention: LearningIntervention,
  ): Promise<void>;

  getIntervention(
    interventionId: InterventionId,
  ): Promise<LearningIntervention | undefined>;

  getLearnerInterventions(
    learnerId: string,
    competencyId?: string,
  ): Promise<LearningIntervention[]>;
}
'@ | Set-Content "$Root\services\persistence.ts" -Encoding UTF8

# ============================================================
# services/persistence-memory.ts
# ============================================================

@'
import type {
  LearningEvidence,
  LearnerState,
} from "../packages/domain";

import type {
  LearningIntervention,
  InterventionId,
} from "../packages/domain/intervention";

import type { PersistenceStore } from "./persistence";

const learnerStates =
  new Map<string, LearnerState>();

const evidenceStore =
  new Map<string, LearningEvidence[]>();

const sessions =
  new Map<string, string>();

const interventions =
  new Map<
    InterventionId,
    LearningIntervention
  >();

function getKey(
  learnerId: string,
  competencyId: string,
): string {
  return `${learnerId}:${competencyId}`;
}

export class MemoryPersistenceStore
  implements PersistenceStore
{
  async getLearnerState(
    learnerId: string,
    competencyId: string,
  ): Promise<LearnerState | undefined> {
    return learnerStates.get(
      getKey(
        learnerId,
        competencyId,
      ),
    );
  }

  async saveLearnerState(
    state: LearnerState,
  ): Promise<void> {
    for (
      const competency of
        state.competencies
    ) {
      learnerStates.set(
        getKey(
          state.learnerId,
          competency.competencyId,
        ),
        state,
      );
    }
  }

  async saveEvidence(
    evidence: LearningEvidence,
  ): Promise<void> {
    const key =
      getKey(
        evidence.learnerId,
        evidence.competencyId,
      );

    const existing =
      evidenceStore.get(key) ??
      [];

    evidenceStore.set(
      key,
      [
        ...existing,
        evidence,
      ],
    );
  }

  async getEvidence(
    learnerId: string,
    competencyId: string,
  ): Promise<LearningEvidence[]> {
    return (
      evidenceStore.get(
        getKey(
          learnerId,
          competencyId,
        ),
      ) ?? []
    );
  }

  async getAllEvidence(): Promise<LearningEvidence[]> {
    return Array.from(
      evidenceStore.values(),
    ).flat();
  }

  async createSession(
    sessionId: string,
    learnerId: string,
  ): Promise<void> {
    sessions.set(
      sessionId,
      learnerId,
    );
  }

  async getSessionLearnerId(
    sessionId: string,
  ): Promise<string | undefined> {
    return sessions.get(
      sessionId,
    );
  }

  async saveIntervention(
    intervention: LearningIntervention,
  ): Promise<void> {
    interventions.set(
      intervention.interventionId,
      {
        ...intervention,
        evidenceIds: [
          ...intervention.evidenceIds,
        ],
      },
    );
  }

  async getIntervention(
    interventionId: InterventionId,
  ): Promise<LearningIntervention | undefined> {
    const intervention =
      interventions.get(
        interventionId,
      );

    return intervention
      ? {
          ...intervention,
          evidenceIds: [
            ...intervention.evidenceIds,
          ],
        }
      : undefined;
  }

  async getLearnerInterventions(
    learnerId: string,
    competencyId?: string,
  ): Promise<LearningIntervention[]> {
    return Array.from(
      interventions.values(),
    ).filter(
      (intervention) =>
        intervention.learnerId ===
          learnerId &&
        (
          competencyId ===
            undefined ||
          intervention.competencyId ===
            competencyId
        ),
    );
  }
}

export const memoryPersistence =
  new MemoryPersistenceStore();
'@ | Set-Content "$Root\services\persistence-memory.ts" -Encoding UTF8

# ============================================================
# services/intervention-store/index.ts
# ============================================================

@'
import type {
  EvidenceId,
  InterventionType,
  LearnerId,
  CompetencyId,
  SessionId,
} from "../../packages/domain";

import type {
  InterventionId,
  InterventionOutcome,
  LearningIntervention,
} from "../../packages/domain/intervention";

import {
  persistenceStore,
} from "../persistence-provider";

function now(): string {
  return new Date().toISOString();
}

export async function createIntervention(
  input: {
    interventionId?: InterventionId;
    learnerId: LearnerId;
    competencyId: CompetencyId;
    sessionId: SessionId;
    decisionId: string;
    type: InterventionType;
    policyVersion?: string;
  },
): Promise<LearningIntervention> {
  const timestamp = now();

  const intervention:
    LearningIntervention = {
    interventionId:
      input.interventionId ??
      `intervention-${crypto.randomUUID()}`,

    learnerId:
      input.learnerId,

    competencyId:
      input.competencyId,

    sessionId:
      input.sessionId,

    decisionId:
      input.decisionId,

    type:
      input.type,

    status:
      "active",

    startedAt:
      timestamp,

    outcome:
      "not_yet_evaluated",

    evidenceIds: [],

    policyVersion:
      input.policyVersion ??
      "intervention-0.3",

    createdAt:
      timestamp,

    updatedAt:
      timestamp,
  };

  await persistenceStore
    .saveIntervention(
      intervention,
    );

  return intervention;
}

export async function getIntervention(
  interventionId: InterventionId,
): Promise<
  LearningIntervention | undefined
> {
  return persistenceStore
    .getIntervention(
      interventionId,
    );
}

export async function getLearnerInterventions(
  learnerId: LearnerId,
  competencyId?: CompetencyId,
): Promise<LearningIntervention[]> {
  return persistenceStore
    .getLearnerInterventions(
      learnerId,
      competencyId,
    );
}

export async function attachEvidenceToIntervention(
  interventionId: InterventionId,
  evidenceId: EvidenceId,
): Promise<LearningIntervention> {
  const intervention =
    await getIntervention(
      interventionId,
    );

  if (!intervention) {
    throw new Error(
      `Intervention not found: ${interventionId}`,
    );
  }

  if (
    !intervention.evidenceIds.includes(
      evidenceId,
    )
  ) {
    intervention.evidenceIds.push(
      evidenceId,
    );
  }

  intervention.updatedAt =
    now();

  await persistenceStore
    .saveIntervention(
      intervention,
    );

  return intervention;
}

export async function completeIntervention(
  interventionId: InterventionId,
  outcome: InterventionOutcome,
): Promise<LearningIntervention> {
  const intervention =
    await getIntervention(
      interventionId,
    );

  if (!intervention) {
    throw new Error(
      `Intervention not found: ${interventionId}`,
    );
  }

  const timestamp =
    now();

  intervention.status =
    "completed";

  intervention.completedAt =
    timestamp;

  intervention.outcome =
    outcome;

  intervention.updatedAt =
    timestamp;

  await persistenceStore
    .saveIntervention(
      intervention,
    );

  return intervention;
}

export async function evaluateInterventionFromEvidence(
  interventionId: InterventionId,
  evidence: {
    id: EvidenceId;
    outcome:
      | "correct"
      | "incorrect"
      | "partial"
      | "skipped"
      | "observed";
  },
): Promise<LearningIntervention> {
  await attachEvidenceToIntervention(
    interventionId,
    evidence.id,
  );

  const intervention =
    await getIntervention(
      interventionId,
    );

  if (!intervention) {
    throw new Error(
      `Intervention not found: ${interventionId}`,
    );
  }

  let outcome:
    InterventionOutcome =
    "not_yet_evaluated";

  if (
    evidence.outcome ===
    "correct"
  ) {
    if (
      intervention.type ===
      "retention_check"
    ) {
      outcome =
        "effective_with_retention";
    } else if (
      intervention.type ===
      "transfer_check"
    ) {
      outcome =
        "effective_with_transfer";
    } else {
      outcome =
        "effective";
    }
  } else if (
    evidence.outcome ===
    "partial"
  ) {
    outcome =
      "partial_recovery";
  } else if (
    evidence.outcome ===
    "incorrect"
  ) {
    outcome =
      "ineffective";
  }

  return completeIntervention(
    interventionId,
    outcome,
  );
}
'@ | Set-Content "$Root\services\intervention-store\index.ts" -Encoding UTF8

# ============================================================
# services/adaptive-engine/index.ts
# ============================================================

$AdaptivePath =
  "$Root\services\adaptive-engine\index.ts"

$adaptive =
  Get-Content $AdaptivePath -Raw

$adaptive =
  $adaptive -replace `
    'const intervention =\s*createIntervention\(', `
    'const intervention =`r`n    await createIntervention('

Set-Content `
  $AdaptivePath `
  $adaptive `
  -Encoding UTF8

# ============================================================
# services/assessment/index.ts
# ============================================================

@'
import type {
  DiagnosticState,
  LearningEvidence,
  InterventionType,
} from "../../packages/domain";

import type {
  AssessmentResult,
  AssessmentSubmission,
} from "../../packages/contracts";

import {
  getIntervention,
} from "../intervention-store";

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

export async function evaluateAssessment(
  submission: AssessmentSubmission,
  expectedResponse: unknown,
  contentId?: string,
  metadata?: Record<string, string>,
): Promise<{
  result: AssessmentResult;
  evidence: LearningEvidence;
}> {
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

  let interventionType:
    InterventionType | undefined;

  if (
    submission.interventionId
  ) {
    const intervention =
      await getIntervention(
        submission.interventionId,
      );

    interventionType =
      intervention?.type;
  }

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
      "assessment-0.4",

    errorPattern:
      diagnosticRule?.errorPattern,

    diagnosticState:
      diagnosticRule?.diagnosticState,

    diagnosticConfidence:
      diagnosticRule?.diagnosticConfidence,

    interventionType,

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
# tests/intervention-persistence.test.ts
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
  createIntervention,
  getIntervention,
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

const learnerId =
  "learner-persistence-test";

const competencyId =
  "competency-persistence-001";

const sessionId =
  "session-persistence-001";

const intervention =
  await createIntervention({
    learnerId,
    competencyId,
    sessionId,
    decisionId:
      "decision-persistence-001",
    type: "teach",
  });

const retrieved =
  await getIntervention(
    intervention.interventionId,
  );

assert(
  Boolean(retrieved),
  "intervention must survive persistence round trip",
);

assert(
  retrieved?.interventionId ===
    intervention.interventionId,
  "persistent intervention identity must remain stable",
);

let learnerState =
  createInitialLearnerState(
    learnerId,
    competencyId,
  );

const submission = {
  learnerId,
  sessionId:
    `${sessionId}-response`,
  assessmentItemId:
    "item-persistence-001",
  competencyId,
  response:
    "correct-answer",
  interventionId:
    intervention.interventionId,
};

const assessment =
  await evaluateAssessment(
    submission,
    "correct-answer",
  );

assert(
  assessment.evidence.interventionId ===
    intervention.interventionId,
  "evidence must preserve intervention identity",
);

assert(
  assessment.evidence.interventionType ===
    "teach",
  "evidence must preserve intervention type",
);

await saveEvidence(
  assessment.evidence,
);

learnerState =
  applyEvidence(
    learnerState,
    assessment.evidence,
  );

const competency =
  learnerState.competencies[0];

assert(
  competency.interventionHistory.length ===
    1,
  "learner state must record the intervention",
);

assert(
  competency.interventionHistory[0]
    .interventionId ===
    intervention.interventionId,
  "learner state must link intervention identity",
);

assert(
  competency.interventionHistory[0]
    .evidenceIds.includes(
      assessment.evidence.id,
    ),
  "learner state must link intervention evidence",
);

const completed =
  await evaluateInterventionFromEvidence(
    intervention.interventionId,
    {
      id:
        assessment.evidence.id,
      outcome:
        assessment.evidence.outcome,
    },
  );

assert(
  completed.status ===
    "completed",
  "intervention must become completed",
);

assert(
  completed.outcome ===
    "effective",
  "correct evidence must produce effective outcome",
);

const persistedCompleted =
  await getIntervention(
    intervention.interventionId,
  );

assert(
  persistedCompleted?.status ===
    "completed",
  "completed intervention must persist",
);

assert(
  persistedCompleted?.outcome ===
    "effective",
  "completed intervention outcome must persist",
);

console.log({
  interventionPersistence:
    "PASS",

  interventionId:
    intervention.interventionId,

  learnerStateIntervention:
    competency
      .interventionHistory[0]
      .interventionId,

  outcome:
    persistedCompleted?.outcome,
});
'@ | Set-Content `
  "$Root\tests\intervention-persistence.test.ts" `
  -Encoding UTF8

Write-Host ""
Write-Host "Batch 3 installed."
Write-Host ""
Write-Host "Run:"
Write-Host "npx tsx --env-file=.env.local ./tests/intervention-persistence.test.ts"