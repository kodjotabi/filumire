$ErrorActionPreference = "Stop"

$Root = "C:\Users\tabi\Desktop\filumire\FILUMIRE_CORE"

Write-Host "FILUMIRE intervention lifecycle deployment"

New-Item -ItemType Directory -Force "$Root\services\intervention-store" | Out-Null
New-Item -ItemType Directory -Force "$Root\tests" | Out-Null

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

@'
import type {
  DecisionId,
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

const interventions =
  new Map<InterventionId, LearningIntervention>();

function now(): string {
  return new Date().toISOString();
}

export function createIntervention(input: {
  interventionId?: InterventionId;
  learnerId: LearnerId;
  competencyId: CompetencyId;
  sessionId: SessionId;
  decisionId: DecisionId;
  type: InterventionType;
  policyVersion?: string;
}): LearningIntervention {
  const timestamp = now();

  const intervention: LearningIntervention = {
    interventionId:
      input.interventionId ??
      `intervention-${crypto.randomUUID()}`,

    learnerId: input.learnerId,
    competencyId: input.competencyId,
    sessionId: input.sessionId,
    decisionId: input.decisionId,
    type: input.type,
    status: "active",
    startedAt: timestamp,
    outcome: "not_yet_evaluated",
    evidenceIds: [],
    policyVersion:
      input.policyVersion ?? "intervention-0.1",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  interventions.set(
    intervention.interventionId,
    intervention,
  );

  return intervention;
}

export function getIntervention(
  interventionId: InterventionId,
): LearningIntervention | undefined {
  return interventions.get(interventionId);
}

export function getLearnerInterventions(
  learnerId: LearnerId,
  competencyId?: CompetencyId,
): LearningIntervention[] {
  return Array.from(
    interventions.values(),
  ).filter(
    (intervention) =>
      intervention.learnerId === learnerId &&
      (
        competencyId === undefined ||
        intervention.competencyId === competencyId
      ),
  );
}

export function attachEvidenceToIntervention(
  interventionId: InterventionId,
  evidenceId: EvidenceId,
): LearningIntervention {
  const intervention =
    interventions.get(interventionId);

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

  intervention.updatedAt = now();

  interventions.set(
    interventionId,
    intervention,
  );

  return intervention;
}

export function completeIntervention(
  interventionId: InterventionId,
  outcome: InterventionOutcome,
): LearningIntervention {
  const intervention =
    interventions.get(interventionId);

  if (!intervention) {
    throw new Error(
      `Intervention not found: ${interventionId}`,
    );
  }

  const timestamp = now();

  intervention.status = "completed";
  intervention.completedAt = timestamp;
  intervention.outcome = outcome;
  intervention.updatedAt = timestamp;

  interventions.set(
    interventionId,
    intervention,
  );

  return intervention;
}

export function evaluateInterventionFromEvidence(
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
): LearningIntervention {
  attachEvidenceToIntervention(
    interventionId,
    evidence.id,
  );

  let outcome: InterventionOutcome =
    "not_yet_evaluated";

  if (evidence.outcome === "correct") {
    const intervention =
      getIntervention(interventionId);

    if (
      intervention?.type ===
      "retention_check"
    ) {
      outcome =
        "effective_with_retention";
    } else if (
      intervention?.type ===
      "transfer_check"
    ) {
      outcome =
        "effective_with_transfer";
    } else {
      outcome = "effective";
    }
  } else if (
    evidence.outcome === "partial"
  ) {
    outcome = "partial_recovery";
  } else if (
    evidence.outcome === "incorrect"
  ) {
    outcome = "ineffective";
  }

  return completeIntervention(
    interventionId,
    outcome,
  );
}

export function clearInterventionStore(): void {
  interventions.clear();
}
'@ | Set-Content "$Root\services\intervention-store\index.ts" -Encoding UTF8

@'
import {
  createIntervention,
  getIntervention,
  attachEvidenceToIntervention,
  evaluateInterventionFromEvidence,
  clearInterventionStore,
} from "../services/intervention-store";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

clearInterventionStore();

const intervention =
  createIntervention({
    learnerId:
      "learner-intervention-test",
    competencyId:
      "competency-intervention-001",
    sessionId:
      "session-intervention-001",
    decisionId:
      "decision-intervention-001",
    type: "teach",
  });

console.log({
  test: "intervention created",
  interventionId:
    intervention.interventionId,
  status: intervention.status,
  outcome: intervention.outcome,
});

assert(
  intervention.status === "active",
  "new intervention must be active",
);

assert(
  intervention.outcome ===
    "not_yet_evaluated",
  "new intervention must not claim effectiveness",
);

attachEvidenceToIntervention(
  intervention.interventionId,
  "evidence-intervention-001",
);

const completed =
  evaluateInterventionFromEvidence(
    intervention.interventionId,
    {
      id: "evidence-intervention-002",
      outcome: "correct",
    },
  );

console.log({
  test: "intervention evaluated",
  status: completed.status,
  outcome: completed.outcome,
  evidenceIds:
    completed.evidenceIds,
});

assert(
  completed.status === "completed",
  "evaluated intervention must be completed",
);

assert(
  completed.outcome === "effective",
  "correct evidence must produce effective intervention outcome",
);

assert(
  completed.evidenceIds.length === 2,
  "all linked evidence must remain attached",
);

const persisted =
  getIntervention(
    intervention.interventionId,
  );

assert(
  Boolean(persisted),
  "intervention must remain retrievable",
);

assert(
  persisted?.outcome === "effective",
  "retrieved intervention must preserve outcome",
);

console.log({
  interventionLifecycleTest: "PASS",
});
'@ | Set-Content "$Root\tests\intervention-lifecycle.test.ts" -Encoding UTF8

$PackagePath = "$Root\package.json"

$Package = Get-Content `
  $PackagePath `
  -Raw |
  ConvertFrom-Json

if (-not $Package.scripts."test:intervention") {
  $Package.scripts |
    Add-Member `
      -MemberType NoteProperty `
      -Name "test:intervention" `
      -Value "tsx --env-file=.env.local ./tests/intervention-lifecycle.test.ts"
}

$Package |
  ConvertTo-Json -Depth 20 |
  Set-Content `
    $PackagePath `
    -Encoding UTF8

Write-Host ""
Write-Host "FILUMIRE intervention lifecycle foundation installed."
Write-Host ""
Write-Host "Run:"
Write-Host "npm run test:intervention"