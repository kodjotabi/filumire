import {
  getCompetency,
  getSubject,
} from "../../packages/curriculum";
import type {
  DiagnosticState,
  LearnerCompetencyState,
} from "../../packages/domain";
import { getLearnerStates } from "../learner-state-store";
import { seedContent } from '../content-store/seed';
import type { PendingTeacherReviewRecord } from "../persistence";
import { getEvidenceForLearner } from "../evidence-store";
import {
  getPendingTeacherReviews,
} from "../teacher-review";
import {
  isCompetencyCompleted,
  isContentExhausted,
  mergeCompetencyStates,
  needsSupportRetryDueAt,
} from "../learner-path/progression";
import { supportsSpacedRevision } from "../learner-path/revision";
import {
  computeMasteryPilotMeasures,
  type MasteryPilotMeasures,
} from "../pilot-measures";

export type TeacherAttentionPriority = "critical" | "high" | "medium";

export type TeacherAttentionReason =
  | "prerequisite_gap"
  | "misconception"
  | "persistent_difficulty"
  | "low_confidence"
  | "retention_failure"
  | "transfer_failure"
  /* Tranche 4C: the learner ran out of questions without mastering it. */
  | "content_exhausted_needs_support"
  /* Tranche 4G: sent back to learn a missing prerequisite, not done yet. */
  | "prerequisite_repair_in_progress";

export interface TeacherEvidenceSummary {
  id: string;
  competencyId: string;
  source: string;
  outcome: string;
  timestamp: string;
  purpose?: string;
  independence?: string;
  supportLevel?: number;
  difficulty?: string;
  representation?: string;
  strength?: string;
  errorClass?: string;
  errorPattern?: string;
  prerequisiteCompetencyId?: string;
  misconceptionId?: string;
  exposureCount?: number;
  evaluatorType?: string;
  evaluatorId?: string;
  evaluationPolicyVersion?: string;
  interpretationVersion?: string;
  instructionalStrategy?: string;
  responseMode?: string;
  interventionType?: string;
  interventionId?: string;
}
export interface TeacherDiagnosisExplanation {
  diagnosticState: DiagnosticState;
  confidence: number;
  history: {
    diagnosticState: DiagnosticState;
    evidenceCount: number;
    lastEvidenceAt: string;
    confidence: number;
    errorPatterns: string[];
  }[];
  supportingEvidenceIds: string[];
  prerequisiteCompetencyIds: string[];
  misconceptionIds: string[];
  errorPatterns: string[];
}

export interface TeacherAdaptiveExplanation {
  instructionalStrategy?: string;
  responseMode?: string;
  confidence: number;
  diagnosticState: DiagnosticState;
  readyForAdvancement: boolean;
  relevantEvidenceIds: string[];
}

export interface TeacherInterventionHistoryItem {
  interventionId: string;
  type: string;
  instructionalStrategy?: string;
  startedAt: string;
  completedAt?: string;
  outcome?: string;
  evidenceIds: string[];
}

export interface TeacherProgressHistoryItem {
  evidenceId: string;
  timestamp: string;
  outcome: string;
  purpose?: string;
  independence?: string;
  difficulty?: string;
  strength?: string;
  diagnosticState?: DiagnosticState;
  diagnosticConfidence?: number;
  interventionType?: string;
  interventionId?: string;
}
export interface TeacherCompetencySummary {
  competencyId: string;
  competencyTitle: string;
  subjectId: string;
  subjectName: string;
  masteryEstimate: number;
  confidence: number;
  evidenceCount: number;
  evidence: TeacherEvidenceSummary[];
  progressHistory: TeacherProgressHistoryItem[];
  diagnosticState: DiagnosticState;
  diagnosticConfidence: number;
  diagnosisExplanation: TeacherDiagnosisExplanation;
  adaptiveExplanation: TeacherAdaptiveExplanation;
  interventionHistory: TeacherInterventionHistoryItem[];
  errorPatterns: string[];
  readyForAdvancement: boolean;
  retentionStatus?: string;
  transferStatus?: string;
  lastUpdated: string;
  attentionReasons: TeacherAttentionReason[];
  attentionPriority?: TeacherAttentionPriority;
  /* Set when content ran out: when it happened and when FILUMIRE retries it. */
  needsSupportSince?: string;
  needsSupportRetryAt?: string;
  /* Tranche 4G: the prerequisite the learner was sent to learn first. */
  prerequisiteRepair?: {
    competencyId: string;
    competencyTitle: string;
    startedAt: string;
    completed: boolean;
  };
}

