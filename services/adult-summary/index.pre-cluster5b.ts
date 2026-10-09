import type {
  DiagnosticState,
  InterventionType,
} from "../../packages/domain";

import {
  GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
  VALIDATION_INITIAL_COMPETENCY_ID,
  getCompetency,
  getSubject,
} from "../../packages/curriculum";

import { getLearnerState } from "../learner-state-store";
import { getEvidence } from "../evidence-store";
import { getLearnerInterventions } from "../intervention-store";
import { getLearnerLearningContext } from "../learner-context";

/*
 * Backward-compatibility fallback only: learners whose state
 * was seeded directly (bypassing the learning API, e.g. in
 * tests or pre-existing data) never had a learning context
 * established. Real production learners are discovered via
 * their actual persisted learning context below.
 */
const LEGACY_CANDIDATE_COMPETENCY_IDS = [
  GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
  VALIDATION_INITIAL_COMPETENCY_ID,
];

const DIAGNOSTIC_SUPPORT_MESSAGES: Partial<
  Record<DiagnosticState, string>
> = {
  prerequisite_gap:
    "Needs review of an earlier skill first.",
  conceptual_misunderstanding:
    "Needs help understanding the main idea.",
  procedural_error:
    "Needs support with the steps of the method.",
  misconception:
    "Has a specific misunderstanding to correct.",
  forgotten_knowledge:
    "Needs a refresher on this topic.",
  transfer_failure:
    "Needs help applying this in new situations.",
  persistent_difficulty:
    "Needs continued extra support.",
};

const INTERVENTION_FOCUS_MESSAGES: Record<
  InterventionType,
  string
> = {
  diagnose:
    "Finding out what the learner already knows.",
  teach:
    "Learning the topic together.",
  practice:
    "Practising the skill.",
  scaffold:
    "Working through it step by step.",
  remediate:
    "Reviewing the idea another way.",
  reassess:
    "Checking understanding again.",
  retention_check:
    "Checking what the learner still remembers.",
  transfer_check:
    "Checking if the learner can use the skill in a new way.",
  teacher_review:
    "Ready for a teacher or parent to review.",
};

function friendlyRetentionStatus(
  status?: string,
): string | undefined {
  switch (status) {
    case "retained":
      return "Remembering this well.";

    case "not_retained":
      return "Needs more practice to remember this.";

    case "pending":
      return "Being checked for how well it is remembered.";

    default:
      return undefined;
  }
}

function friendlyTransferStatus(
  status?: string,
): string | undefined {
  switch (status) {
    case "demonstrated":
      return "Can use this in new situations.";

    case "not_demonstrated":
      return "Still needs practice using this in new situations.";

    case "pending":
      return "Being checked for use in new situations.";

    default:
      return undefined;
  }
}

export interface AdultActivityEntry {
  outcome: string;
  occurredAt: string;
}

export interface AdultLearnerSummary {
  hasActivity: boolean;
  subjectName?: string;
  competencyTitle?: string;
  masteryPercent: number;
  confidencePercent: number;
  evidenceCount: number;
  readyForAdvancement: boolean;
  retentionStatus?: string;
  transferStatus?: string;
  needsSupport?: string;
  nextFocus?: string;
  recentActivity: AdultActivityEntry[];
}

function emptySummary(): AdultLearnerSummary {
  return {
    hasActivity: false,
    masteryPercent: 0,
    confidencePercent: 0,
    evidenceCount: 0,
    readyForAdvancement: false,
    recentActivity: [],
  };
}

/*
 * Builds a read-only, learner-friendly supervision
 * summary from already-trusted, already-persisted
 * learner state. This never computes a new adaptive
 * decision and never creates evidence/interventions.
 */
export async function buildAdultLearnerSummary(
  learnerId: string,
): Promise<AdultLearnerSummary> {
  let learnerState;

  const context = await getLearnerLearningContext(
    learnerId,
  );

  if (context?.activeCompetencyId) {
    learnerState = await getLearnerState(
      learnerId,
      context.activeCompetencyId,
    );
  }

  if (!learnerState) {
    for (const candidateId of LEGACY_CANDIDATE_COMPETENCY_IDS) {
      learnerState = await getLearnerState(
        learnerId,
        candidateId,
      );

      if (learnerState) {
        break;
      }
    }
  }

  if (
    !learnerState ||
    learnerState.competencies.length === 0
  ) {
    return emptySummary();
  }

  const activeCompetency =
    learnerState.competencies[0];

  const competencyDefinition = getCompetency(
    activeCompetency.competencyId,
  );

  const subject = competencyDefinition
    ? getSubject(competencyDefinition.subjectId)
    : undefined;

  const [evidence, interventions] = await Promise.all([
    getEvidence(
      learnerId,
      activeCompetency.competencyId,
    ),
    getLearnerInterventions(
      learnerId,
      activeCompetency.competencyId,
    ),
  ]);

  const recentActivity = evidence
    .slice()
    .sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    )
    .slice(-5)
    .reverse()
    .map((item) => ({
      outcome: item.outcome,
      occurredAt: item.timestamp,
    }));

  const latestIntervention = interventions
    .slice()
    .sort((a, b) =>
      a.startedAt.localeCompare(b.startedAt),
    )
    .at(-1);

  return {
    hasActivity: true,
    subjectName: subject?.name,
    competencyTitle: competencyDefinition?.title,
    masteryPercent: Math.round(
      activeCompetency.masteryEstimate * 100,
    ),
    confidencePercent: Math.round(
      activeCompetency.confidence * 100,
    ),
    evidenceCount: activeCompetency.evidenceCount,
    readyForAdvancement:
      activeCompetency.readinessState
        ?.readyForAdvancement ?? false,
    retentionStatus: friendlyRetentionStatus(
      activeCompetency.retentionState?.status,
    ),
    transferStatus: friendlyTransferStatus(
      activeCompetency.transferState?.status,
    ),
    needsSupport:
      DIAGNOSTIC_SUPPORT_MESSAGES[
        activeCompetency.diagnosticState
      ],
    nextFocus: latestIntervention
      ? INTERVENTION_FOCUS_MESSAGES[
          latestIntervention.type
        ]
      : undefined,
    recentActivity,
  };
}
