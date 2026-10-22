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
import {
  buildLearnerProgress,
  type LearnerProgress,
} from "../learner-progress";

import { SUMMARY_MESSAGES, type SummaryLanguage, type SummaryMessages } from "./messages";

export const PARENT_HOME_EXPERIENCE_VERSION =
  "parent-home-v1";

const LEGACY_CANDIDATE_COMPETENCY_IDS = [
  GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
  VALIDATION_INITIAL_COMPETENCY_ID,
];

export type ParentAlertLevel =
  | "attention"
  | "positive"
  | "information";

export type ParentAlertType =
  | "support_needed"
  | "retention_support"
  | "transfer_support"
  | "ready_to_advance"
  | "teacher_review"
  | "learning_active";

export interface ParentAlert {
  id: string;
  type: ParentAlertType;
  level: ParentAlertLevel;
  title: string;
  message: string;
}

export interface HomeSupportGuidance {
  id: string;
  title: string;
  guidance: string;
  boundary: string;
}

export interface AdultActivityEntry {
  outcome: string;
  occurredAt: string;
}

export interface AdultLearnerSummary {
  hasActivity: boolean;
  subjectName?: string;
  competencyTitle?: string;
  /*
   * FILUMIRE's current estimate for the one competency being
   * learned now. It is not overall progress: see progress below.
   */
  masteryPercent: number;
  confidencePercent: number;
  evidenceCount: number;
  readyForAdvancement: boolean;
  retentionStatus?: string;
  transferStatus?: string;
  needsSupport?: string;
  nextFocus?: string;
  recentActivity: AdultActivityEntry[];

  parentExperienceVersion?: string;
  strengths?: string[];
  supportAreas?: string[];
  homeSupport?: HomeSupportGuidance[];
  alerts?: ParentAlert[];

  /*
   * Activity, mastery and curriculum progress across the learner's
   * class, kept separate. Absent until the learner has a class.
   */
  progress?: LearnerProgress;
}

function friendlyRetentionStatus(
  messages: SummaryMessages,
  status?: string,
): string | undefined {
  switch (status) {
    case "retained":
      return messages.retention.retained;

    case "not_retained":
      return messages.retention.not_retained;

    case "pending":
      return messages.retention.pending;

    default:
      return undefined;
  }
}

function friendlyTransferStatus(
  messages: SummaryMessages,
  status?: string,
): string | undefined {
  switch (status) {
    case "demonstrated":
      return messages.transfer.demonstrated;

    case "not_demonstrated":
      return messages.transfer.not_demonstrated;

    case "pending":
      return messages.transfer.pending;

    default:
      return undefined;
  }
}

function emptySummary(): AdultLearnerSummary {
  return {
    hasActivity: false,
    masteryPercent: 0,
    confidencePercent: 0,
    evidenceCount: 0,
    readyForAdvancement: false,
    recentActivity: [],
    parentExperienceVersion:
      PARENT_HOME_EXPERIENCE_VERSION,
    strengths: [],
    supportAreas: [],
    homeSupport: [],
    alerts: [],
  };
}

function buildHomeSupport(
  messages: SummaryMessages,
  input: {
    diagnosticState: DiagnosticState;
    retentionStatus?: string;
    transferStatus?: string;
    competencyTitle?: string;
  },
): HomeSupportGuidance[] {
  const guidance: HomeSupportGuidance[] = [];

  const topic =
    input.competencyTitle ? messages.quote(input.competencyTitle) : messages.topicFallback;

  switch (input.diagnosticState) {
    case "prerequisite_gap":
      guidance.push({
        id: "review-earlier-learning",
        ...messages.home.reviewEarlier(topic),
      });
      break;

    case "conceptual_misunderstanding":
    case "misconception":
      guidance.push({
        id: "explain-in-own-words",
        ...messages.home.explainOwnWords(topic),
      });
      break;

    case "procedural_error":
      guidance.push({
        id: "talk-through-steps",
        ...messages.home.talkThroughSteps,
      });
      break;

    case "forgotten_knowledge":
      guidance.push({
        id: "short-refresh",
        ...messages.home.shortRefresh(topic),
      });
      break;

    case "transfer_failure":
      guidance.push({
        id: "everyday-example",
        ...messages.home.everydayExample(topic),
      });
      break;

    case "persistent_difficulty":
      guidance.push({
        id: "encourage-small-step",
        ...messages.home.keepSupportLight,
      });
      break;

    default:
      guidance.push({
        id: "ask-what-learned",
        ...messages.home.askWhatLearned(topic),
      });
      break;
  }

  if (input.retentionStatus === "not_retained") {
    guidance.push({
      id: "retention-revisit",
      ...messages.home.retentionRevisit,
    });
  }

  if (input.transferStatus === "not_demonstrated") {
    guidance.push({
      id: "transfer-example",
      ...messages.home.transferExample,
    });
  }

  return guidance.slice(0, 3);
}