export interface TeacherSubjectSummary {
  subjectId: string;
  subjectName: string;
  competencyCount: number;
  competenciesNeedingAttention: number;
  averageMastery: number;
  averageConfidence: number;
  competencies: TeacherCompetencySummary[];
}

export interface TeacherLearnerSummary {
  learnerId: string;
  subjects: TeacherSubjectSummary[];
  attentionQueue: TeacherCompetencySummary[];
  pendingReviews: PendingTeacherReviewRecord[];
  pendingReviewCount: number;
  updatedAt?: string;
  /*
   * Tranche 4D: the Option B mastery pilot measures for this learner
   * (false mastery, retention/transfer after mastery, stuck rate, ...).
   */
  masteryMeasures: MasteryPilotMeasures;
}

function getAttentionReasons(
  state: LearnerCompetencyState,
  repairCompleted?: boolean,
): TeacherAttentionReason[] {
  const reasons: TeacherAttentionReason[] = [];

  if (state.prerequisiteRepair && repairCompleted === false) {
    reasons.push("prerequisite_repair_in_progress");
  }

  if (state.diagnosticState === "prerequisite_gap") {
    reasons.push("prerequisite_gap");
  }

  if (state.diagnosticState === "misconception") {
    reasons.push("misconception");
  }

  if (state.diagnosticState === "persistent_difficulty") {
    reasons.push("persistent_difficulty");
  }

  if (state.confidence < 0.6 && state.evidenceCount > 0) {
    reasons.push("low_confidence");
  }

  if (state.retentionState?.status === "not_retained") {
    reasons.push("retention_failure");
  }

  if (state.transferState?.status === "not_demonstrated") {
    reasons.push("transfer_failure");
  }

  if (isContentExhausted(state)) {
    reasons.push("content_exhausted_needs_support");
  }

  return reasons;
}

function getAttentionPriority(
  reasons: TeacherAttentionReason[],
): TeacherAttentionPriority | undefined {
  if (
    reasons.includes("retention_failure") ||
    reasons.includes("prerequisite_gap")
  ) {
    return "critical";
  }

  if (
    reasons.includes("misconception") ||
    reasons.includes("persistent_difficulty") ||
    reasons.includes("content_exhausted_needs_support")
  ) {
    return "high";
  }

  if (
    reasons.includes("transfer_failure") ||
    reasons.includes("low_confidence") ||
    reasons.includes("prerequisite_repair_in_progress")
  ) {
    return "medium";
  }

  return undefined;
}

const ATTENTION_PRIORITY_WEIGHT: Record<
  TeacherAttentionPriority,
  number
> = {
  critical: 3,
  high: 2,
  medium: 1,
};
export async function buildTeacherLearnerSummary(
  learnerId: string,
): Promise<TeacherLearnerSummary> {
  seedContent();
  const [learnerStates, pendingReviews] =
    await Promise.all([
      getLearnerStates(learnerId),
      getPendingTeacherReviews(learnerId),
    ]);

  const competencyMap =
    new Map<string, TeacherCompetencySummary>();

  const learnerEvidence =
    await getEvidenceForLearner(learnerId);

  /* Tranche 4G: whole-learner view, to tell whether a repair is done. */
  const allStates = new Map(
    mergeCompetencyStates(
      ...learnerStates.map((state) => state.competencies),
    ).map((state) => [state.competencyId, state]),
  );

  const repairOf = (state: LearnerCompetencyState) =>
    state.prerequisiteRepair
      ? {
          competencyId: state.prerequisiteRepair.repairCompetencyId,
          competencyTitle:
            getCompetency(state.prerequisiteRepair.repairCompetencyId)
              ?.title ?? state.prerequisiteRepair.repairCompetencyId,
          startedAt: state.prerequisiteRepair.startedAt,
          // Same completion rule the engine used to send the learner there.
          completed: isCompetencyCompleted(
            allStates.get(state.prerequisiteRepair.repairCompetencyId),
            supportsSpacedRevision(state.prerequisiteRepair.repairCompetencyId),
          ),
        }
      : undefined;

  let updatedAt: string | undefined;

  for (const learnerState of learnerStates) {
    if (
      !updatedAt ||
      learnerState.updatedAt > updatedAt
    ) {
      updatedAt = learnerState.updatedAt;
    }

    for (const state of learnerState.competencies) {
      const competency = getCompetency(state.competencyId);

      if (!competency) {
        continue;
      }

      const subject = getSubject(competency.subjectId);

      if (!subject) {
        continue;
      }

      const evidenceHistory =
        learnerEvidence.filter(
          (item) =>
            item.competencyId === state.competencyId,
        );

      const evidence: TeacherEvidenceSummary[] =
        evidenceHistory
          .map((item) => ({
            id: item.id,
            competencyId: item.competencyId,
            source: item.source,
            outcome: item.outcome,
            timestamp: item.timestamp,
            purpose: item.purpose,
            independence: item.independence,
            supportLevel: item.supportLevel,
            difficulty: item.difficulty,
            representation: item.representation,
            strength: item.strength,
            errorClass: item.errorClass,
            errorPattern: item.errorPattern,
            prerequisiteCompetencyId:
              item.prerequisiteCompetencyId,
            misconceptionId: item.misconceptionId,
            exposureCount: item.exposureCount,
            evaluatorType: item.evaluatorType,
            evaluatorId: item.evaluatorId,
            evaluationPolicyVersion:
              item.evaluationPolicyVersion,
            interpretationVersion:
              item.interpretationVersion,
            instructionalStrategy:
              item.instructionalStrategy,
            responseMode: item.responseMode,
            interventionType: item.interventionType,
            interventionId: item.interventionId,
          }))
          .sort((a, b) =>
            b.timestamp.localeCompare(a.timestamp),
          );

      competencyMap.set(state.competencyId, {
        competencyId: state.competencyId,
        competencyTitle: competency.title,
        subjectId: competency.subjectId,
        subjectName: subject.name,
        masteryEstimate: state.masteryEstimate,
        confidence: state.confidence,
        evidenceCount: state.evidenceCount,
        evidence,
        progressHistory: evidenceHistory
          .map((item) => ({
            evidenceId: item.id,
            timestamp: item.timestamp,
            outcome: item.outcome,
            purpose: item.purpose,
            independence: item.independence,
            difficulty: item.difficulty,
            strength: item.strength,
            diagnosticState: item.diagnosticState,
            diagnosticConfidence:
              item.diagnosticConfidence,
            interventionType: item.interventionType,
            interventionId: item.interventionId,
          }))
          .sort((a, b) =>
            a.timestamp.localeCompare(b.timestamp),
          ),
        diagnosticState: state.diagnosticState,
        diagnosticConfidence: state.diagnosticConfidence,
        diagnosisExplanation: {
          diagnosticState: state.diagnosticState,
          confidence: state.diagnosticConfidence,
          history: (state.diagnosticHistory ?? []).map(
            (item) => ({
              diagnosticState: item.diagnosticState,
              evidenceCount: item.evidenceCount,
              lastEvidenceAt: item.lastEvidenceAt,
              confidence: item.confidence,
              errorPatterns: [...item.errorPatterns],
            }),
          ),
          supportingEvidenceIds: evidenceHistory
            .filter(
              (item) =>
                item.diagnosticState === state.diagnosticState ||
                item.errorClass === state.diagnosticState ||
                Boolean(item.errorPattern),
            )
            .map((item) => item.id),
          prerequisiteCompetencyIds: [
            ...new Set(
              evidenceHistory
                .map((item) => item.prerequisiteCompetencyId)
                .filter((id): id is string => Boolean(id)),
            ),
          ],
          misconceptionIds: [
            ...new Set(
              evidenceHistory
                .map((item) => item.misconceptionId)
                .filter((id): id is string => Boolean(id)),
            ),
          ],
          errorPatterns: [...state.errorPatterns],
        },
        errorPatterns: [...state.errorPatterns],
        interventionHistory: state.interventionHistory
          .map((item) => ({
            interventionId: item.interventionId,
            type: item.type,
            instructionalStrategy: item.instructionalStrategy,
            startedAt: item.startedAt,
            completedAt: item.completedAt,
            outcome: item.outcome,
            evidenceIds: [...item.evidenceIds],
          }))
          .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
        adaptiveExplanation: {
          instructionalStrategy:
            state.currentInstructionalStrategy,
          responseMode: state.currentResponseMode,
          confidence: state.confidence,
          diagnosticState: state.diagnosticState,
          readyForAdvancement:
            state.readinessState?.readyForAdvancement ?? false,
          relevantEvidenceIds: evidenceHistory.map(
            (item) => item.id,
          ),
        },
        readyForAdvancement:
          state.readinessState?.readyForAdvancement ?? false,
        retentionStatus: state.retentionState?.status,
        transferStatus: state.transferState?.status,
        lastUpdated: state.lastUpdated,
        attentionReasons: getAttentionReasons(
          state,
          repairOf(state)?.completed,
        ),
        attentionPriority: getAttentionPriority(
          getAttentionReasons(state, repairOf(state)?.completed),
        ),
        prerequisiteRepair: repairOf(state),
        needsSupportSince: isContentExhausted(state)
          ? state.readinessState?.evaluatedAt
          : undefined,
        needsSupportRetryAt: needsSupportRetryDueAt(state),
      });
    }
  }

  const subjectMap =
    new Map<string, TeacherCompetencySummary[]>();

  for (const competency of competencyMap.values()) {
    const existing =
      subjectMap.get(competency.subjectId) ?? [];

    existing.push(competency);
    subjectMap.set(competency.subjectId, existing);
  }

  const subjects: TeacherSubjectSummary[] =
    [...subjectMap.entries()]
      .map(([subjectId, competencies]) => {
        const masteryTotal = competencies.reduce(
          (total, competency) =>
            total + competency.masteryEstimate,
          0,
        );

        const confidenceTotal = competencies.reduce(
          (total, competency) =>
            total + competency.confidence,
          0,
        );

        return {
          subjectId,
          subjectName: competencies[0].subjectName,
          competencyCount: competencies.length,
          competenciesNeedingAttention:
            competencies.filter(
              (competency) =>
                competency.attentionReasons.length > 0,
            ).length,
          averageMastery:
            competencies.length > 0
              ? masteryTotal / competencies.length
              : 0,
          averageConfidence:
            competencies.length > 0
              ? confidenceTotal / competencies.length
              : 0,
          competencies: competencies.sort(
            (a, b) =>
              b.lastUpdated.localeCompare(a.lastUpdated),
          ),
        };
      })
      .sort((a, b) =>
        a.subjectName.localeCompare(b.subjectName),
      );

  const attentionQueue =
    [...competencyMap.values()]
      .filter(
        (competency) =>
          competency.attentionReasons.length > 0,
      )
      .sort((a, b) => {
        const priorityDifference =
          ATTENTION_PRIORITY_WEIGHT[
            b.attentionPriority ?? "medium"
          ] -
          ATTENTION_PRIORITY_WEIGHT[
            a.attentionPriority ?? "medium"
          ];

        return priorityDifference !== 0
          ? priorityDifference
          : b.lastUpdated.localeCompare(a.lastUpdated);
      });

  const masteryMeasures = computeMasteryPilotMeasures({
    records: mergeCompetencyStates(
      ...learnerStates.map((state) => state.competencies),
    ).map((state) => ({ learnerId, state })),
    evidence: learnerEvidence,
  });

  return {
    learnerId,
    subjects,
    attentionQueue,
    pendingReviews,
    pendingReviewCount: pendingReviews.length,
    updatedAt,
    masteryMeasures,
  };
}



