function buildAlerts(
  messages: SummaryMessages,
  input: {
    diagnosticState: DiagnosticState;
    readyForAdvancement: boolean;
    retentionStatus?: string;
    transferStatus?: string;
    latestInterventionType?: InterventionType;
    supportMessage?: string;
  },
): ParentAlert[] {
  const alerts: ParentAlert[] = [];

  if (input.readyForAdvancement) {
    alerts.push({
      id: "ready-to-advance",
      type: "ready_to_advance",
      level: "positive",
      ...messages.alerts.ready,
    });
  }

  if (input.retentionStatus === "not_retained") {
    alerts.push({
      id: "retention-support",
      type: "retention_support",
      level: "attention",
      ...messages.alerts.retention,
    });
  }

  if (input.transferStatus === "not_demonstrated") {
    alerts.push({
      id: "transfer-support",
      type: "transfer_support",
      level: "attention",
      ...messages.alerts.transfer,
    });
  }

  if (
    input.supportMessage &&
    !input.readyForAdvancement
  ) {
    alerts.push({
      id: "learning-support",
      type: "support_needed",
      level: "attention",
      title: messages.alerts.support.title,
      message: input.supportMessage,
    });
  }

  if (
    input.latestInterventionType ===
    "teacher_review"
  ) {
    alerts.push({
      id: "teacher-review",
      type: "teacher_review",
      level: "information",
      ...messages.alerts.teacherReview,
    });
  }

  return alerts.slice(0, 3);
}

/*
 * Parent-facing read-only projection of trusted learner
 * state. It translates internal learning intelligence
 * into plain-language supervision information.
 *
 * It never creates evidence, changes learner state,
 * computes mastery, or overrides adaptive policy.
 */
export async function buildAdultLearnerSummary(
  learnerId: string,
  language: SummaryLanguage = "en",
): Promise<AdultLearnerSummary> {
  const messages = SUMMARY_MESSAGES[language];
  let learnerState;

  const context =
    await getLearnerLearningContext(learnerId);

  const progress = context
    ? await buildLearnerProgress(learnerId, context)
    : undefined;

  if (context?.activeCompetencyId) {
    learnerState = await getLearnerState(
      learnerId,
      context.activeCompetencyId,
    );
  }

  if (!learnerState) {
    for (
      const candidateId of
      LEGACY_CANDIDATE_COMPETENCY_IDS
    ) {
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
    return { ...emptySummary(), progress };
  }

  const activeCompetency =
    learnerState.competencies[0];

  const competencyDefinition = getCompetency(
    activeCompetency.competencyId,
  );

  const subject = competencyDefinition
    ? getSubject(competencyDefinition.subjectId)
    : undefined;

  const [evidence, interventions] =
    await Promise.all([
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

  const retentionStatus =
    activeCompetency.retentionState?.status;

  const transferStatus =
    activeCompetency.transferState?.status;

  const supportMessage =
    messages.diagnosticSupport[
      activeCompetency.diagnosticState
    ];

  const strengths: string[] = [];

  if (activeCompetency.readinessState?.readyForAdvancement) {
    strengths.push(
      messages.strengths.ready,
    );
  }

  if (retentionStatus === "retained") {
    strengths.push(
      messages.strengths.retained,
    );
  }

  if (transferStatus === "demonstrated") {
    strengths.push(
      messages.strengths.transferred,
    );
  }

  const supportAreas = [
    supportMessage,
    retentionStatus === "not_retained"
      ? messages.supportAreas.retention
      : undefined,
    transferStatus === "not_demonstrated"
      ? messages.supportAreas.transfer
      : undefined,
  ].filter(
    (value): value is string => Boolean(value),
  );

  return {
    hasActivity: true,
    subjectName: subject?.name,
    competencyTitle:
      competencyDefinition?.title,
    masteryPercent: Math.round(
      activeCompetency.masteryEstimate * 100,
    ),
    confidencePercent: Math.round(
      activeCompetency.confidence * 100,
    ),
    evidenceCount:
      activeCompetency.evidenceCount,
    readyForAdvancement:
      activeCompetency.readinessState
        ?.readyForAdvancement ?? false,
    retentionStatus:
      friendlyRetentionStatus(
        messages,
        retentionStatus,
      ),
    transferStatus:
      friendlyTransferStatus(
        messages,
        transferStatus,
      ),
    needsSupport: supportMessage,
    nextFocus: latestIntervention
      ? messages.interventionFocus[
          latestIntervention.type
        ]
      : undefined,
    recentActivity,

    parentExperienceVersion:
      PARENT_HOME_EXPERIENCE_VERSION,
    strengths,
    supportAreas,
    homeSupport: buildHomeSupport(messages, {
      diagnosticState:
        activeCompetency.diagnosticState,
      retentionStatus,
      transferStatus,
      competencyTitle:
        competencyDefinition?.title,
    }),
    alerts: buildAlerts(messages, {
      diagnosticState:
        activeCompetency.diagnosticState,
      readyForAdvancement:
        activeCompetency.readinessState
          ?.readyForAdvancement ?? false,
      retentionStatus,
      transferStatus,
      latestInterventionType:
        latestIntervention?.type,
      supportMessage,
    }),
    progress,
  };
}

